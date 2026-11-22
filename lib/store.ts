// On-device state of BRAVER. Nothing leaves the phone.
// Consent "device" → localStorage; otherwise (session / not asked yet) → sessionStorage.
// Storage blocked or broken → in-memory only, the app keeps working.
// Shared file: add a NEW key with a default value; never rename a key.
import { DEFAULT_AI_SETTINGS, type AiSettings } from "./ai/providers";
import type {
  BreathingSession,
  Consent,
  EmbeddingEntry,
  Gad7Entry,
  Mood,
  ReplayEntry,
  Settings,
  Worry,
} from "./types";

export interface StoreData {
  worries: Worry[];
  replays: ReplayEntry[];
  moods: Mood[];
  gad7: Gad7Entry[];
  breathing: BreathingSession[];
  embeddings: EmbeddingEntry[];
  settings: Settings;
  onboarded: boolean;
  /** Bring your own AI key (provider, key, model). Stays on this device like everything else. */
  ai: AiSettings;
}

export type StoreKey = keyof StoreData;

export const STORE_PREFIX = "braver:";

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  consent: null,
  tone: "doux",
  forceLocal: false,
  demo: false,
  memory: false,
});

export function defaults(): StoreData {
  return {
    worries: [],
    replays: [],
    moods: [],
    gad7: [],
    breathing: [],
    embeddings: [],
    settings: { ...DEFAULT_SETTINGS },
    onboarded: false,
    ai: { ...DEFAULT_AI_SETTINGS },
  };
}

export const STORE_KEYS = Object.keys(defaults()) as StoreKey[];

/** Minimal Storage surface, so tests can pass fakes. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface StorageBackends {
  local: KeyValueStorage | null;
  session: KeyValueStorage | null;
}

function safeStorage(get: () => Storage): KeyValueStorage | null {
  try {
    const s = get();
    const probe = `${STORE_PREFIX}__probe`;
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function browserBackends(): StorageBackends {
  if (typeof window === "undefined") return { local: null, session: null };
  return { local: safeStorage(() => window.localStorage), session: safeStorage(() => window.sessionStorage) };
}

/** Keeps a stored value only if it has the same shape as the default (arrays stay arrays, settings get missing fields). */
function coerce<K extends StoreKey>(key: K, raw: unknown): StoreData[K] {
  const fallback = defaults()[key];
  if (Array.isArray(fallback)) return (Array.isArray(raw) ? raw : fallback) as StoreData[K];
  if (key === "settings") {
    const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    return { ...DEFAULT_SETTINGS, ...obj } as StoreData[K];
  }
  if (key === "ai") {
    const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const str = (v: unknown, d: string): string => (typeof v === "string" ? v : d);
    return {
      provider: str(obj.provider, DEFAULT_AI_SETTINGS.provider),
      key: str(obj.key, ""),
      model: str(obj.model, ""),
      baseUrl: str(obj.baseUrl, ""),
    } as StoreData[K];
  }
  return (typeof raw === typeof fallback ? raw : fallback) as StoreData[K];
}

function readRaw(storage: KeyValueStorage | null, key: StoreKey): unknown {
  if (!storage) return undefined;
  try {
    const s = storage.getItem(STORE_PREFIX + key);
    return s === null ? undefined : JSON.parse(s);
  } catch {
    return undefined;
  }
}

export interface Store {
  get<K extends StoreKey>(key: K): StoreData[K];
  set<K extends StoreKey>(key: K, value: StoreData[K]): void;
  /** Immutable update: `fn` receives the current value and returns the new one. */
  update<K extends StoreKey>(key: K, fn: (current: StoreData[K]) => StoreData[K]): void;
  /** Moves every key to the storage that matches the new consent. */
  setConsent(consent: Consent): void;
  /** Erases everything (both storages and memory). */
  wipe(): void;
  subscribe(listener: () => void): () => void;
}

export function createStore(getBackends: () => StorageBackends = browserBackends): Store {
  const cache = new Map<StoreKey, unknown>();
  const listeners = new Set<() => void>();
  let backends: StorageBackends | null = null;

  const io = (): StorageBackends => (backends ??= getBackends());
  const emit = (): void => listeners.forEach((l) => l());

  const consent = (): Consent => {
    if (cache.has("settings")) return (cache.get("settings") as Settings).consent;
    const { local, session } = io();
    const raw = readRaw(local, "settings") ?? readRaw(session, "settings");
    return coerce("settings", raw).consent;
  };
  const active = (): KeyValueStorage | null => (consent() === "device" ? io().local : io().session);
  const other = (): KeyValueStorage | null => (consent() === "device" ? io().session : io().local);

  /** True when the value is safely stored. On failure (quota, blocked) the value stays in memory only. */
  const write = (storage: KeyValueStorage | null, key: StoreKey, value: unknown): boolean => {
    if (!storage) return false;
    try {
      storage.setItem(STORE_PREFIX + key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  };
  const remove = (storage: KeyValueStorage | null, key: StoreKey): void => {
    try {
      storage?.removeItem(STORE_PREFIX + key);
    } catch {
      /* ignore */
    }
  };

  function get<K extends StoreKey>(key: K): StoreData[K] {
    if (cache.has(key)) return cache.get(key) as StoreData[K];
    const value = coerce(key, readRaw(active(), key));
    cache.set(key, value);
    return value;
  }

  /** Writes one key to the active storage; the copy in the other storage is removed only once the write succeeded. */
  const persist = (key: StoreKey): void => {
    if (write(active(), key, cache.get(key))) remove(other(), key);
  };

  /** Applies new settings; when consent changes, every key moves to the matching storage. */
  function applySettings(next: Settings): void {
    const consentChanged = next.consent !== consent();
    const snapshot = consentChanged ? STORE_KEYS.map((k) => [k, get(k)] as const) : [];
    snapshot.forEach(([k, v]) => cache.set(k, v));
    cache.set("settings", next);
    for (const k of consentChanged ? STORE_KEYS : (["settings"] as StoreKey[])) persist(k);
  }

  function set<K extends StoreKey>(key: K, value: StoreData[K]): void {
    if (key === "settings") applySettings(value as Settings);
    else {
      cache.set(key, value);
      persist(key);
    }
    emit();
  }

  return {
    get,
    set,
    update: (key, fn) => set(key, fn(get(key))),
    setConsent(next) {
      set("settings", { ...get("settings"), consent: next });
    },
    wipe() {
      const { local, session } = io();
      for (const k of STORE_KEYS) {
        remove(local, k);
        remove(session, k);
      }
      cache.clear();
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** The app-wide store (browser). Use `useStoreValue` in components. */
export const store: Store = createStore();

export const uid = (): string => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
