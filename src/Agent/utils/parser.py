from src.Agent.utils.skill_extractor import SkillExtractor
from src.Agent.utils.types import ParsedQuery, Job, ProcessedJob


USER_INPUT_TEXT = "I am a junior ml learning Engineer with 1-2 years of experience"


def parse_query(user_input) -> list[str]:
    if len(user_input) > 0:
        return [user_input]
    raise ValueError("Input cannot be empty")



# user_input = parse_query(USER_INPUT_PDF)


def parse_generated_query(generated_input):
    try:
        result = ParsedQuery.model_validate_json(generated_input)
        return result
    except Exception:
        raise ValueError("Error parsing the generated input")


def parse_retrieved_jobs(raw_jobs: list[Job], skill_extractor: SkillExtractor) -> list[ProcessedJob]:
    cleaned_jobs = []
    try:
        for job in raw_jobs:
            if not job.description:
                continue

            try:
                skills = skill_extractor.extract(job.description)
                cleaned_jobs.append(
                    ProcessedJob(
                        job=job,
                        skills=list(skills)
                    )
                )
            except Exception as e:
                print(f"Failed to extract skills from {job.title}: {e}")

        return cleaned_jobs

    except Exception:
        raise ValueError("Error parsing the fetched jobs")
