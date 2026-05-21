import os
from langchain_google_genai import ChatGoogleGenerativeAI


def get_llm():
    return ChatGoogleGenerativeAI(
        model="models/gemini-2.5-flash",
        google_api_key=os.environ["GOOGLE_API_KEY"],
        temperature=0.7,
        max_output_tokens=1024,
    )
