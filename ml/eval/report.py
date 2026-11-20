"""E1 step 3: metrics of the full pipeline, per held-out set and per language, + charts for the deck and the Labo page.

Inputs: ml/eval/data/device_predictions.csv (all rows, on-device layers) and llm_predictions.csv + sample_ids.csv
(the stratified sample sent to the deployed /api/sort).

Two views, never mixed:
- "device" = the app with no network (all rows): safety alert if keywords/model say danger OR the line is ambiguous
  (offline rule); zone = on-device zone model.
- "pipeline" = the app online (sampled rows only): device danger → alert without network; otherwise the LLM decides
  danger and zone; if the LLM failed, the offline rule applies.

Outputs: ml/eval/results/<date>/{metrics.json, METRICS.md, *.png} and public/labo/metrics.json (Labo page).
Usage: ml/.venv/Scripts/python -I ml/eval/report.py
"""

from __future__ import annotations

import hashlib
import json
import math
import shutil
from datetime import date
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from sklearn.metrics import confusion_matrix, precision_recall_fscore_support  # noqa: E402

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
DATA = HERE / "data"
OUT = HERE / "results" / date.today().isoformat()
LABO = ROOT / "public" / "labo" / "metrics.json"
ZONES = ["scenario", "action", "acceptation"]
INK, PAPER, SCEN, ACT, ACC, FOCUS = "#131B2C", "#EDF0F4", "#5B3FD6", "#B93D0A", "#0B7065", "#2D6CDF"
SET_NAMES = {
    "safety_test": "Test sécurité (public + traduit + synthétique)",
    "zones_test": "Test zones (synthétique)",
    "darija_synthetic": "Darija synthétique (généré par IA)",
    "darija_handwritten": "Darija écrit à la main",
    "darija_claude": "Darija écrit par Claude (IA, sans autre modèle)",
}


def safety_metrics(y: np.ndarray, pred: np.ndarray) -> dict:
    p, r, f, s = precision_recall_fscore_support(y, pred, labels=[0, 1], zero_division=0)
    return {
        "n": int(len(y)),
        "accuracy": float((y == pred).mean()) if len(y) else None,
        "danger": {"precision": float(p[1]), "recall": float(r[1]), "f1": float(f[1]), "support": int(s[1])},
        "no_danger": {"precision": float(p[0]), "recall": float(r[0]), "f1": float(f[0]), "support": int(s[0])},
        "macro_f1": float(f.mean()),
        "confusion": confusion_matrix(y, pred, labels=[0, 1]).tolist(),
    }


def zone_metrics(y: np.ndarray, pred: np.ndarray) -> dict:
    p, r, f, s = precision_recall_fscore_support(y, pred, labels=ZONES, zero_division=0)
    return {
        "n": int(len(y)),
        "accuracy": float((y == pred).mean()) if len(y) else None,
        "per_class": {z: {"precision": float(p[i]), "recall": float(r[i]), "f1": float(f[i]), "support": int(s[i])} for i, z in enumerate(ZONES)},
        "macro_f1": float(f.mean()),
        "confusion": confusion_matrix(y, pred, labels=ZONES).tolist(),
    }


def by_lang(df: pd.DataFrame, fn, ycol: str, pcol: str) -> dict:
    out = {"all": fn(df[ycol].to_numpy(), df[pcol].to_numpy())}
    for lang, g in df.groupby("lang"):
        out[str(lang)] = fn(g[ycol].to_numpy(), g[pcol].to_numpy())
    return out


