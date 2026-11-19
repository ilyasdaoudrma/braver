// Score de calibration : à quel point les peurs prédisent-elles la réalité ?
// Abscisse : certitude avant. Ordonnée : part des fois où le pire est arrivé.

const VALUE = { oui: 1, en_partie: 0.5, non: 0 };

export function calibration(replays) {
  const done = replays.filter((r) => r.status === "fait" && r.pire in VALUE);
  const buckets = new Map();
  for (const r of done) {
    const c = Math.min(100, Math.max(10, Math.round(r.certitude / 10) * 10));
    const b = buckets.get(c) || { certitude: c, n: 0, pire: 0, oui: 0 };
    b.n++;
    b.pire += VALUE[r.pire];
    if (r.pire === "oui") b.oui++;
    buckets.set(c, b);
  }
  const points = [...buckets.values()].sort((a, b) => a.certitude - b.certitude).map((b) => ({ ...b, taux: b.pire / b.n }));
  const top = [...points].sort((a, b) => b.n - a.n || b.certitude - a.certitude)[0] || null;
  return { done, points, top };
}

export function calibrationSVG(points) {
  const W = 560, H = 300, L = 66, R = 16, Tp = 22, B = 40;
  const x = (c) => L + ((c - 10) / 90) * (W - L - R);
  const y = (v) => Tp + (1 - v) * (H - Tp - B);
  let grid = "";
  for (let v = 0; v <= 1.001; v += 0.25) {
    grid += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/>`;
    grid += `<text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" class="tick">${Math.round(v * 100)} %</text>`;
  }
  for (let c = 10; c <= 100; c += 10) grid += `<text x="${x(c)}" y="${H - B + 18}" text-anchor="middle" class="tick">${c} %</text>`;
  const ideal = `<line x1="${x(10)}" y1="${y(0.1)}" x2="${x(100)}" y2="${y(1)}" class="ideal"/>`;
  const path = points.length > 1 ? `<polyline points="${points.map((p) => `${x(p.certitude)},${y(p.taux)}`).join(" ")}" class="line"/>` : "";
  const dots = points
    .map((p) => {
      const r = 6 + Math.min(10, p.n * 1.2);
      return `<g><circle cx="${x(p.certitude)}" cy="${y(p.taux)}" r="${r}" class="dot"/><text x="${x(p.certitude)}" y="${y(p.taux) - r - 6}" text-anchor="middle" class="dotlabel">${p.oui ? `${p.oui}/${p.n}` : `0/${p.n}`}</text></g>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${W} ${H}" class="calib" role="img" aria-label="Score de calibration des peurs">
    ${grid}${ideal}${path}${dots}
    <text x="${(L + W - R) / 2}" y="${H - 4}" text-anchor="middle" class="axis">Sûr avant (certitude)</text>
    <text transform="translate(13 ${(Tp + H - B) / 2}) rotate(-90)" text-anchor="middle" class="axis">Le pire est arrivé</text>
  </svg>`;
}
