"""
Turn the LLM's free-text location into parameters a provider will honour.

The model is asked for an ISO 3166-1 alpha-2 code directly, because mapping
"Nairobi" to a country needs world knowledge that a local table does not have.
Everything it returns is then checked against the real ISO list, so a plausible
invention becomes a detected fallback rather than a silently wrong search.
"""

from dataclasses import dataclass

import pycountry

# Codes JSearch documents as supported. A country outside this list is still a
# valid ISO code, so the local search is skipped rather than sent upstream to be
# silently ignored.
JSEARCH_COUNTRIES = frozenset({
    "dz", "ao", "ar", "at", "au", "be", "br", "ca", "ch", "cl", "co", "de",
    "dk", "eg", "es", "fi", "fr", "gb", "gh", "gr", "hk", "hu", "id", "ie",
    "il", "in", "iq", "it", "jp", "ke", "kr", "kw", "lk", "ma", "mx", "my",
    "ng", "nl", "no", "nz", "om", "pa", "pe", "ph", "pk", "pl", "pt", "qa",
    "ro", "ru", "sa", "se", "sg", "so", "th", "tn", "tr", "tw", "ua", "ae",
    "uk", "us", "ve", "vn", "za",
})

# Values that name a working arrangement rather than a place.
REMOTE_WORDS = frozenset({
    "remote", "anywhere", "worldwide", "global", "flexible", "work from home",
    "wfh", "distributed", "remote-first", "fully remote",
})


@dataclass(frozen=True)
class ResolvedLocation:
    country_code: str | None = None   # validated ISO 3166-1 alpha-2, lowercase
    country_name: str | None = None   # official name, for provider query text
    city: str | None = None
    remote_only: bool = False
    source: str = "unknown"           # llm | recovered | none
    warning: str | None = None

    @property
    def known(self) -> bool:
        return self.country_code is not None

    def place_phrase(self) -> str | None:
        """What to put in a provider's free-text query.

        JSearch returns almost nothing for "engineer in ke" and a full page for
        "engineer in Kenya" — the code belongs in the country parameter, never in
        the query text.
        """
        if self.city and self.country_name:
            return f"{self.city}, {self.country_name}"
        return self.city or self.country_name


def _clean(value: str | None) -> str:
    return " ".join((value or "").split()).strip()


def _looks_remote(text: str) -> bool:
    lowered = text.lower()
    return any(word in lowered for word in REMOTE_WORDS)


def _normalise_gb(code: str) -> str:
    return "gb" if code == "uk" else code


def _validate_code(code: str | None) -> str | None:
    """An alpha-2 code the ISO standard actually contains."""
    code = _clean(code).lower()
    if len(code) != 2:
        return None
    # The UK trades as 'uk' at several providers; ISO calls it GB.
    lookup = "gb" if code == "uk" else code
    return code if pycountry.countries.get(alpha_2=lookup.upper()) else None


def _country_name(code: str) -> str | None:
    entry = pycountry.countries.get(alpha_2=("GB" if code == "uk" else code).upper())
    if entry is None:
        return None
    return getattr(entry, "common_name", None) or entry.name


def _country_in_text(text: str) -> str | None:
    """
    The country actually named in a free-text location, if any.

    Tried on the whole string and then on each comma-separated part, last part
    first, because "Nairobi, Kenya" puts the country at the end. A fuzzy match
    counts only when the matched country's name really occurs in the text —
    search_fuzzy will otherwise return a confident answer for anything.
    """
    text = _clean(text)
    if not text:
        return None

    parts = [text] + [p.strip() for p in reversed(text.split(",")) if p.strip()]
    for part in parts:
        entry = pycountry.countries.get(name=part) or pycountry.countries.get(alpha_2=part.upper()) \
            if len(part) <= 56 else None
        if entry:
            return entry.alpha_2.lower()

    lowered = text.lower()
    for part in parts:
        try:
            matches = pycountry.countries.search_fuzzy(part)
        except LookupError:
            continue
        for match in matches:
            names = {match.name.lower(), getattr(match, "common_name", "").lower(),
                     getattr(match, "official_name", "").lower()}
            if any(name and name in lowered for name in names):
                return match.alpha_2.lower()
    return None


