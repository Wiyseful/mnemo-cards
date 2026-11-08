"use client";

import { useEffect, useState } from "react";
import { sampleCards } from "@/data/sampleCards";
import { applyRating } from "@/scheduler/applyRating";
import { findNextDueCard } from "@/scheduler/findNextDueCard";
import { formatDuration } from "@/scheduler/formatDuration";
import type { Rating } from "@/scheduler/types";
import {averageRecallChance} from "@/scheduler/averageRecallChance";

const RATING_BUTTON_CLASSES =
    "rounded-full border border-gray-200 bg-white px-5 py-2 text-sm shadow-sm hover:bg-gray-100";

// which rating each number key picks
const RATING_FOR_KEY: Record<string, Rating> = {
    "1": "Again",
    "2": "Hard",
    "3": "Good",
    "4": "Easy",
};

// turns a duration into stopwatch text like "4:05"
function formatStopwatch(durationMs: number): string {
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function StudyPage() {
    const [isAnswerShown, setIsAnswerShown] = useState(false);
    const [cards, setCards] = useState(sampleCards);
    const [sessionStartedAtMs, setSessionStartedAtMs] = useState<number | null>(null);
    const [currentTimeMs, setCurrentTimeMs] = useState(Date.now());

    const currentCard = findNextDueCard(cards, Date.now());

    // the session starts the first time an answer is revealed
    const revealAnswer = () => {
        if (sessionStartedAtMs === null) {
            setSessionStartedAtMs(Date.now());
        }
        setIsAnswerShown(true);
    };

    // saves the rated card and moves on to the next one
    const handleRatingClick = (rating: Rating) => {
        if (!currentCard) return;
        const ratedCard = applyRating(currentCard, rating, Date.now());
        setCards(cards.map((card) => (card.id === currentCard.id ? ratedCard : card)));
        setIsAnswerShown(false);
    };

    // ticks once a second so the timer on screen keeps counting up
    useEffect(() => {
        const tickIntervalId = setInterval(() => setCurrentTimeMs(Date.now()), 1000);
        return () => clearInterval(tickIntervalId);
    }, []);

    // keyboard shortcuts: Space reveals the answer, 1-4 rate the card
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!currentCard) return;

            if (event.code === "Space") {
                event.preventDefault(); // stop Space from also clicking a focused button or scrolling
                if (!isAnswerShown) {
                    revealAnswer();
                }
                return;
            }

            const rating = RATING_FOR_KEY[event.key];
            if (rating && isAnswerShown) {
                handleRatingClick(rating);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    });

    if (!currentCard) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
                <p className="text-xl">All done for now!</p>
            </main>
        );
    }

    const elapsedStudyTimeMs =
        sessionStartedAtMs === null ? 0 : Math.max(0, currentTimeMs - sessionStartedAtMs);

    // Calculate average retrievability of cards in a deck
    const averageRetrievability = Math.round(averageRecallChance(cards, currentTimeMs) * 100);

    // text like "3 d": how long until the card comes back if this rating is picked
    const timeUntilDueText = (rating: Rating) => {
        const currentTimeMs = Date.now();
        const cardIfRated = applyRating(currentCard, rating, currentTimeMs);
        return formatDuration(cardIfRated.dueAt - currentTimeMs);
    };

    return (
        <main className="relative min-h-screen flex flex-col items-center justify-center bg-gray-50 p-8">
            <p className="absolute top-6 right-6 text-xl text-gray-500 tabular-nums">
                {formatStopwatch(elapsedStudyTimeMs)}
            </p>

            <p className="absolute top-6 left-6 text-xl text-gray-500">
                Chance you'll remember each card: {averageRetrievability}%
            </p>

            <button
                onClick={revealAnswer}
                className="w-full max-w-lg rounded-2xl bg-white p-10 text-left text-xl shadow"
            >
                <p>{currentCard.front}</p>
                {isAnswerShown && (
                    <p className="mt-6 border-t border-gray-200 pt-6">{currentCard.back}</p>
                )}
            </button>

            {isAnswerShown && (
                <div className="mt-6 flex gap-2">
                    <button onClick={() => handleRatingClick("Again")} className={RATING_BUTTON_CLASSES}>
                        Again · {timeUntilDueText("Again")}
                    </button>
                    <button onClick={() => handleRatingClick("Hard")} className={RATING_BUTTON_CLASSES}>
                        Hard · {timeUntilDueText("Hard")}
                    </button>
                    <button onClick={() => handleRatingClick("Good")} className={RATING_BUTTON_CLASSES}>
                        Good · {timeUntilDueText("Good")}
                    </button>
                    <button onClick={() => handleRatingClick("Easy")} className={RATING_BUTTON_CLASSES}>
                        Easy · {timeUntilDueText("Easy")}
                    </button>
                </div>
            )}
        </main>
    );
}