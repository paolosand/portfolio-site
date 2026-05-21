# api/agents/rag_chain.py
import logging
from typing import List, Dict
from services.llm import get_llm
from services.knowledge_loader import load_all_knowledge
from agents.personality import SYSTEM_PROMPT

MAX_QUERY_LENGTH = 1000


class RAGChain:
    def __init__(self):
        self.llm = get_llm()

    async def retrieve(self, query: str) -> List[Dict]:
        return load_all_knowledge()

    async def generate(self, query: str, context: List[Dict], history: List[Dict]) -> str:
        if not query or not query.strip():
            return "Please provide a question."
        if len(query) > MAX_QUERY_LENGTH:
            return f"Your question is too long (max {MAX_QUERY_LENGTH} characters). Please shorten it."
        try:
            context_text = self._format_context(context)
            history_text = self._format_history(history)
            prompt = f"""{SYSTEM_PROMPT}

CONTEXT FROM KNOWLEDGE BASE:
{context_text if context_text else "No relevant context found."}

CONVERSATION HISTORY:
{history_text if history_text else "No previous messages."}

USER QUESTION: {query}

RESPONSE:"""
            response = await self.llm.ainvoke(prompt)
            return response.content
        except Exception as e:
            logging.error(f"LLM generation error: {e}")
            return "I'm having trouble generating a response right now. Could you try rephrasing your question?"

    def _format_context(self, context: List[Dict]) -> str:
        if not context:
            return ""
        formatted = []
        for i, doc in enumerate(context, 1):
            source = doc.get("metadata", {}).get("source", "unknown")
            content = doc.get("content", "")
            formatted.append(f"[{i}] Source: {source}\n{content}")
        return "\n\n".join(formatted)

    def _format_history(self, history: List[Dict]) -> str:
        if not history:
            return ""
        formatted = []
        for msg in history[-5:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            formatted.append(f"{role.upper()}: {content}")
        return "\n".join(formatted)
