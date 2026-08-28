from src.Agent.utils.parser import ParsedQuery

USER_PROMPT = """
                Parse the following job search request.            
                
                {query}
                Return the JSON using the schema below.
                
                {{
                  "primary_role": string | null,
                  "secondary_roles": [],
                  "category": string | null
                  "skills": [],
                  "experience_level": string | null,
                  "job_requirements: str | None = None,
                  "education": string | null,
                  "location": string | null,
                  "country_code": string | null,
                  "city": string | null,
                  "remote": boolean | null,
                  "employment_type": string | null,
                  "salary_min": integer | null,
                  "salary_max": integer | null,
                  "currency": string | null,
                  "industries": [],
                  "keywords": [],
                  "exclude_keywords": [],
                  "company_preferences": [],
                  "languages": [],
                  "notes": string | null
                }}
                
                Rules:
                
                - Return ONLY valid JSON.
                - Missing information should be null.
                - Arrays should never be null.
                - Never hallucinate values.
                - Keep skill names standardized.
                - If one or two more roles appears, pick the first one, add the rest to secondary_roles
                - For experience level, classify it under one of these: Entry Level, Senior Level, Mid Level, Internship, Management
                - For job_requirements, classify it under one of these: under_3_years_experience, more_than_3_years_experience, no_experience, no_degree
                - location: the place as written, e.g. "Nairobi, Kenya". Null if absent.
                - country_code: the ISO 3166-1 alpha-2 code for that place, lowercase, e.g. "ke" for Nairobi, "gb" for London, "us" for Austin. Infer it from a city, an address, a phone country code or a nationality if the country is not named outright. Null only when there is genuinely no locational evidence.
                - city: the city alone, e.g. "Nairobi". Null if only a country is known.
                - If the location says only "remote" or "anywhere", set remote true and leave country_code null.
                - category: classify it under exactly one of these: Software Engineering, Data and Analytics, Computer and IT, Science and Engineering, Design and UX, Product Management. Null if none fit.
                """

SYSTEM = """
You are QueryParser, an expert at converting natural language job search requests into structured JSON.

You NEVER answer questions.

You NEVER explain your reasoning.

You ONLY return valid JSON.

If information is missing, return null.

Do not invent values.

Do not include markdown.

Do not include code blocks.
"""

SYSTEM_PROMPT= f"{SYSTEM}\n\nRespond with a JSON object matching this schema:\n{ParsedQuery.model_json_schema()}"


def build_prompt(template: str, **kwargs):
    return template.format(**kwargs)