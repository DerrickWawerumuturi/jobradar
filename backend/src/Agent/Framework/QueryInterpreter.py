# QueryInterpreter.py -> ModelB purpose is to get the user input and understand what
#              are the skills he/she poses.
#           -> Also can come up with a list of skills based on if the entry was
#              just a specific role(like say junior ml dev: model(pytorch, RAG...)
from src.Agent.utils.prompts import USER_SYSTEM_TEMPLATE
from src.Agent.utils.prompts import USER_PROMPT
from src.Agent.utils.parser import parse_generated_query
from src.Agent.utils.llm_client import GroqModel


class QueryInterpreter:
    def __init__(self):
        self.llm  = GroqModel(USER_PROMPT, USER_SYSTEM_TEMPLATE, placeholder_key="query")

    def interpreter(self, user_input):
        try:
            response = self.llm.generate_response(user_input)
            result = parse_generated_query(response, "user")
        except Exception as err:
            raise ValueError(f"Error in the interpreter: {err}") from err
        return result


