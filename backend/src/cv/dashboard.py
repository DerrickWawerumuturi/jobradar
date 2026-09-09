from src.Agent.utils.parser import parse_generated_query
from src.Agent.utils.prompts import CV_SYSTEM_TEMPLATE
from src.Agent.utils.prompts import ONBOARDING_PROMPT
from src.Agent.utils.llm_client import GroqModel


class Dashboard:
    def __init__(self):
        self.llm = GroqModel(ONBOARDING_PROMPT, CV_SYSTEM_TEMPLATE,  "cv")

    def parse(self, cv_text):
        try:
            result = self.llm.generate_response(cv_text)
            response = parse_generated_query(result, "cv")
            return response

        except Exception as err:
            raise ValueError(f"Error in the interpreter: {err}") from err


dashboard = Dashboard()