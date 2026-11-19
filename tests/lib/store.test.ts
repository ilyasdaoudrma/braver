import { describe, expect, it } from "vitest";
import { createStore, defaults, STORE_PREFIX, type KeyValueStorage } from "@/lib/store";

function memory(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

describe("store", () => {
  it("returns defaults for every key when storage is empty", () => {
    const s = createStore(() => ({ local: memory(), session: memory() }));
    const d = defaults();
    for (const k of Object.keys(d) as (keyof typeof d)[]) expect(s.get(k)).toEqual(d[k]);
  });

  it("writes to sessionStorage until consent is given, then moves everything to localStorage", () => {
    const local = memory();
    const session = memory();
    const s = createStore(() => ({ local, session }));
    s.set("onboarded", true);
    expect(session.data.get(STORE_PREFIX + "onboarded")).toBe("true");
    expect(local.data.size).toBe(0);

    s.setConsent("device");
    expect(local.data.get(STORE_PREFIX + "onboarded")).toBe("true");
    expect(JSON.parse(local.data.get(STORE_PREFIX + "settings") ?? "{}").consent).toBe("device");
    expect(session.data.size).toBe(0);

    s.setConsent("session");
    expect(local.data.size).toBe(0);
    expect(session.data.get(STORE_PREFIX + "onboarded")).toBe("true");
  });

  it("reads back what a previous visit stored on the device", () => {
    const local = memory();
    const first = createStore(() => ({ local, session: memory() }));
    first.setConsent("device");
    first.update("moods", (m) => [...m, { id: "1", at: "2026-11-19T10:00:00Z", level: 3, emotions: [] }]);
    const second = createStore(() => ({ local, session: memory() }));
    expect(second.get("moods")).toHaveLength(1);
  });

  it("update is immutable", () => {
    const s = createStore(() => ({ local: memory(), session: memory() }));
    const before = s.get("worries");
    s.update("worries", (w) => [...w]);
    expect(s.get("worries")).not.toBe(before);
    expect(before).toEqual([]);
  });

  it("ignores corrupt or wrongly shaped values and fills missing settings", () => {
    const session = memory();
    session.setItem(STORE_PREFIX + "worries", "{not json");
    session.setItem(STORE_PREFIX + "replays", JSON.stringify({ a: 1 }));
    session.setItem(STORE_PREFIX + "settings", JSON.stringify({ tone: "direct" }));
    const s = createStore(() => ({ local: memory(), session }));
    expect(s.get("worries")).toEqual([]);
    expect(s.get("replays")).toEqual([]);
    expect(s.get("settings")).toEqual({ ...defaults().settings, tone: "direct" });
  });

  it("keeps working in memory when storage is unavailable", () => {
    const s = createStore(() => ({ local: null, session: null }));
    s.set("onboarded", true);
    expect(s.get("onboarded")).toBe(true);
  });

  it("notifies subscribers and wipes everything", () => {
    const local = memory();
    const s = createStore(() => ({ local, session: memory() }));
    let calls = 0;
    const off = s.subscribe(() => calls++);
    s.setConsent("device");
    s.set("onboarded", true);
    s.wipe();
    off();
    s.set("onboarded", true);
    expect(calls).toBe(3);
    expect(local.data.size).toBe(0);
  });
});
