"use client";
// Embeddings in the browser (Groq has no embedding model): Xenova/multilingual-e5-small with transformers.js,
// downloaded only when the person turns memory on (≈ 118 MB once, then cached by the browser).
// Downloads: the model weights from huggingface.co and the ONNX runtime (.wasm) from cdn.jsdelivr.net — both see the
// device's IP like any download. The worries themselves are never sent: embeddings are computed and stored on the device.

export const EMBED_MODEL = "Xenova/multilingual-e5-small";
export const EMBED_DOWNLOAD_MB = 118;

type Extractor = (texts: string[], opts: { pooling: "mean"; normalize: boolean }) => Promise<{ tolist(): number[][] }>;

let extractor: Promise<Extractor> | null = null;

/** Starts (once) the model download; rejects if it cannot load (offline, old browser). */
export function loadEmbedder(onProgress?: (percent: number) => void): Promise<Extractor> {
  extractor ??= (async () => {
    const { pipeline, env } = await import("@huggingface/transformers");
    env.allowLocalModels = false;
    const pipe = await pipeline("feature-extraction", EMBED_MODEL, {
      dtype: "q8",
      progress_callback: (p: { status?: string; progress?: number }) => {
        if (p.status === "progress" && typeof p.progress === "number") onProgress?.(p.progress);
      },
    });
    return pipe as unknown as Extractor;
  })().catch((err: unknown) => {
    extractor = null; // allow a retry later
    throw err;
  });
  return extractor;
}

/** e5 expects a "query: " prefix; vectors are mean-pooled and L2-normalised. */
export async function embed(texts: readonly string[]): Promise<number[][]> {
  if (!texts.length) return [];
  const run = await loadEmbedder();
  const out = await run(
    texts.map((t) => `query: ${t}`),
    { pooling: "mean", normalize: true },
  );
  return out.tolist();
}
