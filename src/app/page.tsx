"use client";

import {useEffect, useState} from "react";
import {sampleCards} from "@/data/sampleCards";
import {applyRating} from "@/scheduler/applyRating";
import {findNextDueCard} from "@/scheduler/findNextDueCard";
import {formatDuration} from "@/scheduler/formatDuration";
import type {Rating} from "@/scheduler/types";
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

            {/* Stopwatch in top right corner tracking study session */}
            <p className="absolute top-6 right-6 text-xl text-gray-500 tabular-nums">
                {formatStopwatch(elapsedStudyTimeMs)}
            </p>
            {/* Average of retrievability score of cards in deck */}
            <p className="absolute top-6 left-6 text-xl text-gray-500">
                Deck recallability: {averageRetrievability}%
            </p>
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow">
                <button onClick={revealAnswer} className="w-full p-10 text-left text-xl">
                    <p>{currentCard.front}</p>
                    {isAnswerShown && (
                        <>
                            <p className="mt-6 border-t border-gray-200 pt-6">{currentCard.back}</p>
                            <p className="mt-4 text-sm text-gray-400">
                                {`${currentCard.reviewCount} ${currentCard.reviewCount === 1 ? "review" : "reviews"}`}
                            </p>
                        </>
                    )}
                </button>

                {isAnswerShown && (
                    <div className="grid grid-cols-4 divide-x divide-gray-200 border-t border-gray-200">
                        {(["Again", "Hard", "Good", "Easy"] as const).map((rating) => (
                            <button
                                key={rating}
                                onClick={() => handleRatingClick(rating)}
                                className="py-3 text-sm hover:bg-gray-50"
                            >
                                <span className="block font-medium">{rating}</span>
                                <span className="block text-xs text-gray-400">{timeUntilDueText(rating)}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {!isAnswerShown && (
                <p className="mt-6 rounded-full bg-gray-100 px-5 py-2 text-sm text-gray-400">
                    Press <kbd className="mx-1 rounded-md border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-600 shadow-sm">SPACE</kbd> to reveal the answer
                </p>
            )}
        </main>
    );
}