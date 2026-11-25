from collections import Counter
from dataclasses import dataclass
import math
from pathlib import Path
import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import KnowledgeDocument, Subject

DOCS_DIR = Path(__file__).resolve().parent / "docs"

DOC_SUBJECT_CODE = {
    "politics_core.md": "politics",
    "english_guide.md": "english1",
    "math_formulas.md": "math1",
    "cs408_core.md": "cs408",
    "kaoyan_strategy.md": None,
}


def _tokenize(text: str) -> list[str]:
    """Extract alphanumeric words and Chinese character unigrams/bigrams for lightweight TF-IDF."""
    lowered = text.lower()
    tokens: list[str] = re.findall(r"[a-z0-9_]+", lowered)
    cjk_runs = re.findall(r"[\u4e00-\u9fff]+", lowered)
    for run in cjk_runs:
        for ch in run:
            tokens.append(ch)
        for i in range(len(run) - 1):
            tokens.append(run[i : i + 2])
    return tokens


@dataclass
class KnowledgeChunk:
    doc_title: str
    section_title: str
    source_file: str
    subject_code: str | None
    content: str
    tf: dict[str, float]


class KaoyanKnowledgeBase:
    """Offline TF-IDF vector retriever over curated kaoyan Markdown knowledge docs."""

    def __init__(self, docs_dir: Path = DOCS_DIR):
        self.docs_dir = docs_dir
        self.chunks: list[KnowledgeChunk] = []
        self.idf: dict[str, float] = {}
        self.doc_stats: list[dict[str, Any]] = []
        self._loaded = False

    def load(self) -> None:
        if self._loaded:
            return

        raw_chunks: list[tuple[str, str, str, str | None, str, list[str]]] = []
        self.doc_stats = []

        if self.docs_dir.exists():
            for md_file in sorted(self.docs_dir.glob("*.md")):
                text = md_file.read_text(encoding="utf-8")
                lines = text.splitlines()
                doc_title = md_file.stem
                for line in lines:
                    if line.startswith("# "):
                        doc_title = line[2:].strip()
                        break

                sections: list[tuple[str, str]] = []
                current_heading = doc_title
                current_body: list[str] = []
                for line in lines:
                    if line.startswith("## "):
                        if current_body:
                            body_text = "\n".join(current_body).strip()
                            if body_text:
                                sections.append((current_heading, body_text))
                        current_heading = line[3:].strip()
                        current_body = []
                    elif not line.startswith("# "):
                        current_body.append(line)
                if current_body:
                    body_text = "\n".join(current_body).strip()
                    if body_text:
                        sections.append((current_heading, body_text))

                subj_code = DOC_SUBJECT_CODE.get(md_file.name)
                self.doc_stats.append(
                    {
                        "title": doc_title,
                        "source_path": f"app/rag/docs/{md_file.name}",
                        "subject_code": subj_code,
                        "chunk_count": len(sections),
                    }
                )
                for sec_title, body in sections:
                    tokens = _tokenize(f"{doc_title} {sec_title} {body}")
                    raw_chunks.append(
                        (doc_title, sec_title, md_file.name, subj_code, body, tokens)
                    )

        total_docs = max(len(raw_chunks), 1)
        df: Counter[str] = Counter()
        for item in raw_chunks:
            for tok in set(item[5]):
                df[tok] += 1

        self.idf = {
            tok: math.log((1 + total_docs) / (1 + freq)) + 1.0
            for tok, freq in df.items()
        }

        self.chunks = []
        for doc_title, sec_title, filename, subj_code, body, tokens in raw_chunks:
            counts = Counter(tokens)
            total_tok = max(len(tokens), 1)
            weights = {
                tok: (cnt / total_tok) * self.idf.get(tok, 1.0)
                for tok, cnt in counts.items()
            }
            norm = math.sqrt(sum(v * v for v in weights.values())) or 1.0
            normalized_tf = {tok: val / norm for tok, val in weights.items()}
            self.chunks.append(
                KnowledgeChunk(
                    doc_title=doc_title,
                    section_title=sec_title,
                    source_file=filename,
                    subject_code=subj_code,
                    content=body,
                    tf=normalized_tf,
                )
            )
        self._loaded = True

    def sync_metadata(self, db: Session) -> None:
        """Idempotently sync document metadata into knowledge_document table."""
        self.load()
        subject_by_code = {
            s.code: s.id for s in db.scalars(select(Subject)).all()
        }
        existing_by_path = {
            d.source_path: d for d in db.scalars(select(KnowledgeDocument)).all()
        }

        for doc in self.doc_stats:
            subj_id = (
                subject_by_code.get(doc["subject_code"])
                if doc["subject_code"]
                else None
            )
            existing = existing_by_path.get(doc["source_path"])
            if existing is None:
                db.add(
                    KnowledgeDocument(
                        title=doc["title"],
                        subject_id=subj_id,
                        source_path=doc["source_path"],
                        chunk_count=doc["chunk_count"],
                        status="INDEXED",
                    )
                )
            else:
                existing.title = doc["title"]
                existing.subject_id = subj_id
                existing.chunk_count = doc["chunk_count"]
                existing.status = "INDEXED"
        db.commit()

    def search(self, query: str, top_k: int = 3) -> list[dict[str, Any]]:
        """Return top-k relevant knowledge chunks above similarity threshold."""
        self.load()
        q_tokens = _tokenize(query)
        if not q_tokens or not self.chunks:
            return []

        q_counts = Counter(q_tokens)
        q_total = max(len(q_tokens), 1)
        q_weights = {
            tok: (cnt / q_total) * self.idf.get(tok, 1.0)
            for tok, cnt in q_counts.items()
            if tok in self.idf
        }
        q_norm = math.sqrt(sum(v * v for v in q_weights.values()))
        if q_norm == 0:
            return []
        q_vec = {tok: val / q_norm for tok, val in q_weights.items()}

        scored: list[tuple[float, KnowledgeChunk]] = []
        for chunk in self.chunks:
            score = sum(q_vec[t] * chunk.tf[t] for t in q_vec if t in chunk.tf)
            if score >= 0.08:
                scored.append((score, chunk))

        scored.sort(key=lambda pair: pair[0], reverse=True)
        results: list[dict[str, Any]] = []
        for score, chunk in scored[:top_k]:
            results.append(
                {
                    "title": f"{chunk.doc_title} · {chunk.section_title}",
                    "source_file": chunk.source_file,
                    "subject_code": chunk.subject_code,
                    "snippet": chunk.content[:260],
                    "score": round(score, 3),
                }
            )
        return results


knowledge_base = KaoyanKnowledgeBase()
