from src.Agent.utils.extraction_pool import extraction_pool
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
    except Exception as err:
        raise ValueError(f"Error parsing the generated input: {err}") from err


def parse_retrieved_jobs(raw_jobs: list[Job]) -> list[ProcessedJob]:
    """
    Extract skills for every posting, in parallel.

    Postings whose extraction fails are dropped rather than kept with an empty
    skill list. Keeping them counted a job in jobs_analyzed that contributed no
    skills, which deflated every frequency in the market analysis.
    """
    try:
        with_description = [job for job in raw_jobs if job.description]
        extracted = extraction_pool.extract_many(
            [job.description for job in with_description]
        )

        cleaned_jobs = []
        failed = 0

        for job, skills in zip(with_description, extracted):
            if skills is None:
                failed += 1
                continue
            cleaned_jobs.append(ProcessedJob(job=job, skills=skills))

        if failed:
            print(f"Dropped {failed} of {len(with_description)} postings: skill extraction failed")

        return cleaned_jobs

    except Exception:
        raise ValueError("Error parsing the fetched jobs")
