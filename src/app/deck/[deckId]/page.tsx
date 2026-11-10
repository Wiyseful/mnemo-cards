"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Brain, Check, Clock, Coffee, Inbox, Pointer, X } from "lucide-react";
import { sampleCards } from "@/data/sampleCards";
import { loadSavedCards, saveCards } from "@/data/cardStorage";
import { applyRating } from "@/scheduler/applyRating";
import { formatDuration } from "@/scheduler/formatDuration";
import { MEMORY_FORECAST_DAYS, memoryPercentForecast } from "@/scheduler/averageRecallChance";
import { queueAfterRating, dueCardIdsInOrder } from "@/scheduler/sessionQueue";
import type { Rating } from "@/scheduler/types";

const PROBLEM_CARD_FORGET_LIMIT = 5;

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
    // the deck id from the address, like "cs-fundamentals" in /deck/cs-fundamentals
    const { deckId } = useParams<{ deckId: string }>();
    const [isAnswerShown, setIsAnswerShown] = useState(false);
    const [cards, setCards] = useState(sampleCards);
    const [sessionStartedAtMs, setSessionStartedAtMs] = useState<number | null>(null);
    const [currentTimeMs, setCurrentTimeMs] = useState(Date.now());
    const [sessionQueue, setSessionQueue] = useState(
        dueCardIdsInOrder(
            sampleCards.filter((card) => card.deckId === deckId),
            currentTimeMs,
        ),
    );
    const [sessionCardCount, setSessionCardCount] = useState(sessionQueue.length);
    const [hasLoadedSavedCards, setHasLoadedSavedCards] = useState(false);
    const [missedCardIds, setMissedCardIds] = useState<string[]>([]);
    // when the last card was finished, so the timer stops on the done screen
    const [sessionFinishedAtMs, setSessionFinishedAtMs] = useState<number | null>(null);

    // only this deck's cards. `cards` still has every deck so saving keeps them all
    const deckCards = cards.filter((card) => card.deckId === deckId);

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

        const updatedSessionQueue = queueAfterRating(sessionQueue, rating);
        setSessionQueue(updatedSessionQueue);
        if (updatedSessionQueue.length === 0) {
            setSessionFinishedAtMs(Date.now());
        }

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
        setCards(savedCards); // still ALL cards, so saving keeps every deck

        const savedDeckCards = savedCards.filter((card) => card.deckId === deckId);
        const savedSessionQueue = dueCardIdsInOrder(savedDeckCards, Date.now());
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
        return <main className="min-h-screen bg-gray-50" />;
    }

    // once finished, count up to the finish time instead of now, so the timer stops
    const elapsedStudyTimeMs =
        sessionStartedAtMs === null
            ? 0
            : Math.max(0, (sessionFinishedAtMs ?? currentTimeMs) - sessionStartedAtMs);

    // how much of this deck you'd remember if you stopped studying now
    const deckMemoryPercent = memoryPercentForecast(deckCards, currentTimeMs);

    // when the next card in this deck comes back. null if the deck has no cards
    const nextDueAtMs =
        deckCards.length > 0 ? Math.min(...deckCards.map((card) => card.dueAt)) : null;

    if (!currentCard) {
        // nothing was due when the deck opened, so there was no session to finish
        const hasStudiedThisSession = sessionCardCount > 0;
        const isDeckEmpty = deckCards.length === 0;

        return (
            <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-md sm:p-10">
                    {hasStudiedThisSession ? (
                        <>
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                                <Check className="h-7 w-7 text-green-600" />
                            </div>
                            <h1 className="mt-4 text-2xl font-semibold text-gray-800">Session complete</h1>

                            <p className="mt-6 text-6xl font-bold tabular-nums text-gray-900">{deckMemoryPercent}%</p>
                            <p className="mt-2 text-sm text-gray-500">
                                of this deck stays with you for {MEMORY_FORECAST_DAYS} days
                            </p>

                            <div className="mt-8 grid grid-cols-3 divide-x divide-gray-200 rounded-xl bg-gray-50 py-4">
                                <div>
                                    <p className="text-xl font-semibold tabular-nums text-gray-800">{sessionCardCount}</p>
                                    <p className="text-xs text-gray-500">reviewed</p>
                                </div>
                                <div>
                                    <p
                                        className={`text-xl font-semibold tabular-nums ${
                                            missedCardIds.length > 0 ? "text-red-500" : "text-gray-800"
                                        }`}
                                    >
                                        {missedCardIds.length}
                                    </p>
                                    <p className="text-xs text-gray-500">forgotten</p>
                                </div>
                                <div>
                                    <p className="text-xl font-semibold tabular-nums text-gray-800">
                                        {formatStopwatch(elapsedStudyTimeMs)}
                                    </p>
                                    <p className="text-xs text-gray-500">studied</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                                <Coffee className="h-7 w-7 text-gray-500" />
                            </div>
                            <h1 className="mt-4 text-2xl font-semibold text-gray-800">
                                {isDeckEmpty ? "No cards yet" : "Nothing due right now"}
                            </h1>
                        </>
                    )}

                    {nextDueAtMs !== null && (
                        <p className="mt-6 text-sm text-gray-500">
                            Next card due in{" "}
                            <span className="font-medium text-gray-700">
                                {formatDuration(Math.max(0, nextDueAtMs - currentTimeMs))}
                            </span>
                        </p>
                    )}

                    <Link
                        href="/"
                        className="mt-6 inline-block rounded-full bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
                    >
                        Back to decks
                    </Link>
                </div>
            </main>
        );
    }

    // how far through today's cards: finished / total
    const finishedCardCount = sessionCardCount - sessionQueue.length;
    // how much of the bar is red: cards forgotten this session / total
    const missedProgressPercent =
        sessionCardCount > 0 ? (missedCardIds.length / sessionCardCount) * 100 : 0;
    // 5 finished cards / 20 total cards = 0.25 * 100 = 25%
    const sessionProgressPercent =
        sessionCardCount > 0 ? (finishedCardCount / sessionCardCount) * 100 : 0;

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
                    title={`Average chance you'd remember each card in ${MEMORY_FORECAST_DAYS} days`}
                >
                    <Brain className="h-4 w-4" />
                    <span className="font-medium tabular-nums text-gray-700">{deckMemoryPercent}%</span>
                    <span>in {MEMORY_FORECAST_DAYS} days</span>
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
                    <p className="mx-auto mt-6 hidden w-fit rounded-full bg-gray-100 px-5 py-2 text-sm text-gray-400 pointer-fine:block">
                        Press{" "}
                        <kbd className="mx-1 rounded-md border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-600 shadow-sm">
                            SPACE
                        </kbd>{" "}
                        to reveal the answer
                    </p>
                )}

                {!isAnswerShown && (
                    <p className="mx-auto mt-6 hidden w-fit gap-2 rounded-full bg-gray-100 px-5 py-2 text-sm text-gray-400 pointer-coarse:flex">
                        <Pointer className="h-4 w-4" /> Tap card to reveal answer
                    </p>
                )}
            </div>
        </main>
    );
}