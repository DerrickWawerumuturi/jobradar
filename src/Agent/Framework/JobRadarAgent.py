from src.Agent.Framework.SimilarityEngine import SimilarityEngine, MarketAnalyzer
from src.Agent.utils.embedder import SentenceEmbedder
from src.Agent.Framework.QueryInterpreter import QueryInterpreter
from src.Agent.Framework.SearchEngine import SearchEngine
from src.Agent.utils.skill_extractor import SkillExtractor
from src.Agent.utils.parser import parse_retrieved_jobs


class JobRadarAgent:
    def __init__(self):
        self.query_interpreter = QueryInterpreter()
        self.search_engine = SearchEngine()
        self.skill_extractor = SkillExtractor()
        self.sentence_embedder = SentenceEmbedder()
        self.similarity_engine = SimilarityEngine()
        self.market_analyzer = MarketAnalyzer()


    def run(self, user_input):
        query = self.query_interpreter.interpreter(user_input)
        raw_jobs = self.search_engine.get_jobs(query)

        jobs = parse_retrieved_jobs(raw_jobs, self.skill_extractor)
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

        return {
            "market": market_intelligence,
            "ranked_jobs": ranked_jobs,
        }


job_radar_agent = JobRadarAgent()


if __name__ == "__main__":
    agent = JobRadarAgent()
    # print(agent.run(user_input=user_input))