// On-device text models exported by ml/common/charmodel.py (TF-IDF char_wb 2–5 n-grams + logistic regression).
// Same features and same probabilities as Python: parity tests in tests/lib/*-parity.test.ts (|Δ| < 1e-6).
import { normalize } from "./text";

export interface CharModel {
  kind: "char_wb_tfidf_logreg";
  version: string;
  ngram: [number, number];
  sublinear_tf: boolean;
  classes: string[];
  terms: string[];
  idf: number[];
  /** One row for a binary model (positive class = classes[1]), one row per class otherwise. */
  coef: number[][];
  intercept: number[];
}

export interface LoadedModel<M extends CharModel = CharModel> {
  model: M;
  index: Map<string, number>;
}

export function prepareModel<M extends CharModel>(model: M): LoadedModel<M> {
  const index = new Map<string, number>();
  model.terms.forEach((t, i) => index.set(t, i));
  return { model, index };
}

/** Same as sklearn's char_wb analyzer on an already normalised text. */
export function charWbNgrams(norm: string, minN: number, maxN: number): string[] {
  const out: string[] = [];
  for (const word of norm.split(/\s+/).filter(Boolean)) {
    const w = ` ${word} `;
    for (let n = minN; n <= maxN; n++) {
      let offset = 0;
      out.push(w.slice(offset, offset + n));
      while (offset + n < w.length) {
        offset++;
        out.push(w.slice(offset, offset + n));
      }
      if (offset === 0) break;
    }
  }
  return out;
}

/** Class probabilities, in the order of `model.classes`. */
export function predictProba({ model, index }: LoadedModel, text: string): number[] {
  const counts = new Map<number, number>();
  for (const g of charWbNgrams(normalize(text), model.ngram[0], model.ngram[1])) {
    const i = index.get(g);
    if (i !== undefined) counts.set(i, (counts.get(i) ?? 0) + 1);
  }
  const weights = new Map<number, number>();
  let sq = 0;
  for (const [i, c] of counts) {
    const tf = model.sublinear_tf ? 1 + Math.log(c) : c;
    const v = tf * model.idf[i];
    weights.set(i, v);
    sq += v * v;
  }
  const norm = Math.sqrt(sq) || 1;
  const scores = model.coef.map((row, k) => {
    let s = model.intercept[k];
    for (const [i, v] of weights) s += (row[i] * v) / norm;
    return s;
  });
  if (scores.length === 1) {
    const p = 1 / (1 + Math.exp(-scores[0]));
    return [1 - p, p];
  }
  const m = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - m));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / total);
}
