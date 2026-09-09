import os

from sentence_transformers import SentenceTransformer
from sentence_transformers.util import cos_sim

from src.Agent.utils.parser import ProcessedJob, ParsedQuery

# Fraction of the best-matching title's score a posting must reach to be counted
# as part of this user's market. Relative rather than absolute because the
# absolute numbers are not portable: measured, 0.21 was the right cut for a
# software-engineer profile and dropped genuine "Senior Software Engineer"
# postings for a machine-learning one, since the profile string changes the
# scale of every cosine in the batch.
RELEVANCE_ALPHA = float(os.getenv("JOBRADAR_RELEVANCE_ALPHA", "0.30"))


def profile_text(query: ParsedQuery) -> str:
    """
    Role plus skills, which separates far better than the role alone.

    Measured over a real corpus: role-only scored "Business Development
    Representative" above "Senior Software Developer". Adding the description
    to the job side made it worse still — postings share so much generic
    corporate prose that everything drifts together.
    """
    parts = [query.primary_role or ""]
    parts += list(query.secondary_roles or [])
    parts += list(query.skills or [])
    return " ".join(part for part in parts if part).strip()


class SentenceEmbedder:
    def __init__(self):
        self.model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

    def role_relevance(self, query: ParsedQuery, jobs: list) -> list:
        """Cosine of the user's profile against each job title."""
        profile = profile_text(query)
        if not profile or not jobs:
            return [1.0] * len(jobs)

        titles = [getattr(job, "title", "") or "" for job in jobs]
        return cos_sim(self.model.encode(profile), self.model.encode(titles))[0].tolist()

    def filter_by_role(
        self,
        query: ParsedQuery,
        jobs: list,
        alpha: float = RELEVANCE_ALPHA,
        min_keep: int = 0,
    ):
        """
        Drop postings that are not this user's market.

        MarketAnalyzer weights every posting equally, so a copywriter vacancy in
        the corpus is not merely noise in the ranked list — its skills become
        market demand. Running before skill extraction also means the dropped
        postings are never paid for, since extraction is the expensive stage.
        """
        if not jobs:
            return [], []

        scores = self.role_relevance(query, jobs)
        best = max(scores)
        if best <= 0:
            return jobs, []

        ranked = sorted(range(len(jobs)), key=lambda i: scores[i], reverse=True)
        threshold = alpha * best
        keep = {i for i in ranked if scores[i] >= threshold}

        # Filtering must not undo the minimum-jobs floor the search just worked
        # to satisfy; below it the market statistics stop meaning anything.
        for index in ranked:
            if len(keep) >= min_keep:
                break
            keep.add(index)

        kept = [job for i, job in enumerate(jobs) if i in keep]
        dropped = [(jobs[i], scores[i]) for i in range(len(jobs)) if i not in keep]
        return kept, dropped

    def get_embeddings(self, query: ParsedQuery, jobs: list[ProcessedJob]):
        try:

            # Every value here must be a single (384,) vector, because
            # SimilarityEngine reads `scores[0][i]` for each component.
            #
            # `query.skills` is a *list*, and `encode` on a list returns one row
            # per element, so this was a (n_skills, 384) matrix while everything
            # around it was a vector. cos_sim then produced (n_skills, n_jobs)
            # and `[0][i]` read row 0 — meaning the skills term, half the total
            # weight, was the cosine of the *first* CV skill alone and the other
            # rows were computed and thrown away. Which skill landed in position
            # 0 was simply whatever order the LLM emitted them in.
            #
            # Joining also puts the user side on the same footing as the job
            # side below, which has always been `" ".join(j.skills)`.
            user_embs = {
                "title": self.model.encode(query.primary_role or ""),
                "skills": self.model.encode(" ".join(query.skills or [])),
                "experience": self.model.encode(query.experience_level or ""),
                "location": self.model.encode(query.location or "")
            }

            job_titles = [j.job.title for j in jobs]
            job_skills = [
                " ".join(j.skills)
                for j in jobs
            ]
            job_experience = [
                j.job.experience_level or "" for j in jobs
            ]
            job_locations = [
                j.job.location or ""
                for j in jobs
            ]


            job_embs = {
                "title": self.model.encode(job_titles),
                "skills": self.model.encode(job_skills),
                "experience": self.model.encode(job_experience),
                "location": self.model.encode(job_locations)
            }

            return user_embs, job_embs


        except Exception as e:
            raise RuntimeError(f"Error generating embeddings: {e}") from e



