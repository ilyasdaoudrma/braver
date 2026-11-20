import { describe, expect, it } from "vitest";
import cases from "../../ml/common/normalize_cases.json";
import { normalize } from "@/lib/text";

// ml/common/text.py must give exactly the same output (ml/tests/test_text.py checks the same file).
describe("normalize parity with ml/common/text.py", () => {
  it.each(cases as { input: string; expected: string }[])("$input", ({ input, expected }) => {
    expect(normalize(input)).toBe(expected);
  });
});
