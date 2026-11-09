import { describe, it, expect } from "vitest";
import { queueAfterRating } from "./sessionQueue";

describe("queueAfterRating", () => {
    it("removes the card when it's remembered", () => {
        expect(queueAfterRating(["a", "b", "c"], "Good")).toEqual(["b", "c"]);
    });

    it("puts a forgotten card 5 spots back", () => {
        const queue = ["a", "b", "c", "d", "e", "f", "g"];
        expect(queueAfterRating(queue, "Again")).toEqual(["b", "c", "d", "e", "f", "a", "g"]);
    });

    it("puts a forgotten card at the end when fewer than 5 are left", () => {
        expect(queueAfterRating(["a", "b", "c"], "Again")).toEqual(["b", "c", "a"]);
    });

    it("keeps the last card in the session when it's forgotten", () => {
        expect(queueAfterRating(["a"], "Again")).toEqual(["a"]);
    });

    it("doesn't change the original queue", () => {
        const queue = ["a", "b", "c"];
        queueAfterRating(queue, "Again");
        expect(queue).toEqual(["a", "b", "c"]);
    });
});