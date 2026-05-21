from pathlib import Path
from typing import List, Dict

KNOWLEDGE_BASE_DIR = Path(__file__).parent.parent / "knowledge"


def load_all_knowledge() -> List[Dict]:
    documents = []
    if not KNOWLEDGE_BASE_DIR.exists():
        return documents
    for md_file in sorted(KNOWLEDGE_BASE_DIR.glob("*.md")):
        try:
            with open(md_file, "r", encoding="utf-8") as f:
                content = f.read()
            documents.append({
                "content": content,
                "metadata": {
                    "source": f"knowledge/{md_file.name}",
                    "type": md_file.stem,
                },
            })
        except Exception as e:
            print(f"Warning: Failed to load {md_file}: {e}")
    return documents
