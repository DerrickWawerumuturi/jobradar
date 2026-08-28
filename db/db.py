import os
import asyncio
from psycopg_pool import AsyncConnectionPool
from dotenv import find_dotenv, load_dotenv
load_dotenv(find_dotenv())


SEARCH_PARAMS = """
SELECT  title, company, location, remote, 
       provider,  experience_level, remote, url
FROM jobs

"""


def runtime_url():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("Database url not found")
    return url

pool = AsyncConnectionPool(
    conninfo=runtime_url(),
    min_size=0,
    max_size=4,
    timeout=10,
    open=False
)



async def get_data():
    async with pool.connection() as conn:
        async  with conn.cursor() as cursor:
            await cursor.execute(SEARCH_PARAMS)
            return await cursor.fetchall()


async def main():
    await pool.open()

    data = await get_data()

    print(data)

    await pool.close()

asyncio.run(main())