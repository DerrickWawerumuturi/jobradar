import os
from groq import Groq

from src.Agent.utils.prompts import SYSTEM_PROMPT, USER_PROMPT, build_prompt
from dotenv import load_dotenv,find_dotenv

load_dotenv(find_dotenv())




class GroqModel:
    def __init__(self):
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.model = os.getenv("GROQ_MODEL_NAME")

    def generate_response(self, user_input):
        user_prompt = build_prompt(USER_PROMPT, query=user_input)

        try:
            res = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": SYSTEM_PROMPT
                    },
                    {
                        "role": "user",
                        "content": user_prompt
                    },
                ],
                response_format={"type": "json_object"},
                temperature=0
            )
        except Exception:
            raise ValueError("Error generating response")

        return res.choices[0].message.content