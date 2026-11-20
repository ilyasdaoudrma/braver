"""Python twin of lib/text.ts `normalize`. Must stay byte-for-byte identical (parity tests in M1/M2)."""

from __future__ import annotations

import re
import unicodedata

_LATIN_DIACRITICS = re.compile("[̀-ͯ]")
_ARABIC_MARKS = re.compile("[ً-ْٰـ]")
_ARABIC_VARIANTS = (("[أإآٱ]", "ا"), ("ى", "ي"), ("ة", "ه"), ("ؤ", "و"), ("ئ", "ي"))
_QUOTES = re.compile("[’`´]")
# JS: /[^a-z0-9ء-ي\s]/g  (JS \s = Unicode white space, same set as Python's str.isspace for these inputs)
_KEEP = re.compile("[^a-z0-9ء-ي\\s]")
_SPACES = re.compile("\\s+")


def normalize(text: object) -> str:
    """Lowercase, strip accents and Arabic diacritics, unify Arabic letter variants, keep letters/digits only.
    Result has one leading and one trailing space (same as lib/text.ts)."""
    s = ("" if text is None else str(text)).lower()
    s = _LATIN_DIACRITICS.sub("", unicodedata.normalize("NFD", s))
    s = _ARABIC_MARKS.sub("", s)
    for pattern, repl in _ARABIC_VARIANTS:
        s = re.sub(pattern, repl, s)
    s = _QUOTES.sub("'", s)
    s = _KEEP.sub(" ", s)
    return f" {_SPACES.sub(' ', s).strip()} "
