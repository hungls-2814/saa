"""Tests for _lang_lib.py — language resolution helpers."""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from _lang_lib import looks_unusual, normalize_lang, resolve_docs_root


class TestNormalizeLang:
    def test_none_returns_en(self):
        assert normalize_lang(None) == "en"

    def test_empty_returns_en(self):
        assert normalize_lang("") == "en"

    def test_whitespace_returns_en(self):
        assert normalize_lang("   ") == "en"

    def test_uppercase_lowered(self):
        assert normalize_lang("VI") == "vi"

    def test_mixed_case(self):
        assert normalize_lang("Pt-BR") == "pt-br"

    def test_already_lowercase(self):
        assert normalize_lang("jp") == "jp"

    def test_strips_whitespace(self):
        assert normalize_lang("  vi  ") == "vi"

    def test_en_passthrough(self):
        assert normalize_lang("en") == "en"


class TestResolveDocsRoot:
    def test_en_returns_docs(self):
        assert resolve_docs_root("en") == "docs"

    def test_vi_returns_docs_vi(self):
        assert resolve_docs_root("vi") == "docs/vi"

    def test_uppercase_normalized(self):
        assert resolve_docs_root("VI") == "docs/vi"

    def test_pt_br(self):
        assert resolve_docs_root("pt-br") == "docs/pt-br"

    def test_none_defaults_en(self):
        assert resolve_docs_root(None) == "docs"

    def test_empty_defaults_en(self):
        assert resolve_docs_root("") == "docs"


class TestNormalizeLangPathTraversal:
    def test_slash_rejected(self):
        with pytest.raises(ValueError, match="unsafe path characters"):
            normalize_lang("../etc")

    def test_backslash_rejected(self):
        with pytest.raises(ValueError, match="unsafe path characters"):
            normalize_lang("ja\\..\\etc")

    def test_dot_dot_rejected(self):
        with pytest.raises(ValueError, match="unsafe path characters"):
            normalize_lang("..")

    def test_absolute_path_rejected(self):
        with pytest.raises(ValueError, match="unsafe path characters"):
            normalize_lang("/abs")

    def test_hidden_traversal_rejected(self):
        with pytest.raises(ValueError, match="unsafe path characters"):
            normalize_lang("ja/../../")


class TestLooksUnusual:
    def test_standard_two_letter(self):
        assert looks_unusual("en") is False
        assert looks_unusual("vi") is False
        assert looks_unusual("jp") is False

    def test_three_letter(self):
        assert looks_unusual("vie") is False

    def test_with_region(self):
        assert looks_unusual("pt-br") is False
        assert looks_unusual("zh-hans") is False

    def test_single_char_unusual(self):
        assert looks_unusual("x") is True

    def test_numbers_only(self):
        assert looks_unusual("123") is True

    def test_special_chars(self):
        assert looks_unusual("en_US") is True

    def test_none_normalized_to_en(self):
        assert looks_unusual(None) is False

    def test_path_traversal_is_unusual(self):
        assert looks_unusual("../etc") is True
        assert looks_unusual("/abs") is True
