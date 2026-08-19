# QueryInterpreter.py -> ModelB purpose is to get the user input and understand what
#              are the skills he/she poses.
#           -> Also can come up with a list of skills based on if the entry was
#              just a specific role(like say junior ml dev: model(pytorch, RAG...)


from src.Agent.utils.parser import parse_generated_query
from src.Agent.utils.llm_client import GroqModel


class QueryInterpreter:
    def __init__(self):
        self.llm  = GroqModel()

    def interpreter(self, user_input):
        try:
            response = self.llm.generate_response(user_input)
            result = parse_generated_query(response)
        except Exception:
            raise ValueError("Error in the interpreter")
        return result


