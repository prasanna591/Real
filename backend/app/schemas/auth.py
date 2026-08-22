from pydantic import BaseModel, Field


class BuilderRegister(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=200)
    password: str = Field(min_length=8, max_length=128)


class BuilderLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class BuilderRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    email: str
    role: str
