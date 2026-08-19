import re

import spacy
from spacy.matcher import PhraseMatcher
from skillNer.general_params import SKILL_DB
from skillNer.skill_extractor_class import SkillExtractor as nerExtractor

nlp = spacy.load("en_core_web_lg")

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
)

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
})


def _strip_boilerplate(text: str) -> str:
    """Drop paragraphs that are legal or benefits boilerplate."""
    paragraphs = re.split(r"\n\s*\n|\n(?=[A-Z][^\n]{0,60}:\s*\n)", text)
    kept = [
        para for para in paragraphs
        if not any(marker in para.lower() for marker in BOILERPLATE_MARKERS)
    ]
    # If the filter ate everything the posting was mostly boilerplate; fall
    # back to the original so the job still contributes some skills.
    return "\n\n".join(kept) if kept else text


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
        """Canonical skill names mentioned in a job description."""
        try:
            return self._collect(_strip_boilerplate(job_desc))
        except Exception as err:
            print(f"Error extracting skills {err}")
            return set()

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
