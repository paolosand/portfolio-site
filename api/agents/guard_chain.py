# api/agents/guard_chain.py
import re
import random
from dataclasses import dataclass
from agents.personality import WITTY_REJECTION_RESPONSES


@dataclass
class GuardResult:
    is_malicious: bool
    reason: str = ""
    response: str = ""


class GuardChain:
    PROMPT_INJECTION_PATTERNS = [
        r"ignore\s+(previous|all|any)\s+(instructions?|prompts?|rules?|directives?)",
        r"forget\s+(everything|all|previous)",
        r"you\s+are\s+now",
        r"new\s+instructions?",
        r"system\s+prompt",
        r"disregard\s+(previous|above|all)",
        r"act\s+as",
        r"pretend\s+(you|to)\s+(are|be)",
        r"roleplay\s+as",
        r"what\s+(are|were)\s+your\s+(original\s+)?instructions?",
        r"show\s+me\s+your\s+prompt",
        r"bypass",
        r"override",
        r"<script>",
        r"DROP TABLE",
        r"<\s*script",
    ]

    SENSITIVE_INFO_PATTERNS = [
        r"phone\s+number",
        r"home\s+address",
        r"social\s+security",
        r"credit\s+card",
        r"password",
        r"api\s+key",
        r"family\s+members?",
        r"(mother|father|sibling|parent).*name",
    ]

    def check(self, message: str) -> GuardResult:
        for pattern in self.PROMPT_INJECTION_PATTERNS:
            if re.search(pattern, message, re.IGNORECASE):
                return GuardResult(
                    is_malicious=True,
                    reason="prompt_injection",
                    response=random.choice(WITTY_REJECTION_RESPONSES),
                )

        for pattern in self.SENSITIVE_INFO_PATTERNS:
            if re.search(pattern, message, re.IGNORECASE):
                return GuardResult(
                    is_malicious=True,
                    reason="sensitive_info_request",
                    response="I keep personal contact details private, but you can reach Paolo via email at his contact page!",
                )

        return GuardResult(is_malicious=False)

    def filter_response(self, response: str) -> str:
        response = re.sub(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b", "[PHONE_REDACTED]", response)
        response = re.sub(r"\b\d{3}-\d{2}-\d{4}\b", "[SSN_REDACTED]", response)
        return response
