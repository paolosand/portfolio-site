# api/chat.py
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List

from agents.guard_chain import GuardChain

app = FastAPI()

guard = GuardChain()
_rag = None


def get_rag():
    global _rag
    if _rag is None:
        from agents.rag_chain import RAGChain
        _rag = RAGChain()
    return _rag


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    history: List[Message] = Field(default_factory=list)


class ChatResponse(BaseModel):
    response: str
    blocked: bool = False


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    guard_result = guard.check(request.query)
    if guard_result.is_malicious:
        return ChatResponse(response=guard_result.response, blocked=True)

    rag = get_rag()
    context = await rag.retrieve(request.query)
    history = [{"role": m.role, "content": m.content} for m in request.history]
    response_text = await rag.generate(
        query=request.query,
        context=context,
        history=history,
    )
    filtered = guard.filter_response(response_text)
    return ChatResponse(response=filtered)