def load() -> pd.DataFrame:
    dev = pd.read_csv(DATA / "device_predictions.csv", dtype={"label_danger": "string", "label_zone": "string"})
    dev["device_alert"] = dev["safety_level"].isin(["danger", "check"]).astype(int)
    llm_path = DATA / "llm_predictions.csv"
    if llm_path.exists():
        llm = pd.read_csv(llm_path)
        sample = pd.read_csv(DATA / "sample_ids.csv")
        # Join on set + id + text hash: an id reused with edited text (T1 was filtered after the run) never matches.
        dev["text_sha"] = dev["text"].map(lambda t: hashlib.sha256(str(t).encode("utf-8")).hexdigest()[:16])
        dev = dev.merge(llm, on=["set", "id", "text_sha"], how="left")
        dev["sampled"] = dev.set_index(["set", "id"]).index.isin(sample.set_index(["set", "id"]).index)
    else:
        dev["sampled"] = False
        for col in ("llm_ok", "llm_danger", "llm_zone", "model", "client_ms", "server_ms"):
            dev[col] = np.nan
    ok = dev["llm_ok"] == 1
    stopped = dev["safety_level"] == "danger"
    # Rows the LLM skipped (request failed or line missing in its answer) are scored exactly as the app handles them:
    # an ambiguous ("check") line becomes an alert, any other line keeps its on-device card. Their count is reported.
    dev["llm_missing"] = dev["sampled"] & ~stopped & ~ok
    # Option B (20 Nov): an ambiguous line at or above the model's `keep` score stays an alert even if the LLM says no.
    model = json.loads((ROOT / "public" / "models" / "safety.json").read_text(encoding="utf-8"))
    keep = model.get("keep", float("inf"))
    firm = (dev["safety_level"] == "check") & (pd.to_numeric(dev["safety_score"], errors="coerce").fillna(0) >= keep)
    llm_says = dev["llm_danger"].fillna(0).astype(int) | firm.astype(int)
    dev["pipeline_alert"] = np.where(stopped, 1, np.where(ok, llm_says, dev["device_alert"])).astype(int)
    dev["pipeline_zone"] = np.where(ok, dev["llm_zone"].fillna(""), dev["zone_device"])
    return dev


def latency(df: pd.DataFrame) -> dict:
    sent = df[df["llm_ok"].notna()]
    if sent.empty:
        return {}
    req = sent.drop_duplicates(["client_ms", "server_ms", "model"])  # one row per request
    ms = req["client_ms"].astype(float)
    return {
        "requests": int(len(req)),
        "client_ms_p50": float(np.percentile(ms, 50)),
        "client_ms_p90": float(np.percentile(ms, 90)),
        "answered_by": {str(k): int(v) for k, v in req["model"].fillna("none (on-device)").replace("", "none (on-device)").value_counts().items()},
    }


def model_reports() -> dict:
    """Test metrics of the on-device models themselves (M1, M2), as written by their train.py."""
    out = {}
    for name in ("safety", "zones"):
        path = ROOT / "ml" / name / "results" / "metrics.json"
        if path.exists():
            m = json.loads(path.read_text(encoding="utf-8"))
            out[name] = {k: m[k] for k in ("model", "train_n", "val_n", "test_sha256", "test", "test_by_lang") if k in m}
            for k in ("threshold", "high"):
                if k in m:
                    out[name][k] = m[k]
    human = ROOT / "ml" / "zones" / "results" / "human_check.json"
    if "zones" in out and human.exists():
        h = json.loads(human.read_text(encoding="utf-8"))
        out["zones"]["human_check"] = {"blind": h["blind"], "qwen": h["qwen"], "disagreements_in_test": h["disagreements_in_test"]}
    return out


def plot_confusion(matrix: list[list[int]], labels: list[str], title: str, path: Path, color: str) -> None:
    m = np.array(matrix)
    fig, ax = plt.subplots(figsize=(4.2, 3.6), dpi=160)
    fig.patch.set_facecolor(PAPER)
    ax.imshow(m, cmap=matplotlib.colors.LinearSegmentedColormap.from_list("b", [PAPER, color]))
    for (i, j), v in np.ndenumerate(m):
        ax.text(j, i, str(v), ha="center", va="center", color=INK if m[i, j] < m.max() * 0.6 else PAPER, fontsize=12, fontweight="bold")
    ax.set_xticks(range(len(labels)), labels, color=INK)
    ax.set_yticks(range(len(labels)), labels, color=INK)
    ax.set_xlabel("prédit", color=INK)
    ax.set_ylabel("vrai", color=INK)
    ax.set_title(title, color=INK, fontsize=10)
    fig.tight_layout()
    fig.savefig(path, facecolor=PAPER)
    plt.close(fig)


