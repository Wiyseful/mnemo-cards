"use client";

import {useEffect, useState} from "react";
import {sampleCards} from "@/data/sampleCards";
import {applyRating} from "@/scheduler/applyRating";
import {formatDuration} from "@/scheduler/formatDuration";
import type {Rating} from "@/scheduler/types";
import {averageRecallChance} from "@/scheduler/averageRecallChance";
import {queueAfterRating, dueCardIdsInOrder} from "@/scheduler/sessionQueue";
import {loadSavedCards, saveCards} from "@/data/cardStorage";
import { Brain, Clock, Inbox, Pointer, X } from "lucide-react";
import {MS_PER_DAY} from "@/scheduler/time";

const PROBLEM_CARD_FORGET_LIMIT = 5;
const MEMORY_FORECAST_DAYS = 7;

// the ratings shown as buttons, in order (Hard isn't used)
const BUTTON_RATINGS = ["Again", "Good", "Easy"] as const;

// what each button says. the engine still gets the rating underneath
const BUTTON_LABEL_FOR_RATING: Record<(typeof BUTTON_RATINGS)[number], string> = {
    Again: "Forgot",
    Good: "Recalled",
    Easy: "Instant",
};

// which rating each number key picks
const RATING_FOR_KEY: Record<string, Rating> = {
    "1": "Again",
    "2": "Good",
    "3": "Easy",
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
    const [missedCardIds, setMissedCardIds] = useState<string[]>([]);

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

        // keep track of cards forgotten this session, for the red part of the progress bar
        if (rating === "Again") {
            if (!missedCardIds.includes(currentCard.id)) {
                setMissedCardIds([...missedCardIds, currentCard.id]);
            }
        } else {
            setMissedCardIds(missedCardIds.filter((missedId) => missedId !== currentCard.id));
        }

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

    // keyboard shortcuts: Space reveals the answer, 1-3 rate the card
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
        return <main className="min-h-screen bg-gray-50"/>;
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
    // how much of the bar is red: cards forgotten this session / total
    const missedProgressPercent = sessionCardCount > 0 ? (missedCardIds.length / sessionCardCount) * 100 : 0;
    // 5 finished cards / 20 total cards = 0.25 * 100 = 25%
    const sessionProgressPercent =
        sessionCardCount > 0 ? (finishedCardCount / sessionCardCount) * 100 : 0;


    // average chance of remembering each card in the deck right now, as a whole percent
    const deckRecallPercent = Math.round(averageRecallChance(cards, currentTimeMs + MEMORY_FORECAST_DAYS * MS_PER_DAY) * 100);

    // text like "3 d": how long until the card comes back if this rating is picked
    const timeUntilDueText = (rating: Rating) => {
        const currentTimeMs = Date.now();
        const cardIfRated = applyRating(currentCard, rating, currentTimeMs);
        return formatDuration(cardIfRated.dueAt - currentTimeMs);
    };

    return (
        <main className="min-h-screen flex flex-col items-center bg-gray-50">
            {/* session progress bar: gray = done, red = forgotten */}
            <div className="flex h-2 w-full bg-gray-200">
                <div
                    className="h-full bg-gray-500 transition-all duration-300"
                    style={{ width: `${sessionProgressPercent}%` }}
                />
                <div
                    className="h-full bg-red-400 transition-all duration-300"
                    style={{ width: `${missedProgressPercent}%` }}
                />
            </div>

            {/* top bar: memory on the left, progress in the middle, timer on the right */}
            <div className="grid w-full grid-cols-3 items-center px-6 py-4 text-sm text-gray-500">
                {/* left: deck memory */}
                <div
                    className="flex items-center gap-1.5"
                    title="Average chance you'd remember each card a week from now"
                >
                    <Brain className="h-4 w-4 " />
                    <span className="font-medium tabular-nums text-gray-700">{deckRecallPercent}%</span>
                    <span>memory</span>
                </div>

                {/* middle: cards done this session, and cards forgotten */}
                <div className="flex items-center justify-center gap-4 tabular-nums">
                    <div className="flex items-center gap-1.5">
                        <Inbox className="h-4 w-4" />
                        <span className="font-medium text-gray-700">{finishedCardCount}</span>
                        <span className="text-gray-400">/ {sessionCardCount}</span>
                    </div>
                    {missedCardIds.length > 0 && (
                        <div className="flex items-center gap-1 text-red-500">
                            <X className="h-4 w-4" />
                            <span className="font-medium">{missedCardIds.length}</span>
                        </div>
                    )}
                </div>

                {/* right: study timer */}
                <div className="flex items-center justify-end gap-1.5 tabular-nums">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium text-gray-700">{formatStopwatch(elapsedStudyTimeMs)}</span>
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
                        <div className="grid grid-cols-3 divide-x-3 divide-gray-200 border-t-3 border-gray-200 bg-gray-50">
                            {BUTTON_RATINGS.map((rating) => (
                                <button
                                    key={rating}
                                    onClick={() => handleRatingClick(rating)}
                                    className="cursor-pointer py-3 text-sm hover:bg-gray-100"
                                >
                                    <span className="block font-medium">{BUTTON_LABEL_FOR_RATING[rating]}</span>
                                    <span className="block text-xs text-gray-400">{timeUntilDueText(rating)}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {!isAnswerShown && (
                    <p className="mx-auto mt-6 w-fit rounded-full bg-gray-100 px-5 py-2 text-sm text-gray-400 hidden pointer-fine:block">
                        Press <kbd
                        className="mx-1 rounded-md border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-600 shadow-sm">SPACE</kbd> to
                        reveal the answer
                    </p>
                )}

                {!isAnswerShown && (
                    <p className="mx-auto mt-6 w-fit rounded-full bg-gray-100 px-5 py-2 text-sm text-gray-400 hidden pointer-coarse:flex gap-2">
                        <Pointer className="h-4 w-4"/> Tap card to reveal answer
                    </p>
                )}
            </div>
        </main>
    );
}