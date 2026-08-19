from sentence_transformers import SentenceTransformer
from src.Agent.utils.parser import ProcessedJob, ParsedQuery


class SentenceEmbedder:
    def __init__(self):
        self.model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

    def get_embeddings(self, query: ParsedQuery, jobs: list[ProcessedJob]):
        try:

            user_embs = {
                "title": self.model.encode(query.primary_role),
                "skills": self.model.encode(query.skills),
                "experience": self.model.encode(query.experience_level),
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



