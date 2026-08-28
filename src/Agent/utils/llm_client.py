import os
from groq import Groq

from src.Agent.utils.prompts import SYSTEM_PROMPT, USER_PROMPT, build_prompt
from dotenv import load_dotenv,find_dotenv

load_dotenv(find_dotenv())


# The gpt-oss models are reasoning models: they spend completion budget thinking
# before they emit any JSON, and Groq rejects the *whole* response with
# `json_validate_failed` if the document is cut off mid-way rather than returning
# the truncated text. The default cap was below what the model actually wanted,
# so identical requests failed about half the time.
#
# Measured over six identical calls with one CV, counting both success rate and
# how many CV skills survived:
#
#     effort   cap     ok     completion tokens   skills
#     medium   (none)  2/5    1043-1739           35-39
#     medium   2048    3/6    1043-1521           30-35
#     medium   4096    5/6    1526-2377           34-39
#     low      2048    6/6    215 (flat)          30
#
# "low" is perfectly reliable but drops real skills — fastapi, langchain, hugging
# face, machine learning and data science all vanish from an ML CV, which
# understates coverage and invents gaps downstream. So "medium" is preferred and
# "low" is the fallback, rather than either being the setting.
REASONING_EFFORT = os.getenv("JOBRADAR_GROQ_REASONING_EFFORT", "medium")

# Requested completion budget counts towards the free tier's 8,000 tokens per
# minute *even when it goes unused* — 8,192 turned an ordinary CV into a 413
# before the model was ever called. 4,096 clears the 2,377 tokens "medium" has
# been seen to want while leaving room for a prompt about half again as long as
# the CV this was measured on.
MAX_COMPLETION_TOKENS = int(os.getenv("JOBRADAR_GROQ_MAX_COMPLETION_TOKENS", "4096"))

# Where a longer CV lands: the request no longer fits the per-minute budget, or
# the model still wants more than the cap. Both are recoverable by asking for
# less thinking, which is worse output but is output.
FALLBACK_REASONING_EFFORT = "low"
FALLBACK_MAX_COMPLETION_TOKENS = 2048


def _should_downgrade(err) -> bool:
    """True for the two failures that a cheaper reasoning effort would survive."""
    status = getattr(err, "status_code", None)
    if status == 413:                     # request over the tokens-per-minute limit
        return True
    return status == 400 and "json_validate_failed" in str(err)


class GroqModel:
    def __init__(self):
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.model = os.getenv("GROQ_MODEL_NAME")

    def _complete(self, user_prompt, effort, max_tokens):
        return self.client.chat.completions.create(
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
            temperature=0,
            reasoning_effort=effort,
            max_completion_tokens=max_tokens
        )

    def generate_response(self, user_input):
        user_prompt = build_prompt(USER_PROMPT, query=user_input)

        try:
            res = self._complete(user_prompt, REASONING_EFFORT, MAX_COMPLETION_TOKENS)
        except Exception as e:
            if not _should_downgrade(e):
                print(f"LLM error: {e}")
                raise

            # Retried rather than raised: a query that does not fit at the
            # preferred effort still parses fine at a cheaper one, and returning
            # a slightly thinner skill list beats failing the whole analysis.
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