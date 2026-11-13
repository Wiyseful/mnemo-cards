"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, ChevronLeft, Clock, Coffee, Hand, X } from "lucide-react";
import { sampleCards, sampleDecks } from "@/data/sampleCards";
import { loadSavedCards, saveCards } from "@/data/cardStorage";
import { loadSavedDecks } from "@/data/deckStorage";
import { applyRating } from "@/scheduler/applyRating";
import { formatDuration } from "@/scheduler/formatDuration";
import { MEMORY_FORECAST_DAYS, memoryPercentForecast } from "@/scheduler/averageRecallChance";
import { queueAfterRating, dueCardIdsInOrder } from "@/scheduler/sessionQueue";
import type { Rating } from "@/scheduler/types";


// Hard isn't used. The order matches the swipe directions: left, up, right
const BUTTON_RATINGS = ["Again", "Good", "Easy"] as const;

const BUTTON_LABEL_FOR_RATING: Record<(typeof BUTTON_RATINGS)[number], string> = {
    Again: "Forgot",
    Good: "Recalled",
    Easy: "Instant",
};


const KEY_FOR_RATING: Record<(typeof BUTTON_RATINGS)[number], string> = {
    Again: "1",
    Good: "2",
    Easy: "3",
};

const RATING_FOR_KEY: Record<string, Rating> = {
    "1": "Again",
    "2": "Good",
    "3": "Easy",
};

// thicker bottom border makes it look like a real key
// looks like a real key: thin border, thicker bottom edge
const KEY_STYLE =
    "inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-md border border-b-2 border-neutral-300 bg-white px-1.5 font-sans text-[11px] font-semibold text-neutral-600";