def resolve(query) -> ResolvedLocation:
    """
    Resolve `query.country_code` / `query.city` / `query.location` into a target.

    The LLM's code is trusted only after it validates. When it does not, the
    free-text location is searched for a country name before giving up, and the
    result is labelled so callers can tell a confirmed location from a guess.
    """
    raw_location = _clean(getattr(query, "location", None))
    city = _clean(getattr(query, "city", None)) or None
    remote_flag = bool(getattr(query, "remote", False))

    # "Remote" is an arrangement, not a place. Treat it as such rather than
    # letting it fail country lookup and look like a missing location.
    if raw_location and _looks_remote(raw_location) and not city:
        return ResolvedLocation(remote_only=True, source="llm")

    claimed = _clean(getattr(query, "country_code", None))
    code = _validate_code(claimed)
    from_text = _country_in_text(raw_location or city or "")
    source = "llm"
    warning = None

    # Validating against the ISO list is not enough on its own. A hallucinated
    # code is almost always a *valid* code for the wrong country — "kn" (Saint
    # Kitts and Nevis) for "Nairobi, Kenya" passes every format check there is.
    # The location text is the corroborating evidence, so it wins on conflict.
    if code and from_text and _normalise_gb(code) != _normalise_gb(from_text):
        warning = (
            f"country_code {claimed!r} ({_country_name(code)}) contradicts "
            f"location {raw_location!r}; using {from_text!r} "
            f"({_country_name(from_text)})"
        )
        code, source = from_text, "corrected"

    elif code is None:
        if from_text:
            code, source = from_text, "recovered"
            if claimed:
                warning = (
                    f"country_code {claimed!r} is not a valid ISO code; "
                    f"recovered {from_text!r} from location {raw_location!r}"
                )
        else:
            return ResolvedLocation(
                city=city,
                remote_only=remote_flag,
                source="none",
                warning=(
                    f"could not resolve a country from location={raw_location!r} "
                    f"country_code={claimed!r}"
                ) if (raw_location or claimed) else None,
            )

    if city and _looks_remote(city):
        city = None

    return ResolvedLocation(
        country_code=code,
        country_name=_country_name(code),
        city=city,
        remote_only=remote_flag,
        source=source,
        warning=warning,
    )


def supported_by_jsearch(code: str | None) -> bool:
    return bool(code) and code in JSEARCH_COUNTRIES


# Coarse region membership, used to decide whether a remote posting that lists
# eligible regions is open to this user. Only the groupings providers actually
# write in that field are modelled.
_REGIONS = {
    "africa": {"dz", "ao", "eg", "gh", "ke", "ma", "ng", "so", "tn", "za", "ug", "tz", "rw", "et"},
    "emea": {"dz", "ao", "at", "be", "ch", "de", "dk", "eg", "es", "fi", "fr", "gb", "gh",
             "gr", "hu", "ie", "il", "iq", "it", "ke", "kw", "ma", "ng", "nl", "no", "om",
             "pl", "pt", "qa", "ro", "ru", "sa", "se", "so", "tn", "tr", "ua", "ae", "za"},
    "europe": {"at", "be", "ch", "de", "dk", "es", "fi", "fr", "gb", "gr", "hu", "ie", "it",
               "nl", "no", "pl", "pt", "ro", "se", "ua"},
    "americas": {"ar", "br", "ca", "cl", "co", "mx", "pa", "pe", "us", "ve"},
    "north america": {"ca", "mx", "us"},
    "northern america": {"ca", "us"},
    "asia": {"hk", "id", "in", "jp", "kr", "lk", "my", "ph", "pk", "sg", "tw", "th", "vn"},
    "oceania": {"au", "nz"},
}

_OPEN_WORDS = ("worldwide", "anywhere", "global", "any location", "international")

# Words that say "this job is remote" without saying who may hold it.
_UNINFORMATIVE = ("remote", "work from home", "wfh", "distributed", "flexible")

_ALIASES = {
    "us": ("usa", "united states", "u.s."),
    "gb": ("uk", "united kingdom", "britain", "england"),
}


def _names_any_place(text: str) -> bool:
    """Does this string name a country or region at all?"""
    if any(region in text for region in _REGIONS):
        return True
    if any(alias in text for aliases in _ALIASES.values() for alias in aliases):
        return True
    return any(
        country.name.lower() in text
        for country in pycountry.countries
        if len(country.name) > 4
    )


def remote_eligibility(requirement: str | None, country_code: str | None) -> bool | None:
    """
    Can someone in `country_code` hold this remote job?

    True when the posting is open or names their country/region, False when it
    names places and theirs is absent, None when there is nothing to judge.

    The None case matters as much as the False one. "Remote" states an
    arrangement, not an eligibility list — treating that as a restriction
    silently discarded every RemoteOK posting, since that board usually leaves
    the field blank.
    """
    text = _clean(requirement).lower()
    if not text:
        return None
    if any(word in text for word in _OPEN_WORDS):
        return True
    if not country_code:
        return None

    code = _normalise_gb(country_code)
    name = (_country_name(code) or "").lower()
    if name and name in text:
        return True
    if any(alias in text for alias in _ALIASES.get(code, ())):
        return True

    for region, members in _REGIONS.items():
        if region in text and code in members:
            return True

    # Names somewhere, and it is not this user's somewhere.
    if _names_any_place(text):
        return False

    # Says only "Remote" or similar: unknown, not excluded.
    if any(word in text for word in _UNINFORMATIVE):
        return None

    return None
