from datetime import datetime, timezone

from src.Agent.Framework.SimilarityEngine import SimilarityEngine, MarketAnalyzer
from src.Agent.utils.embedder import SentenceEmbedder
from src.Agent.Framework.QueryInterpreter import QueryInterpreter
from src.Agent.Framework.SearchEngine import SearchEngine, MIN_JOBS_FLOOR
from src.Agent.utils.skill_extractor import SkillExtractor
from src.Agent.utils.parser import parse_retrieved_jobs
from src.database.services.ingestion import JobIngestionService


class JobRadarAgent:
    def __init__(self):
        self.query_interpreter = QueryInterpreter()
        self.search_engine = SearchEngine()
        self.skill_extractor = SkillExtractor()
        self.sentence_embedder = SentenceEmbedder()
        self.similarity_engine = SimilarityEngine()
        self.market_analyzer = MarketAnalyzer()
        self.ingestion = JobIngestionService()


    def run(self, user_input):
        query = self.query_interpreter.interpreter(user_input)

        started_at = datetime.now(timezone.utc)
        run_log = []
        outcome = self.search_engine.get_jobs(query, run_log=run_log)
        raw_jobs = outcome.jobs

        # Raw postings are stored before parsing, so the ones parsing discards —
        # no description, or a SkillNer failure — still enter the dataset and
        # stay reprocessable.
        search_id = self.ingestion.record_search(
            query, run_log, len(raw_jobs), started_at, outcome.coverage
        )
        job_ids = self.ingestion.persist_jobs(search_id, raw_jobs)

        # The provider payload has been persisted and nothing downstream reads
        # it. Dropping it here keeps it out of the response serialiser.
        for job in raw_jobs:
            job.raw = None

        # After persistence, so the full result set still reaches the dataset —
        # a posting outside this user's market is still a real observation of
        # the market. Before extraction, so the ones we discard cost nothing.
        raw_jobs, off_market = self.sentence_embedder.filter_by_role(
            query, raw_jobs, min_keep=MIN_JOBS_FLOOR
        )
        if off_market:
            print(
                f"Excluded {len(off_market)} postings outside the role, "
                f"lowest: {', '.join(repr(j.title) for j, _ in off_market[:3])}"
            )
        outcome.coverage["off_market_removed"] = len(off_market)
        outcome.coverage["jobs_analyzed"] = len(raw_jobs)

        jobs = parse_retrieved_jobs(raw_jobs)

        self.ingestion.persist_skills(job_ids, jobs)

        user_embs, job_embs = self.sentence_embedder.get_embeddings(query, jobs)

        ranked_jobs = self.similarity_engine.calculate(
            user_embs,
            job_embs,
            jobs

        )

        # The CV skills arrive as free text from the LLM ("react", "aws") while
        # job skills are canonical EMSI names ("React.js", "Amazon Web
        # Services"). Put both on the same vocabulary before comparing them,
        # otherwise coverage is understated and gaps are invented.
        user_skills = self.skill_extractor.normalize(query.skills)

        market_intelligence = self.market_analyzer.analyze(
            user_skills,
            jobs
        )

        # What was actually searched travels with the numbers. A six-job
        # analysis and a forty-job one look identical otherwise, and the
        # frequencies in `market` mean very different things in each.
        return {
            "market": market_intelligence,
            "ranked_jobs": ranked_jobs,
            "search": outcome.coverage,
        }


job_radar_agent = JobRadarAgent()


if __name__ == "__main__":
    agent = JobRadarAgent()
    # print(agent.run(user_input=user_input))