// 245000 ms -> "4:05"
function formatStopwatch(durationMs: number): string {
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function StudyPage() {
    const { deckId } = useParams<{ deckId: string }>();
    const [isAnswerShown, setIsAnswerShown] = useState(false);
    const [decks, setDecks] = useState(sampleDecks);
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
    const [hasLoadedSavedData, setHasLoadedSavedData] = useState(false);
    // cards you're still stuck on. a card leaves once you get it right
    const [missedCardIds, setMissedCardIds] = useState<string[]>([]);
    // every card you forgot at least once this session. nothing ever leaves
    const [forgottenCardIds, setForgottenCardIds] = useState<string[]>([]);
    const [sessionFinishedAtMs, setSessionFinishedAtMs] = useState<number | null>(null);

    // `cards` keeps every deck so saving doesn't wipe the others
    const deckCards = cards.filter((card) => card.deckId === deckId && card.deletedAt === null);

    const currentDeck = decks.find((deck) => deck.id === deckId);
    const currentCard = cards.find((card) => card.id === sessionQueue[0]);

    // the timer starts on the first reveal, not when the page opens
    const revealAnswer = () => {
        if (sessionStartedAtMs === null) {
            setSessionStartedAtMs(Date.now());
        }
        setIsAnswerShown(true);
    };

    const handleRatingClick = (rating: Rating) => {
        if (!currentCard) return;

        if (rating === "Again") {
            if (!missedCardIds.includes(currentCard.id)) {
                setMissedCardIds([...missedCardIds, currentCard.id]);
            }
            if (!forgottenCardIds.includes(currentCard.id)) {
                setForgottenCardIds([...forgottenCardIds, currentCard.id]);
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

    // tap anywhere below the header to flip the card
    const handleStudyAreaClick = () => {
        if (!isAnswerShown) {
            revealAnswer();
        }
    };

    useEffect(() => {
        const tickIntervalId = setInterval(() => setCurrentTimeMs(Date.now()), 1000);
        return () => clearInterval(tickIntervalId);
    }, []);

    useEffect(() => {
        // load decks before the early return below, or new users never get them
        const savedDecks = loadSavedDecks();
        if (savedDecks !== null) {
            setDecks(savedDecks);
        }

        const savedCards = loadSavedCards();
        if (savedCards === null) {
            setHasLoadedSavedData(true);
            return;
        }
        setCards(savedCards);

        const savedDeckCards = savedCards.filter((card) => card.deckId === deckId && card.deletedAt === null);
        const savedSessionQueue = dueCardIdsInOrder(savedDeckCards, Date.now());
        setSessionQueue(savedSessionQueue);
        setSessionCardCount(savedSessionQueue.length);
        setHasLoadedSavedData(true);
    }, []);

    useEffect(() => {
        if (!hasLoadedSavedData) return;
        saveCards(cards);
    }, [cards, hasLoadedSavedData]);

    // Space shows the answer, 1-3 rate it
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!currentCard) return;

            if (event.code === "Space") {
                event.preventDefault(); // otherwise the page scrolls
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

    // blank until saved data loads, so the sample cards don't flash first
    if (!hasLoadedSavedData) {
        return <main className="h-dvh bg-neutral-50" />;
    }

    // stops counting once the session is over
    const elapsedStudyTimeMs =
        sessionStartedAtMs === null
            ? 0
            : Math.max(0, (sessionFinishedAtMs ?? currentTimeMs) - sessionStartedAtMs);

    const deckMemoryPercent = memoryPercentForecast(deckCards, currentTimeMs);

    const nextDueAtMs =
        deckCards.length > 0 ? Math.min(...deckCards.map((card) => card.dueAt)) : null;

    if (!currentCard) {
        // if nothing was due when the deck opened, there was no session
        const hasStudiedThisSession = sessionCardCount > 0;
        const isDeckEmpty = deckCards.length === 0;

        const headerText = hasStudiedThisSession
            ? "Session complete"
            : isDeckEmpty
                ? "No cards yet"
                : "Nothing due right now";

        const summaryRows: { label: string; value: string; isWarning?: boolean }[] = [];
        if (hasStudiedThisSession) {
            summaryRows.push(
                { label: `Memory in ${MEMORY_FORECAST_DAYS} days`, value: `${deckMemoryPercent}%` },
                { label: "Reviewed", value: `${sessionCardCount}` },
                { label: "Forgotten", value: `${forgottenCardIds.length}`, isWarning: forgottenCardIds.length > 0 },
                { label: "Time studied", value: formatStopwatch(elapsedStudyTimeMs) },
            );
        }
        if (nextDueAtMs !== null) {
            summaryRows.push({
                label: "Next card due in",
                value: formatDuration(Math.max(0, nextDueAtMs - currentTimeMs)),
            });
        }

        return (
            <main className="flex min-h-dvh flex-col items-center bg-neutral-50 text-neutral-900">
                <div className="mt-6 w-full max-w-2xl px-4 sm:mt-[18vh]">
                    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
                        <div className="border-b border-neutral-100 px-6 py-3">
                            <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                                {hasStudiedThisSession ? <Check className="h-3 w-3" /> : <Coffee className="h-3 w-3" />}
                                {headerText}
                            </span>
                        </div>

                        {summaryRows.length > 0 && (
                            <dl className="divide-y divide-neutral-100 px-6">
                                {summaryRows.map((row) => (
                                    <div key={row.label} className="flex items-center justify-between py-3 text-sm">
                                        <dt className="text-neutral-500">{row.label}</dt>
                                        <dd
                                            className={`font-medium tabular-nums ${
                                                row.isWarning ? "text-red-500" : "text-neutral-800"
                                            }`}
                                        >
                                            {row.value}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        )}
                    </div>

                    <div className="mt-6 flex justify-center">
                        <Link
                            href={`/deck/${deckId}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to deck
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    const finishedCardCount = sessionCardCount - sessionQueue.length;
    const missedProgressPercent =
        sessionCardCount > 0 ? (missedCardIds.length / sessionCardCount) * 100 : 0;
    const sessionProgressPercent =
        sessionCardCount > 0 ? (finishedCardCount / sessionCardCount) * 100 : 0;

    // "3d": when the card would come back if you picked this rating
    const timeUntilDueText = (rating: Rating) => {
        const currentTimeMs = Date.now();
        const cardIfRated = applyRating(currentCard, rating, currentTimeMs);
        return formatDuration(cardIfRated.dueAt - currentTimeMs);
    };

    return (
        <main className="flex h-dvh flex-col bg-neutral-50 text-neutral-900">
            <header className="shrink-0 px-3 pt-3 sm:px-6 sm:pt-5">
                <div className="mx-auto flex max-w-5xl items-center gap-3">
                    <Link
                        href={`/deck/${deckId}`}
                        aria-label="Back to deck"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-neutral-50"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Link>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate text-sm font-medium text-neutral-800">{currentDeck?.name}</p>
                            <p className="shrink-0 text-xs tabular-nums text-neutral-400">
                                <span className="font-medium text-neutral-700">{finishedCardCount}</span> of{" "}
                                {sessionCardCount}
                            </p>
                        </div>
                        {/* dark for done, red for cards you're still stuck on */}
                        <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-neutral-200/80">
                            <div
                                className="h-full bg-neutral-800 transition-all duration-200"
                                style={{ width: `${sessionProgressPercent}%` }}
                            />
                            <div
                                className="h-full bg-red-400 transition-all duration-200"
                                style={{ width: `${missedProgressPercent}%` }}
                            />
                        </div>
                    </div>

                    <div className="flex h-10 shrink-0 items-center rounded-full border border-neutral-200 bg-white px-1 text-sm tabular-nums shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                        {missedCardIds.length > 0 && (
                            <>
                                <span className="flex items-center gap-1 px-2.5 font-medium text-red-500">
                                    <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                                    {missedCardIds.length}
                                </span>
                                <span className="h-4 w-px bg-neutral-200" />
                            </>
                        )}
                        <span className="flex items-center gap-1.5 px-2.5 text-neutral-500">
                            <Clock className="h-3.5 w-3.5" />
                            {formatStopwatch(elapsedStudyTimeMs)}
                        </span>
                    </div>
                </div>
            </header>




            <div
                onClick={handleStudyAreaClick}
                className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${isAnswerShown ? "" : "cursor-pointer"}`}
            >
                <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-3 pb-4 pt-5 sm:px-6 sm:pt-[10vh]">
                    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
                        <div className="px-6 py-8 sm:px-10 sm:py-12">
                            <p className="whitespace-pre-wrap text-[20px] font-medium leading-snug tracking-tight sm:text-xl">
                                {currentCard.front}
                            </p>

                            {isAnswerShown && (
                                <>
                                    <div className="my-7 border-t-2 border-dashed border-neutral-200" />
                                    <p className="whitespace-pre-wrap text-lg leading-relaxed text-neutral-700">
                                        {currentCard.back}
                                    </p>

                                </>
                            )}
                        </div>

                        {/* button ratings */}
                        {isAnswerShown && (
                            <div className="grid grid-cols-3 divide-x-[3px] divide-neutral-200 border-t-[3px] border-neutral-200 bg-neutral-50">
                                {BUTTON_RATINGS.map((rating) => (
                                    <button
                                        key={rating}
                                        onClick={() => handleRatingClick(rating)}
                                        className="flex h-16 flex-col items-center justify-center gap-0.5 hover:bg-neutral-200/60"
                                    >
                                        <span
                                            className={`text-[15px] font-medium ${"text-neutral-800"}`}
                                        >
                                            {BUTTON_LABEL_FOR_RATING[rating]}
                                        </span>
                                        <span className="text-xs tabular-nums text-neutral-400">
                                            {timeUntilDueText(rating)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* computers: one pill that shows which keys do what */}
                    <div className="mt-5 hidden justify-center pointer-fine:flex">
                        <div className="flex items-center gap-4 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs text-neutral-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                            {isAnswerShown ? (
                                BUTTON_RATINGS.map((rating, index) => (
                                    <span key={rating} className="flex items-center gap-1.5">
                                        <kbd className={KEY_STYLE}>{index + 1}</kbd>
                                        {BUTTON_LABEL_FOR_RATING[rating]}
                                    </span>
                                ))
                            ) : (
                                <span className="flex items-center gap-1.5">
                                    <kbd className={KEY_STYLE}>Space</kbd>
                                    Reveal
                                </span>
                            )}
                        </div>
                    </div>
                    {/* phones: tap anywhere hint */}
                    {!isAnswerShown && (
                        <p className="mx-auto mb-2 mt-6 hidden items-center gap-1.5 rounded-full bg-neutral-100 px-4 py-2 text-sm text-neutral-500 pointer-coarse:flex">
                            <Hand className="h-4 w-4" />
                            Tap anywhere to reveal the answer
                        </p>
                    )}
                    <div className="flex-1" />

                </div>
            </div>
        </main>
    );
}