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
        except Exception as err:
            # Chained, because it was not. A Groq `json_validate_failed` reached
            # the caller as a bare "Error in the interpreter" with the real cause
            # discarded, and was only diagnosable because generate_response
            # happens to print the error before re-raising it.
            raise ValueError(f"Error in the interpreter: {err}") from err
        return result


