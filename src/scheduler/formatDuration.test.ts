import { describe, it, expect } from "vitest";
import { formatDuration } from "./formatDuration";
import { MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE } from "./time";

describe("formatDuration", () => {
    it("shows minutes under an hour", () => {
        expect(formatDuration(3 * MS_PER_MINUTE)).toBe("3 min");
    });

    it("shows hours from one hour up to a day", () => {
        expect(formatDuration(MS_PER_HOUR)).toBe("1 h");
        expect(formatDuration(5 * MS_PER_HOUR)).toBe("5 h");
    });

    it("shows days from one day up", () => {
        expect(formatDuration(MS_PER_DAY)).toBe("1 d");
        expect(formatDuration(8 * MS_PER_DAY)).toBe("8 d");
    });
});
