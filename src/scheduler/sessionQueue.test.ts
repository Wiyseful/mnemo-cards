import { describe, it, expect } from "vitest";
import { AGAIN_RETURN_MAX_DISTANCE, AGAIN_RETURN_MIN_DISTANCE, queueAfterRating } from "./sessionQueue";

const LONG_QUEUE = Array.from({ length: 30 }, (_, index) => `card-${index}`);

describe("queueAfterRating", () => {
    it("removes the card when it's remembered", () => {
        expect(queueAfterRating(["a", "b", "c"], "Good")).toEqual(["b", "c"]);
    });

    it("puts a forgotten card the fewest spots back when the random number is 0", () => {
        const updatedQueue = queueAfterRating(LONG_QUEUE, "Again", 0);
        expect(updatedQueue.indexOf("card-0")).toBe(AGAIN_RETURN_MIN_DISTANCE);
    });

    it("puts a forgotten card the most spots back when the random number is almost 1", () => {
        const updatedQueue = queueAfterRating(LONG_QUEUE, "Again", 0.9999);
        expect(updatedQueue.indexOf("card-0")).toBe(AGAIN_RETURN_MAX_DISTANCE);
    });

    it("always puts a forgotten card somewhere in the allowed range", () => {
        for (let attempt = 0; attempt < 200; attempt++) {
            const position = queueAfterRating(LONG_QUEUE, "Again").indexOf("card-0");
            expect(position).toBeGreaterThanOrEqual(AGAIN_RETURN_MIN_DISTANCE);
            expect(position).toBeLessThanOrEqual(AGAIN_RETURN_MAX_DISTANCE);
        }
    });

    it("keeps every card when one is forgotten", () => {
        const updatedQueue = queueAfterRating(LONG_QUEUE, "Again", 0.5);
        expect(updatedQueue.toSorted()).toEqual(LONG_QUEUE.toSorted());
    });

    it("puts a forgotten card at the end when fewer cards are left than the distance", () => {
        expect(queueAfterRating(["a", "b", "c"], "Again", 0)).toEqual(["b", "c", "a"]);
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