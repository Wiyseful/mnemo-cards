"use client";

import {useEffect, useState} from "react";
import {sampleCards} from "@/data/sampleCards";
import {applyRating} from "@/scheduler/applyRating";
import {formatDuration} from "@/scheduler/formatDuration";
import type {Rating} from "@/scheduler/types";
import {averageRecallChance} from "@/scheduler/averageRecallChance";
import {queueAfterRating, dueCardIdsInOrder} from "@/scheduler/sessionQueue";
import {loadSavedCards, saveCards} from "@/data/cardStorage";
import {Pointer} from "lucide-react";

const PROBLEM_CARD_FORGET_LIMIT = 5;

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
    const [sessionQueue, setSessionQueue] = useState(dueCardIdsInOrder(sampleCards, currentTimeMs));
    const [sessionCardCount, setSessionCardCount] = useState(sessionQueue.length);
    const [hasLoadedSavedCards, setHasLoadedSavedCards] = useState(false);

    const currentCard = cards.find((card) => card.id === sessionQueue[0]);

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
        setSessionQueue(queueAfterRating(sessionQueue, rating));
        setIsAnswerShown(false);
    };

    // ticks once a second so the timer on screen keeps counting up
    useEffect(() => {
        const tickIntervalId = setInterval(() => setCurrentTimeMs(Date.now()), 1000);
        return () => clearInterval(tickIntervalId);
    }, []);

    // on page open: swap in saved progress, if there is any
    useEffect(() => {
        const savedCards = loadSavedCards();
        if (savedCards === null) {
            setHasLoadedSavedCards(true);
            return;
        }
        setCards(savedCards);
        const savedSessionQueue = dueCardIdsInOrder(savedCards, Date.now());
        setSessionQueue(savedSessionQueue);
        setSessionCardCount(savedSessionQueue.length);
        setHasLoadedSavedCards(true);
    }, []);

    // after every change to the cards: save them, but only once loading is done
    useEffect(() => {
        if (!hasLoadedSavedCards) return;
        saveCards(cards);
    }, [cards, hasLoadedSavedCards]);

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

    // show a blank page until saved progress is loaded, so the sample cards don't flash first
    if (!hasLoadedSavedCards) {
        return <main className="min-h-screen bg-gray-50" />;
    }

    if (!currentCard) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
                <p className="text-xl">All done for now!</p>
            </main>
        );
    }

    const elapsedStudyTimeMs =
        sessionStartedAtMs === null ? 0 : Math.max(0, currentTimeMs - sessionStartedAtMs);

    // how far through today's cards: finished / total
    const finishedCardCount = sessionCardCount - sessionQueue.length;
    const sessionProgressPercent =
        sessionCardCount > 0 ? (finishedCardCount / sessionCardCount) * 100 : 0;

    // average chance of remembering each card in the deck right now, as a whole percent
    const deckRecallPercent = Math.round(averageRecallChance(cards, currentTimeMs) * 100);

    // text like "3 d": how long until the card comes back if this rating is picked
    const timeUntilDueText = (rating: Rating) => {
        const currentTimeMs = Date.now();
        const cardIfRated = applyRating(currentCard, rating, currentTimeMs);
        return formatDuration(cardIfRated.dueAt - currentTimeMs);
    };

    return (
        <main className="min-h-screen flex flex-col items-center bg-gray-50">
            {/* session progress bar */}
            <div className="h-2 w-full bg-gray-200">
                <div
                    className="h-full bg-gray-500 transition-all duration-300"
                    style={{ width: `${sessionProgressPercent}%` }}
                />
            </div>

            {/* top bar: deck score on the left, progress count and timer on the right */}
            <div className="flex w-full justify-between px-6 py-4 text-sm text-gray-500">
                <p>Deck recallability: {deckRecallPercent}%</p>
                <div className="flex gap-4 tabular-nums">
                    <p>{finishedCardCount} / {sessionCardCount}</p>
                    <p>{formatStopwatch(elapsedStudyTimeMs)}</p>
                </div>
            </div>

            {/* card area: close to the top on phones, lower on bigger screens */}
            <div className="mt-6 w-full max-w-2xl px-4 sm:mt-[18vh]">
                <div className="overflow-hidden rounded-2xl bg-white shadow-md">
                    <button onClick={revealAnswer} className="w-full p-6 text-left text-lg sm:p-10">
                        <p>{currentCard.front}</p>
                        {isAnswerShown && (
                            <>
                                <p className="mt-6 border-t border-gray-200 pt-6">{currentCard.back}</p>
                                <p className="mt-4 text-sm text-gray-400">
                                    {`${currentCard.reviewCount} ${currentCard.reviewCount === 1 ? "review" : "reviews"}`}
                                </p>
                                {currentCard.forgetCount >= PROBLEM_CARD_FORGET_LIMIT && (
                                    <p className="mt-2 text-sm text-amber-600">
                                        {`You've forgotten this ${currentCard.forgetCount} times. Try rewriting it.`}
                                    </p>
                                )}
                            </>
                        )}
                    </button>

                    {isAnswerShown && (
                        <div className="grid grid-cols-4 divide-x-4 divide-gray-200 border-t-4 border-gray-200 bg-gray-50">
                            {(["Again", "Hard", "Good", "Easy"] as const).map((rating) => (
                                <button
                                    key={rating}
                                    onClick={() => handleRatingClick(rating)}
                                    className="py-3 text-sm hover:bg-gray-100"
                                >
                                    <span className="block font-medium">{rating}</span>
                                    <span className="block text-xs text-gray-400">{timeUntilDueText(rating)}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {!isAnswerShown && (
                    <p className="mx-auto mt-6 w-fit rounded-full bg-gray-100 px-5 py-2 text-sm text-gray-400 hidden pointer-fine:block">
                        Press <kbd className="mx-1 rounded-md border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-600 shadow-sm">SPACE</kbd> to reveal the answer
                    </p>
                )}

                {!isAnswerShown && (
                    <p className="mx-auto mt-6 w-fit rounded-full bg-gray-100 px-5 py-2 text-sm text-gray-400 hidden pointer-coarse:flex gap-2">
                        <Pointer className="h-4 w-4" /> Tap card to reveal answer
                    </p>
                )}
            </div>
        </main>
    );
}