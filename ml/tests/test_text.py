"""ml/common/text.py must match lib/text.ts on the shared cases (tests/lib/text-parity.test.ts checks the TS side)."""
import json
from pathlib import Path

import pytest

from ml.common.text import normalize

CASES = json.loads((Path(__file__).resolve().parents[1] / "common" / "normalize_cases.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("case", CASES, ids=[str(i) for i in range(len(CASES))])
def test_normalize_matches_shared_cases(case):
    assert normalize(case["input"]) == case["expected"]
