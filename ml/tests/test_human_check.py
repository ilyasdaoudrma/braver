"""ml/zones/human_check.py: agreement counts and validation of the human labels."""
import pandas as pd
import pytest

from ml.zones.human_check import compare


def frame(human, qwen):
    return pd.DataFrame({
        "group": [f"g{i}" for i in range(len(human))],
        "human_label": human,
        "label_qwen": qwen,
        "label_safeguard": qwen,
        "claude_label": qwen,
    })


def test_counts_agreement_and_perfect_kappa():
    r = compare(frame(["scenario", "action", "acceptation"], ["scenario", "action", "acceptation"]))
    assert r["n_filled"] == 3
    assert r["qwen"] == {"n": 3, "agree": 3, "agreement": 1.0, "kappa": 1.0}


def test_disagreement_lowers_agreement_and_empty_rows_are_skipped():
    r = compare(frame(["scenario", "action", "", "acceptation"], ["scenario", "scenario", "action", "acceptation"]))
    assert r["n_filled"] == 3
    assert r["qwen"]["n"] == 3 and r["qwen"]["agree"] == 2


def test_case_and_spaces_are_normalised():
    r = compare(frame([" Scenario ", "ACTION"], ["scenario", "action"]))
    assert r["qwen"]["agree"] == 2


def test_invalid_human_label_is_rejected():
    with pytest.raises(ValueError, match="g1"):
        compare(frame(["scenario", "maybe"], ["scenario", "action"]))
