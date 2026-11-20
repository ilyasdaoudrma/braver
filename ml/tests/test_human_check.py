"""ml/zones/human_check.py: agreement counts and validation of the human labels."""
import pandas as pd
import pytest

from ml.zones.human_check import compare, split_of


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


def test_empty_ai_label_is_excluded_only_for_that_labeller():
    df = frame(["scenario", "action", "acceptation"], ["scenario", "action", "acceptation"]).assign(
        label_safeguard=["scenario", "", "scenario"]
    )
    r = compare(df)
    assert r["safeguard"]["n"] == 2 and r["safeguard"]["agree"] == 1
    assert r["qwen"]["n"] == 3


def test_kappa_nan_becomes_none():
    r = compare(frame(["action", "action"], ["action", "action"]))
    assert r["qwen"]["agree"] == 2 and r["qwen"]["kappa"] is None


def write_splits(tmp_path, train, val, test):
    for name, groups in (("train", train), ("val", val), ("test", test)):
        pd.DataFrame({"group": groups, "text": "x"}).to_csv(tmp_path / f"{name}.csv", index=False)


def test_split_of_finds_each_group(tmp_path):
    write_splits(tmp_path, ["a", "b"], ["c"], ["d"])
    assert split_of({"a", "c", "d"}, tmp_path) == {"a": "train", "c": "val", "d": "test"}


def test_split_of_raises_on_group_in_no_split(tmp_path):
    write_splits(tmp_path, ["a"], ["c"], ["d"])
    with pytest.raises(ValueError, match="zz"):
        split_of({"a", "zz"}, tmp_path)
