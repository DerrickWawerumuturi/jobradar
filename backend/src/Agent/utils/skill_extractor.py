import os
import re
from html.parser import HTMLParser
from pathlib import Path

import spacy
from spacy.matcher import PhraseMatcher
from skillNer.general_params import SKILL_DB
from skillNer.skill_extractor_class import SkillExtractor as nerExtractor

# The container path is not the checkout path. `Dockerfile:19` copies the model
# to /app/en_core_web_lg, while a checkout has it at the wheel's own nested
# layout, so hardcoding the container path made this module unimportable
# locally — and this is the module whose output most needs to be iterated on by
# hand. Candidates are tried in order and the first that loads wins.
_REPO_ROOT = Path(__file__).resolve().parents[3]


def _load_spacy():
    override = os.getenv("JOBRADAR_SPACY_MODEL", "").strip()
    candidates = [
        override,
        "/app/en_core_web_lg",
        str(_REPO_ROOT / "en_core_web_lg" / "en_core_web_lg-3.8.0"),
        # Installed as a package by the wheel in CLAUDE.md. Last, because
        # resolving it depends on the interpreter's import path rather than on
        # a location this repository controls.
        "en_core_web_lg",
    ]

    errors = []
    for candidate in candidates:
        if not candidate:
            continue
        try:
            return spacy.load(candidate)
        except Exception as err:
            errors.append(f"{candidate}: {err}")

    raise OSError(
        "Could not load en_core_web_lg. Set JOBRADAR_SPACY_MODEL to its path. "
        "Tried:\n  " + "\n  ".join(errors)
    )


nlp = _load_spacy()

NGRAM_SCORE_THRESHOLD = 0.9

# SkillNer reports the matched span from its *preprocessed* text, which has been
# lemmatised token by token: "big data" arrives as "big datum", "machine
# learning" as "machine learn". Every match also carries a skill_id, so the
# canonical EMSI name is looked up instead of using the mangled surface form.

# Paragraphs of legally required boilerplate. They are not requirements, but
# SkillNer happily mines them for "Term Life Insurance", "Retirement Planning"
# and "Ordinances", so they are dropped before extraction.
BOILERPLATE_MARKERS = (
    "equal opportunity",
    "equal employment",
    "affirmative action",
    "eeo",
    "vevrra",
    "e-verify",
    "fair chance",
    "arrest or conviction",
    "arrest and conviction",
    "pay range",
    "salary range",
    "base pay",
    "compensation may vary",
    "benefits:",
    "great benefits",
    "we offer benefits",
    "paid time off",
    "life insurance",
    "retirement savings",
    "401(k)",
    "disability status",
    "protected veteran",
    "reasonable accommodation",
    "accommodations@",
    "application window",
    "state-specific notices",
    "legal notice",
    "privacy notice",
    "privacy practices",
    "disclaimer:",
    "worker type:",
    "anticipated weekly hours",
    "drug-free workplace",
    "drug free workplace",
    # Job-board furniture, not employer text. RemoteOK appends an anti-spam
    # notice to every posting it serves; SkillNer read the word "spam" in it and
    # reported CAN-SPAM Act as the most demanded skill in the market, present in
    # 25 of 67 postings.
    "please mention the word",
    "beta feature to avoid spam",
    "when applying to show you read",
    "companies can search these words",
    "apply for this job",
    "salary and compensation",
    "how do you apply",
    # Company/culture prose. Never contains requirements, often a third of the
    # posting, and extraction cost scales directly with characters kept.
    "about us",
    "about the company",
    "our mission",
    "our purpose",
    "our values",
    "who we are",
    "why join",
    "join us",
    "we believe",
    "our culture",
    "equal opportunity workplace",
)

# Headings that introduce the part of a posting that actually lists skills.
REQUIREMENT_MARKERS = (
    "requirement",
    "qualification",
    "what you'll need",
    "what you will need",
    "what you'll do",
    "what you will do",
    "what you'll bring",
    "what you will bring",
    "what we look for",
    "responsibilities",
    "essential",
    "skills",
    "tech stack",
    "your role",
    "the role",
    "about you",
    "who you are",
    "nice to have",
    "preferred",
    "minimum",
    "basic qualifications",
    "desired",
)

