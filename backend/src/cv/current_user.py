import jwt
from jwt import DecodeError
from dotenv import find_dotenv, load_dotenv
import os
from fastapi import Header, HTTPException
from typing import Annotated
load_dotenv(find_dotenv())

ALGORITHM = "HS256"
SECRET = os.environ["API_JWT_SECRET"]


def current_user(authorization: Annotated[str, Header()]):
    token = authorization.removeprefix("Bearer ").strip()
    try:
        return jwt.decode(token, SECRET, algorithms=[ALGORITHM])
    except DecodeError:
        raise HTTPException(status_code=401,detail="Invalid or expired token")