def plot_bars(values: dict[str, float], title: str, path: Path, color: str) -> None:
    fig, ax = plt.subplots(figsize=(5, 3), dpi=160)
    fig.patch.set_facecolor(PAPER)
    ax.set_facecolor(PAPER)
    names = list(values)
    ax.bar(names, [values[k] for k in names], color=color)
    for i, k in enumerate(names):
        ax.text(i, values[k] + 0.02, f"{values[k]:.3f}".replace(".", ","), ha="center", color=INK, fontsize=9)
    ax.set_ylim(0, 1.1)
    ax.set_title(title, color=INK, fontsize=10)
    ax.tick_params(colors=INK)
    for s in ax.spines.values():
        s.set_color("#C9D0DA")
    fig.tight_layout()
    fig.savefig(path, facecolor=PAPER)
    plt.close(fig)


def main() -> None:
    df = load()
    OUT.mkdir(parents=True, exist_ok=True)
    report: dict = {"date": date.today().isoformat(), "sets": {}, "latency": latency(df), "models": model_reports()}
    for set_name, g in df.groupby("set"):
        entry: dict = {"name": SET_NAMES.get(str(set_name), str(set_name)), "n": int(len(g)), "by_source": g["source"].value_counts().to_dict(),
                       "llm_missing": int(g["llm_missing"].sum())}
        sd = g[g["label_danger"].isin(["0", "1"])].assign(y=lambda d: d["label_danger"].astype(int))
        if len(sd):
            entry["safety_device"] = by_lang(sd, safety_metrics, "y", "device_alert")
            sp = sd[sd["sampled"]]
            if len(sp):
                entry["safety_pipeline"] = by_lang(sp, safety_metrics, "y", "pipeline_alert")
                fn = sp[(sp["y"] == 1) & (sp["pipeline_alert"] == 0)]
                entry["safety_pipeline_false_negatives"] = fn[["id", "lang", "text"]].to_dict("records")
        zd = g[g["label_zone"].isin(ZONES)]
        if len(zd):
            entry["zones_device"] = by_lang(zd, zone_metrics, "label_zone", "zone_device")
            zp = zd[zd["sampled"] & (zd["pipeline_alert"] == 0)]
            if len(zp):
                entry["zones_pipeline"] = by_lang(zp, zone_metrics, "label_zone", "pipeline_zone")
        report["sets"][str(set_name)] = entry

    # Charts for the deck / Labo
    s = report["sets"].get("safety_test", {})
    if "safety_pipeline" in s:
        plot_confusion(s["safety_pipeline"]["all"]["confusion"], ["pas danger", "danger"], f"Sécurité, app en ligne (n = {s['safety_pipeline']['all']['n']})", OUT / "safety_pipeline_confusion.png", ACC)
        plot_bars({k: v["danger"]["recall"] for k, v in s["safety_pipeline"].items()}, "Rappel danger par langue (app en ligne)", OUT / "safety_recall_by_lang.png", ACC)
    if "safety_device" in s:
        plot_confusion(s["safety_device"]["all"]["confusion"], ["pas danger", "danger"], f"Sécurité, sur le téléphone (n = {s['safety_device']['all']['n']})", OUT / "safety_device_confusion.png", FOCUS)
    z = report["sets"].get("zones_test", {})
    for view, color in (("zones_device", SCEN), ("zones_pipeline", ACT)):
        if view in z:
            label = "sur le téléphone" if view == "zones_device" else "app en ligne"
            plot_confusion(z[view]["all"]["confusion"], ZONES, f"Zones, {label} (n = {z[view]['all']['n']})", OUT / f"{view}_confusion.png", color)

    (OUT / "metrics.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    LABO.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(OUT / "metrics.json", LABO)
    write_markdown(report)
    print(f"wrote {OUT.relative_to(ROOT)} and {LABO.relative_to(ROOT)}")


def f4(x: float | None) -> str:
    # Truncated, never rounded up (CLAUDE.md): 0.94088 -> "0.9408".
    return "-" if x is None else f"{math.floor(x * 10000 + 1e-9) / 10000:.4f}"


def write_markdown(r: dict) -> None:
    L = [f"# BRAVER — evaluation of the full pipeline ({r['date']})", "",
         "Held-out sets only. **device** = the app with no network (all rows; an ambiguous line alerts). "
         "**pipeline** = the app online on a stratified sample sent to the deployed `/api/sort` (gpt-oss-20b, fallback 120b). "
         "n is given for every row; numbers are truncated, never rounded up. The pipeline sample is stratified (12 rows per "
         "set × language × label), so its precision does not reflect real prevalence. Zones (pipeline) are scored only on lines "
         "the app did not stop for safety (a stopped line shows no zone).", ""]
    lat = r.get("latency")
    if lat:
        L += [f"Latency of `/api/sort` per request of up to 12 lines (client round trip, {lat['requests']} requests): p50 {lat['client_ms_p50']:.0f} ms, p90 {lat['client_ms_p90']:.0f} ms. "
              f"Answered by: " + ", ".join(f"{k} {v}" for k, v in lat["answered_by"].items()) + ".", ""]
    for key, e in r["sets"].items():
        L += [f"## {e['name']} (`{key}`, n = {e['n']})", ""]
        if e.get("llm_missing"):
            L += [f"{e['llm_missing']} sampled line(s) got no LLM answer (line missing in the answer or request failed): scored as the app does (ambiguous line → alert, otherwise the on-device card).", ""]
        for view in ("safety_device", "safety_pipeline"):
            if view in e:
                L += [f"**Safety — {view.split('_')[1]}**", "", "| Lang | n | Acc. | Danger P | Danger R | Danger F1 | No-danger P | No-danger R | Macro F1 |", "|---|---|---|---|---|---|---|---|---|"]
                for lang, m in e[view].items():
                    L.append(f"| {lang} | {m['n']} | {f4(m['accuracy'])} | {f4(m['danger']['precision'])} | {f4(m['danger']['recall'])} | {f4(m['danger']['f1'])} | {f4(m['no_danger']['precision'])} | {f4(m['no_danger']['recall'])} | {f4(m['macro_f1'])} |")
                cm = e[view]["all"]["confusion"]
                L += ["", f"Confusion (rows true, cols predicted): no_danger [{cm[0][0]}, {cm[0][1]}] · danger [{cm[1][0]}, {cm[1][1]}]", ""]
        for view in ("zones_device", "zones_pipeline"):
            if view in e:
                L += [f"**Zones — {view.split('_')[1]}**", "", "| Lang | n | Acc. | Macro F1 | " + " | ".join(f"{z} F1" for z in ZONES) + " |", "|---|---|---|---|---|---|---|"]
                for lang, m in e[view].items():
                    L.append(f"| {lang} | {m['n']} | {f4(m['accuracy'])} | {f4(m['macro_f1'])} | " + " | ".join(f4(m["per_class"][z]["f1"]) for z in ZONES) + " |")
                L += ["", "Confusion (rows true, cols predicted; " + ", ".join(ZONES) + "): " + str(e[view]["all"]["confusion"]), ""]
        if e.get("safety_pipeline_false_negatives"):
            L += ["Missed danger lines (pipeline):", ""] + [f"- `{x['lang']}` {x['text']}" for x in e["safety_pipeline_false_negatives"]] + [""]
    (OUT / "METRICS.md").write_text("\n".join(L) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