# Below this, section detection is assumed to have failed and the whole
# (boilerplate-stripped) posting is used instead.
MIN_FOCUSED_CHARS = 400

# Hard ceiling on what one posting may send to the annotator.
#
# SkillNer's cost grows faster than the character count — its n-gram scorer
# compares candidate spans pairwise via token.similarity() — so the longest
# postings dominate an analysis out of all proportion. Measured over a real
# corpus: the median posting is ~1,100 characters and the 90th percentile is
# ~2,200, but the largest is 28,919, and three postings out of 45 carry 31% of
# all the text. Those three are the ones where requirements-section detection
# failed and the whole posting was kept, so the tail is exactly the text least
# likely to be worth annotating.
MAX_EXTRACTION_CHARS = int(os.getenv("JOBRADAR_MAX_EXTRACTION_CHARS", "4000"))

# Surface forms that only ever match because ordinary prose collides with an
# abbreviation in the EMSI database: "San Jose" -> Storage Area Network,
# "www.adobe.com" -> Component Object Model, "e.g." -> E (Programming Language),
# "Nice to Have" -> Nice (Unix Utility), "Los Angeles" -> LO-NOx Burner.
# Genuinely short skill names (c, r, go, ai) are deliberately absent.
DENYLISTED_SURFACE_FORMS = frozenset({
    "e", "m", "es", "en", "com", "www", "san", "los", "ct", "ts", "sci",
    "act", "safe", "nice", "amd", "nmls", "target", "targets", "read",
    "reach", "imagine", "boost", "massive", "ordinances", "added",
    "adjacent", "switch", "track", "fix", "national", "geography",
    "sales", "zoom", "•",
})

# Canonical names that are real database entries but are job titles, fields of
# study or document artefacts rather than differentiating skills. Listing
# "Software Engineering" as a top skill for software jobs answers no question.
DENYLISTED_SKILL_NAMES = frozenset({
    "software engineering",
    "software development",
    "computer science",
    "computer engineering",
    "electrical engineering",
    "job descriptions",
    "innovation",
    "operations",
    "scale (map)",
    "scholastic read 180",
    "target 3001!",
    # "transformation" in a business/data context matches a genetics entry.
    # Remove this line if the search is ever pointed at biotech postings.
    "transformation (genetics)",
    # "programming" in a software posting matches the musical sense.
    "programming (music)",
})


# Tags that end a line of prose. Turning them into blank lines is what restores
# the paragraph structure the filters below depend on.
_BLOCK_TAGS = frozenset({
    "p", "br", "div", "li", "ul", "ol", "tr", "td", "table", "section",
    "article", "header", "footer", "blockquote", "hr",
    "h1", "h2", "h3", "h4", "h5", "h6",
})
_SKIP_CONTENT = frozenset({"script", "style", "noscript"})

_HTML_MARKER = re.compile(r"<[a-zA-Z/!]")


class _HTMLToText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self._skipping = 0

    def handle_starttag(self, tag, attrs):
        if tag in _SKIP_CONTENT:
            self._skipping += 1
        elif tag in _BLOCK_TAGS:
            self.parts.append("\n\n")

    def handle_endtag(self, tag):
        if tag in _SKIP_CONTENT:
            self._skipping = max(0, self._skipping - 1)
        elif tag in _BLOCK_TAGS:
            self.parts.append("\n\n")

    def handle_data(self, data):
        if not self._skipping:
            self.parts.append(data)


def html_to_text(text: str) -> str:
    """
    Flatten a provider's HTML description into paragraphs.

    Three providers return HTML, and HTML has no blank lines — so `_blocks`
    saw one enormous block, nothing could be stripped, and the full posting
    (tags included) went to SkillNer. Measured on Remotive: 127 tags, 1 block,
    0% reduction where plain-text postings reduce by about two thirds.
    """
    if not text or not _HTML_MARKER.search(text):
        return text

    parser = _HTMLToText()
    try:
        parser.feed(text)
        parser.close()
    except Exception:
        return text

    out = "".join(parser.parts).replace("\xa0", " ")
    out = re.sub(r"[ \t]+", " ", out)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.strip()


def _blocks(text: str) -> list:
    return re.split(r"\n\s*\n|\n(?=[A-Z][^\n]{0,60}:\s*\n)", text)


