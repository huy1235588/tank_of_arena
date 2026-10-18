import { describe, expect, it } from "vitest";
import { previewMitigatedDamage } from "../index";

describe("example deep module", () => {
    it("computes mitigated damage through the public entry point", () => {
        expect(previewMitigatedDamage(100, 100)).toBe(50);
    });
});
