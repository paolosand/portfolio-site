import os
from google import genai
from google.genai import types

MODEL = "gemini-2.5-flash"
GENERATION_CONFIG = types.GenerateContentConfig(
    temperature=0.7,
    max_output_tokens=1024,
)


def get_client() -> genai.Client:
    return genai.Client(api_key=os.environ["GOOGLE_API_KEY"])