def _strip_boilerplate(text: str) -> str:
    """Drop paragraphs that are legal, benefits or company-culture boilerplate."""
    kept = [
        para for para in _blocks(text)
        if not any(marker in para.lower() for marker in BOILERPLATE_MARKERS)
    ]
    # If the filter ate everything the posting was mostly boilerplate; fall
    # back to the original so the job still contributes some skills.
    return "\n\n".join(kept) if kept else text


def _focus_on_requirements(text: str) -> str:
    """
    Keep the requirements/responsibilities sections and drop the rest.

    Extraction cost is roughly linear in characters, and the skills all live in
    a handful of sections. A block matching a heading marker is kept along with
    the two blocks after it, which is where the bullet list under a heading
    normally sits. If too little survives, section detection is assumed to have
    failed and the full text is used rather than risk losing skills.
    """

    blocks = _blocks(text)
    keep = [False] * len(blocks)

    for index, block in enumerate(blocks):
        head = block.lower()[:120]
        if any(marker in head for marker in REQUIREMENT_MARKERS):
            for offset in range(0, 3):
                if index + offset < len(keep):
                    keep[index + offset] = True

    focused = "\n\n".join(block for block, wanted in zip(blocks, keep) if wanted)
    return focused if len(focused) >= MIN_FOCUSED_CHARS else text


def _truncate(text: str, limit: int) -> str:
    """Cut to `limit`, backing up to the nearest clean break."""
    if limit <= 0 or len(text) <= limit:
        return text

    window = text[:limit]
    for separator in ("\n\n", "\n", ". "):
        cut = window.rfind(separator)
        # Only honour a break in the last 40%, otherwise a document with one
        # early newline would lose most of its allowance.
        if cut >= limit * 0.6:
            return window[:cut].rstrip()
    return window.rstrip()


def prepare_description(text: str) -> str:
    """Reduce a posting to the text worth running skill extraction over."""
    focused = _focus_on_requirements(_strip_boilerplate(html_to_text(text)))
    return _truncate(focused, MAX_EXTRACTION_CHARS)


class SkillExtractor:
    def __init__(self):
        self.skill_extractor = nerExtractor(nlp, SKILL_DB, PhraseMatcher)

    def _canonical(self, match) -> str | None:
        """Map one SkillNer match to its canonical EMSI skill name."""
        surface = match.get("doc_node_value", "").strip().lower()
        if not surface or surface in DENYLISTED_SURFACE_FORMS:
            return None

        entry = SKILL_DB.get(match.get("skill_id"))
        if entry is None:
            return None

        skill_name = entry["skill_name"]
        if skill_name.strip().lower() in DENYLISTED_SKILL_NAMES:
            return None

        return skill_name

    def _collect(self, text: str) -> set:
        annotations = self.skill_extractor.annotate(text)
        results = annotations["results"]

        matches = list(results.get("full_matches", []))
        matches += [
            match for match in results.get("ngram_scored", [])
            if match.get("score", 0) >= NGRAM_SCORE_THRESHOLD
        ]

        skills = set()
        for match in matches:
            skill_name = self._canonical(match)
            if skill_name:
                skills.add(skill_name)
        return skills

    def extract(self, job_desc):
        """
        Canonical skill names mentioned in a job description.

        Failures deliberately propagate. SkillNer raises on some inputs, and
        swallowing that into an empty set made those postings look like jobs
        that genuinely require no skills — they still counted towards
        jobs_analyzed, which quietly deflated every frequency in the market
        analysis. Callers drop the posting instead.
        """
        return self._collect(prepare_description(job_desc))

    def normalize(self, skills):
        """
        Map free-text user skills onto the same canonical vocabulary the job
        descriptions are reduced to.

        The CV skills come from the LLM query interpreter ("react", "aws")
        while job skills come from SkillNer ("React.js", "Amazon Web Services").
        Without this the two sides are compared across different vocabularies
        and almost nothing matches, which understates coverage and invents
        skill gaps. Anything the database does not recognise is kept verbatim
        so the user's skill is not silently dropped.
        """
        normalized = set()
        for skill in skills or []:
            if not skill or not skill.strip():
                continue

            raw = skill.strip()
            try:
                matched = self._collect(raw)
            except Exception as err:
                print(f"Error normalizing skill {raw!r}: {err}")
                matched = set()

            normalized |= matched if matched else {raw}

        return normalized
