"""Language resolution helpers for rebuild-spec output language support.

Stdlib only, mirrors _slug_lib.py style.
"""
from __future__ import annotations

import re

_LANG_RE = re.compile(r"^[a-z]{2,3}(-[a-z0-9]{2,8})*$")


_PATH_UNSAFE_RE = re.compile(r"[/\\.]")


def normalize_lang(code: str | None) -> str:
    """Normalize a language code: None/empty → "en"; else lowercase+trim.

    Raises ValueError if the code contains path-separator characters (/, \\, .)
    to prevent path-traversal when used in docs/<lang>/ construction.
    """
    if not code or not code.strip():
        return "en"
    normalized = code.strip().lower()
    if _PATH_UNSAFE_RE.search(normalized):
        raise ValueError(
            f"language code contains unsafe path characters: {code!r}"
        )
    return normalized


def resolve_docs_root(lang: str) -> str:
    """Return docs root path for a language: "en" → "docs"; else "docs/<lang>"."""
    lang = normalize_lang(lang)
    if lang == "en":
        return "docs"
    return f"docs/{lang}"


def looks_unusual(lang: str) -> bool:
    """Return True if the normalized lang code looks non-standard (warn, don't abort).

    Catches ValueError from normalize_lang (path-unsafe codes) and treats them as unusual.
    """
    try:
        return not bool(_LANG_RE.match(normalize_lang(lang)))
    except ValueError:
        return True
