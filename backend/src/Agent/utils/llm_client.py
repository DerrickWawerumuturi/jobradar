import os
from groq import Groq

from src.Agent.utils.prompts import ONBOARDING_PROMPT
from src.Agent.utils.prompts import SYSTEM, USER_PROMPT, build_prompt
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

REASONING_EFFORT = os.getenv("JOBRADAR_GROQ_REASONING_EFFORT", "medium")
MAX_COMPLETION_TOKENS = int(os.getenv("JOBRADAR_GROQ_MAX_COMPLETION_TOKENS", "4096"))
FALLBACK_REASONING_EFFORT = "low"
FALLBACK_MAX_COMPLETION_TOKENS = 2048


def _should_downgrade(err) -> bool:
    """True for failures that a cheaper reasoning effort can survive."""
    status = getattr(err, "status_code", None)
    return status == 413 or (status == 400 and "json_validate_failed" in str(err))


class GroqModel:
    def __init__(self, prompt_template, system_template, placeholder_key):
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.model = os.getenv("GROQ_MODEL_NAME")
        self.prompt_template = prompt_template
        self.placeholder_key = placeholder_key

    def _complete(self, user_prompt, effort, max_tokens):
        return self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0,
            reasoning_effort=effort,
            max_completion_tokens=max_tokens,
        )

    def _generate_with_retry(self, user_prompt):
        try:
            res = self._complete(user_prompt, REASONING_EFFORT, MAX_COMPLETION_TOKENS)
        except Exception as e:
            if not _should_downgrade(e):
                print(f"LLM error: {e}")
                raise
            print(f"LLM retrying at {FALLBACK_REASONING_EFFORT} reasoning effort: {e}")
            try:
                res = self._complete(
                    user_prompt,
                    FALLBACK_REASONING_EFFORT,
                    FALLBACK_MAX_COMPLETION_TOKENS,
                )
            except Exception as retry_err:
                print(f"LLM error: {retry_err}")
                raise
        return res.choices[0].message.content

    def generate_response(self, user_input):
        user_prompt = build_prompt(self.prompt_template, **{self.placeholder_key: user_input})
        return self._generate_with_retry(user_prompt)
