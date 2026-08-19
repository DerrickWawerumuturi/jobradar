import os
from abc import ABC, abstractmethod

from dotenv import find_dotenv, load_dotenv
import requests
from pydantic import ValidationError

from src.Agent.utils.parser import Job
from src.Agent.utils.types import SearchQuery

load_dotenv(find_dotenv())
countries = ["us", "gb", "ca"]

class JOBPROVIDER(ABC):
    @abstractmethod
    def search(self, query: SearchQuery) -> list[Job]:
        pass

    @abstractmethod
    def normalize(self, job_data: dict) -> dict:
        pass

    def parse_job(self, job_data: dict) -> Job:
        # print(len(job_data["job_description"]))
        # print(job_data["job_description"][-500:])
        normalized = self.normalize(job_data)
        return Job(**normalized)



# opted to remove Adzuna api as it limits description(which contains the skills to only 500 characters)
# class AdzunaProvider(JOBPROVIDER):
#     def __init__(self):
#         self.base_url = "https://api.adzuna.com/v1/api/jobs"
#
#     def search(
#             self,
#             query
#     ):
#         parsed_jobs = []
#         try:
#
#             for country in countries:
#                 url  = f"{self.base_url}/{country}/search/1"
#                 params = {
#                     "app_id": os.getenv("ADZUNA_API_ID"),
#                     "app_key": os.getenv("ADZUNA_API_KEY"),
#                     "what": query.primary_role,
#                     ** ( {"location0": "remote"} if query.remote == True else {}),
#                     "content-type": "application/json"
#                 }
#
#                 res = requests.get(url, params=params)
#                 if res.status_code == 200:
#                     data = res.json()
#                     results = data.get("results", {})
#                     for job in results:
#                         try:
#                             parsed_jobs.append(self.parse_job(job))
#                         except ValidationError as e:
#                             print(f"Skipping invalid job: {e}")
#
#                 else:
#                     print(f"[{country.upper()}] Error {res.status_code}: {res.text}")
#
#             return parsed_jobs
#
#         except ValueError as err:
#             print("Error fetching jobs from adzuna")
#             print(f"Exact error: {err}")
#             return []
#
#     def normalize(self, job_data: dict) -> dict:
#         return {
#             "id": job_data.get("id"),
#             "title": job_data.get("title"),
#             "company": job_data.get("company", {}).get("display_name"),
#             "description": job_data.get("description"),
#             "salary": job_data.get("salary_max"),
#             "location": job_data.get("location", {}).get("display_name"),
#             "url": job_data.get("redirect_url"),
#         }

class JSearchProvider(JOBPROVIDER):
    def __init__(self):
        self.base_url = 'https://jsearch.p.rapidapi.com/search-v2'

    def search(
            self,
            query
    ):
        parsed_jobs = []
        try:
            for country in countries:
                headers = {
                    "x-rapidapi-key": os.getenv("JSEARCH_API_KEY"),
                    "x-rapidapi-host": os.getenv("JSEARCH_HOST"),
                    "Content-Type": "application/json"
                }

                params = {
                    "query": f"{query.primary_role} in {country}",
                    "page": 1,
                    "num_pages": "1",
                    "job_requirements": query.job_requirements
                }

                res = requests.get(
                    self.base_url,
                    headers=headers,
                    params=params
                )

                if res.status_code == 200:
                    data = res.json()
                    results = data.get("data", {}).get("jobs", [])
                    for job in results:
                        try:
                            parsed_jobs.append(self.parse_job(job))
                        except ValidationError as e:
                            print(f"Skipping invalid job: {e}")

                else:
                    print(f"[{country.upper()}] Error {res.status_code}: {res.text}")
            return parsed_jobs

        except ValueError as err:
            print("Error fetching jobs from jsearch")
            print(f"Exact error: {err}")
            return []

    def normalize(self, job_data: dict):
        return {
            "id": job_data.get("job_id"),
            "title":job_data.get("job_title"),
            "company":job_data.get("employer_name"),
            "description":job_data.get("job_description"),
            "salary":job_data.get("job_salary"),
            "remote":job_data.get("job_is_remote"),
            "location":job_data.get("job_country"),
            "url":job_data.get("employer_website"),
            "employment_type":job_data.get("job_employment_type"),
            "source":job_data.get("job_apply_link"),
            "posted_at":job_data.get("job_posted_at"),
        }

class MuseProvider(JOBPROVIDER):
    def __init__(self):
        self.base_url = "https://www.themuse.com/api/public/jobs"

    def search(self,
               query
               ):
        parsed_jobs = []
        try:
            params = {
                "api_key": os.getenv("MUSE_API_KEY"),
                "page": 1,
                "category": query.primary_role,
                "level": query.experience_level
            }

            res = requests.get(self.base_url, params=params)
            if res.status_code == 200:
                data = res.json()
                results = data.get("results",[])
                for job in results:
                    try:
                        parsed_jobs.append(self.parse_job(job))
                    except ValidationError as e:
                        print(f"Skipping invalid job: {e}")

            return parsed_jobs

        except ValueError as err:
            print("Error fetching jobs from Muse")
            print(f"Exact error: {err}")
            return []

    def normalize(self, job_data: dict) -> dict:
        locations = job_data.get("locations", [])
        location = locations[0].get("name") if locations else None
        return {
            "id": job_data.get("id"),
            "title": job_data.get("name"),
            "company": job_data.get("company", {}).get("name"),
            "description": job_data.get("contents"),
            "location": location,
            "source": job_data.get("refs", {}).get("landing_page")
        }


class SearchEngine:
    def __init__(self):
        self.providers = [
            JSearchProvider(),
            MuseProvider()
        ]

    def get_jobs(self,
                   query: SearchQuery
    ) -> list[Job]:
        jobs = []

        for provider in self.providers:
            try:
                jobs.extend(provider.search(query))

            except Exception as e:
                print(f"{provider.__class__.__name__} failed: {e}")
        return jobs

