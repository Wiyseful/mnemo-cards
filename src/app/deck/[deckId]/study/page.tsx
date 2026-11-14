"use client";

import { useEffect, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence, MotionConfig, motion, useDragControls } from "motion/react";
import { ArrowLeft, Check, ChevronLeft, Clock, Coffee, Hand, Undo2, X } from "lucide-react";
import CardWidthSwitcher from "@/components/CardWidthSwitcher";
import type { CardWidth } from "@/components/CardWidthSwitcher";
import CardInfoPanel from "@/components/CardInfoPanel";
import EditCardSheet from "@/components/EditCardSheet";
import StudyCard, { BUTTON_LABEL_FOR_RATING, BUTTON_RATINGS } from "@/components/StudyCard";
import type { CardExit } from "@/components/StudyCard";
import StudyToolbar from "@/components/StudyToolbar";
import { SOFT_SPRING, SPRING } from "@/components/springs";
import { useStudyData } from "@/data/StudyDataProvider";
import { loadCardWidth, saveCardWidth } from "@/data/settingsStorage";
import { applyRating } from "@/scheduler/applyRating";
import { formatDuration } from "@/scheduler/formatDuration";
import { daysUntilExam, forecastEndTimeMs, percentRememberedAt } from "@/scheduler/memoryForecast";
import { queueAfterRating, dueCardIdsInOrder } from "@/scheduler/sessionQueue";
import type { Card, Rating } from "@/scheduler/types";

const RATING_FOR_KEY: Record<string, Rating> = {
    "1": "Again",
    "2": "Good",
    "3": "Easy",
};

const DELETE_TOAST_DURATION_MS = 4000;

// frosted glass. the page shows through it as it scrolls underneath
const GLASS =
    "bg-surface/70 backdrop-blur-xl backdrop-saturate-150 ring-1 ring-foreground/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)]";

const SOLID_PILL =
    "bg-surface ring-1 ring-foreground/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)]";

const KEY_STYLE =
    "inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-md bg-surface px-1.5 font-sans text-[11px] font-semibold text-secondary ring-1 ring-foreground/10 shadow-[0_1px_0_rgba(0,0,0,0.10)]";

const MotionLink = motion.create(Link);

const CARD_MAX_WIDTH_PX: Record<CardWidth, number> = {
    narrow: 576,
    normal: 768,
    wide: 1024,
};

type UndoSnapshot = {
    cardBefore: Card;
    sessionQueue: string[];
    missedCardIds: string[];
    forgottenCardIds: string[];
    sessionFinishedAtMs: number | null;
};

// 245000 ms -> "4:05"
function formatStopwatch(durationMs: number): string {
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function Stopwatch({ startedAtMs, finishedAtMs }: { startedAtMs: number | null; finishedAtMs: number | null }) {
    const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());
    const isRunning = startedAtMs !== null && finishedAtMs === null;

    useEffect(() => {
        if (!isRunning) return;
        const tickIntervalId = setInterval(() => setCurrentTimeMs(Date.now()), 1000);
        return () => clearInterval(tickIntervalId);
    }, [isRunning]);

    const elapsedMs = startedAtMs === null ? 0 : Math.max(0, (finishedAtMs ?? currentTimeMs) - startedAtMs);
    return <>{formatStopwatch(elapsedMs)}</>;
}

export default function StudyPage() {
    const { deckId } = useParams<{ deckId: string }>();
    const { hasLoadedSavedData } = useStudyData();

    // StudySession builds its queue from the cards, so it waits until they're loaded
    if (!hasLoadedSavedData) {
        return <main className="h-dvh bg-background" />;
    }

    return (
        // turns animations down for people who ask for less motion in their system settings
        <MotionConfig reducedMotion="user">
            <StudySession deckId={deckId} />
        </MotionConfig>
    );
}

function StudySession({ deckId }: { deckId: string }) {
    const { cards, decks, updateCards } = useStudyData();

    const deckCards = cards.filter((card) => card.deckId === deckId && card.deletedAt === null);
    const currentDeck = decks.find((deck) => deck.id === deckId);

    const [isAnswerShown, setIsAnswerShown] = useState(false);
    // built once when the session starts
    const [sessionQueue, setSessionQueue] = useState(() => dueCardIdsInOrder(deckCards, Date.now()));
    const [sessionCardCount] = useState(sessionQueue.length);
    const [pageOpenedAtMs] = useState(() => Date.now());
    const [forecastEndMs] = useState(() => forecastEndTimeMs(currentDeck?.examDate ?? null, Date.now()));
    const [isForecastToExam] = useState(() => {
        const examDate = currentDeck?.examDate ?? null;
        return examDate !== null && daysUntilExam(examDate, Date.now()) > 0;
    });
    const [rememberedPercentAtStart] = useState(() => percentRememberedAt(deckCards, forecastEndMs));
    const [sessionStartedAtMs, setSessionStartedAtMs] = useState<number | null>(null);
    const [sessionFinishedAtMs, setSessionFinishedAtMs] = useState<number | null>(null);
    // cards still being missed. a card leaves once it's gotten right
    const [missedCardIds, setMissedCardIds] = useState<string[]>([]);
    // every card forgotten at least once this session. nothing ever leaves
    const [forgottenCardIds, setForgottenCardIds] = useState<string[]>([]);
    // decides which way the old card flies off
    const [lastExit, setLastExit] = useState<CardExit | null>(null);
    // a forgotten card can come back as the very next card, so its id alone can't tell the two apart
    const [cardChangeCount, setCardChangeCount] = useState(0);
    // how wide the card and header are
    // remembered from last time. safe to read here because this only ever runs in the browser
    const [cardWidth, setCardWidth] = useState<CardWidth>(() => loadCardWidth());
    const [undoHistory, setUndoHistory] = useState<UndoSnapshot[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [deleteToastId, setDeleteToastId] = useState<number | null>(null);

    const dragControls = useDragControls();

    const currentCard = cards.find((card) => card.id === sessionQueue[0]);

    useEffect(() => {
        if (deleteToastId === null) return;
        const hideToastTimeoutId = setTimeout(() => setDeleteToastId(null), DELETE_TOAST_DURATION_MS);
        return () => clearTimeout(hideToastTimeoutId);
    }, [deleteToastId]);

    // the timer starts on the first reveal, not when the page opens
    const revealAnswer = () => {
        if (sessionStartedAtMs === null) {
            setSessionStartedAtMs(Date.now());
        }
        setIsAnswerShown(true);
    };

    const saveUndoSnapshot = (card: Card) => {
        setUndoHistory([
            ...undoHistory,
            { cardBefore: card, sessionQueue, missedCardIds, forgottenCardIds, sessionFinishedAtMs },
        ]);
    };

    const moveToNextCard = (updatedSessionQueue: string[], exit: CardExit | null) => {
        setSessionQueue(updatedSessionQueue);
        if (updatedSessionQueue.length === 0) {
            setSessionFinishedAtMs(Date.now());
        }
        setLastExit(exit);
        setCardChangeCount(cardChangeCount + 1);
        setIsAnswerShown(false);
        setIsInfoOpen(false);
    };

    const handleRatingClick = (rating: Rating) => {
        if (!currentCard) return;
        saveUndoSnapshot(currentCard);

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
        updateCards(cards.map((card) => (card.id === currentCard.id ? ratedCard : card)));

        moveToNextCard(queueAfterRating(sessionQueue, rating), rating);
    };

    const handleSkip = () => {
        if (!currentCard) return;
        saveUndoSnapshot(currentCard);

        setMissedCardIds(missedCardIds.filter((missedId) => missedId !== currentCard.id));
        moveToNextCard(
            sessionQueue.filter((cardId) => cardId !== currentCard.id),
            null,
        );
    };

    const handleDelete = () => {
        if (!currentCard) return;
        saveUndoSnapshot(currentCard);

        const deletedAtMs = Date.now();
        updateCards(cards.map((card) => (card.id === currentCard.id ? { ...card, deletedAt: deletedAtMs } : card)));

        setMissedCardIds(missedCardIds.filter((missedId) => missedId !== currentCard.id));
        moveToNextCard(
            sessionQueue.filter((cardId) => cardId !== currentCard.id),
            null,
        );
        setDeleteToastId(deletedAtMs);
    };

    const handleUndo = () => {
        const lastSnapshot = undoHistory.at(-1);
        if (!lastSnapshot) return;

        updateCards(cards.map((card) => (card.id === lastSnapshot.cardBefore.id ? lastSnapshot.cardBefore : card)));
        setSessionQueue(lastSnapshot.sessionQueue);
        setMissedCardIds(lastSnapshot.missedCardIds);
        setForgottenCardIds(lastSnapshot.forgottenCardIds);
        setSessionFinishedAtMs(lastSnapshot.sessionFinishedAtMs);
        setUndoHistory(undoHistory.slice(0, -1));
        setDeleteToastId(null);
        setIsInfoOpen(false);

        setLastExit(null);
        setCardChangeCount(cardChangeCount + 1);
        setIsAnswerShown(true);
    };

    const handleSaveEdit = (front: string, back: string) => {
        if (currentCard) {
            updateCards(cards.map((card) => (card.id === currentCard.id ? { ...card, front, back } : card)));
        }
        setIsEditing(false);
    };

    const handleSelectWidth = (width: CardWidth) => {
        setCardWidth(width);
        saveCardWidth(width);
    };

    const handleStudyAreaPointerDown = (event: ReactPointerEvent) => {
        if (isAnswerShown) {
            dragControls.start(event);
        }
    };

    // tapping anywhere below the header flips the card
    const handleStudyAreaClick = () => {
        if (!isAnswerShown) {
            revealAnswer();
        }
    };

    // Space shows the answer, 1-3 rate it
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (isEditing) return;

            if (isInfoOpen) {
                if (event.key === "Escape") {
                    setIsInfoOpen(false);
                }
                return;
            }

            if (event.key.toLowerCase() === "z" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                handleUndo();
                return;
            }

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

    const deleteToast = deleteToastId !== null && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+96px)] z-40 flex justify-center">
            <div
                className={`pointer-events-auto flex items-center gap-2 rounded-full py-2 pl-4 pr-2 text-sm text-secondary ${SOLID_PILL}`}
            >
                Card deleted
                <button
                    type="button"
                    onClick={handleUndo}
                    className="rounded-full px-2.5 py-1 font-semibold text-foreground pointer-fine:hover:bg-foreground/[0.05]"
                >
                    Undo
                </button>
            </div>
        </div>
    );

    if (!currentCard) {
        // if nothing was due when the deck opened, there was no session
        const hasStudiedThisSession = sessionCardCount > 0;
        const isDeckEmpty = deckCards.length === 0;
        const summaryTimeMs = sessionFinishedAtMs ?? pageOpenedAtMs;

        const headerText = hasStudiedThisSession
            ? "Session complete"
            : isDeckEmpty
                ? "No cards yet"
                : "Nothing due right now";

        const nextDueAtMs =
            deckCards.length > 0 ? Math.min(...deckCards.map((card) => card.dueAt)) : null;

        const summaryRows: { label: string; note?: string; value: string; isWarning?: boolean }[] = [];
        if (hasStudiedThisSession) {
            const elapsedStudyTimeMs =
                sessionStartedAtMs === null ? 0 : Math.max(0, summaryTimeMs - sessionStartedAtMs);
            const rememberedPercentNow = percentRememberedAt(deckCards, forecastEndMs);
            if (rememberedPercentNow !== null) {
                const forecastDateText = new Date(forecastEndMs).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                });
                summaryRows.push({
                    label: isForecastToExam ? `Remembered on exam day, ${forecastDateText}` : `Remembered on ${forecastDateText}`,
                    note:
                        rememberedPercentAtStart !== null && rememberedPercentNow > rememberedPercentAtStart
                            ? `Up from ${rememberedPercentAtStart}%`
                            : undefined,
                    value: `${rememberedPercentNow}%`,
                });
            }
            summaryRows.push(
                { label: "Reviewed", value: `${sessionCardCount}` },
                { label: "Forgotten", value: `${forgottenCardIds.length}`, isWarning: forgottenCardIds.length > 0 },
                { label: "Time studied", value: formatStopwatch(elapsedStudyTimeMs) },
            );
        }
        if (nextDueAtMs !== null) {
            summaryRows.push({
                label: "Next card due in",
                value: formatDuration(Math.max(0, nextDueAtMs - summaryTimeMs)),
            });
        }

        return (
            <main className="relative flex min-h-dvh flex-col items-center bg-background text-foreground antialiased">
                <div className="mt-6 w-full max-w-xl px-4 sm:mt-[16vh]">
                    <div className="overflow-hidden rounded-[22px] bg-surface ring-1 ring-foreground/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-16px_rgba(0,0,0,0.14)]">
                        <div className="px-6 pb-2 pt-6">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.05] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
                                {hasStudiedThisSession ? <Check className="h-3 w-3" /> : <Coffee className="h-3 w-3" />}
                                {headerText}
                            </span>
                        </div>

                        {summaryRows.length > 0 && (
                            <dl className="divide-y divide-foreground/[0.05] px-6 pb-2">
                                {summaryRows.map((row) => (
                                    <div key={row.label} className="flex items-center justify-between py-3.5 text-[15px]">
                                        <dt className="text-muted">
                                            {row.label}
                                            {row.note && <span className="block text-[13px] text-faint">{row.note}</span>}
                                        </dt>
                                        <dd
                                            className={`font-semibold tabular-nums tracking-tight ${
                                                row.isWarning ? "text-danger" : "text-foreground"
                                            }`}
                                        >
                                            {row.value}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        )}
                    </div>

                    <div className="mt-6 flex justify-center gap-2">
                        {undoHistory.length > 0 && (
                            <motion.button
                                type="button"
                                onClick={handleUndo}
                                whileHover={{ y: -1 }}
                                whileTap={{ scale: 0.95 }}
                                transition={SPRING}
                                className={`inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-sm font-semibold text-foreground ${SOLID_PILL}`}
                            >
                                <Undo2 className="h-4 w-4" />
                                Undo
                            </motion.button>
                        )}
                        <MotionLink
                            href={`/deck/${deckId}`}
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.95 }}
                            transition={SPRING}
                            className={`inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-sm font-semibold text-foreground ${SOLID_PILL}`}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to deck
                        </MotionLink>
                    </div>
                </div>

                {deleteToast}
            </main>
        );
    }

    const finishedCardCount = sessionCardCount - sessionQueue.length;
    const missedProgressPercent =
        sessionCardCount > 0 ? (missedCardIds.length / sessionCardCount) * 100 : 0;
    const sessionProgressPercent =
        sessionCardCount > 0 ? (finishedCardCount / sessionCardCount) * 100 : 0;

    return (
        <main className="relative flex h-dvh flex-col overflow-hidden overscroll-none bg-background text-foreground antialiased">
            {/* floats on top, so the card shows through the glass when it scrolls under */}
            <header className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-3 sm:px-6 sm:pt-5">
                <motion.div
                    initial={false}
                    animate={{ maxWidth: CARD_MAX_WIDTH_PX[cardWidth] }}
                    transition={SOFT_SPRING}
                    className={`pointer-events-auto mx-auto flex items-center gap-2 rounded-full p-1.5 pr-3 ${GLASS}`}
                >
                    <MotionLink
                        href={`/deck/${deckId}`}
                        aria-label="Back to deck"
                        whileTap={{ scale: 0.88 }}
                        transition={SPRING}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-secondary"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </MotionLink>

                    <div className="min-w-0 flex-1 px-1">
                        <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                                {currentDeck?.name}
                            </p>
                            <p className="flex shrink-0 items-baseline gap-1 text-xs text-muted">
                                <span className="font-semibold tabular-nums text-foreground">{finishedCardCount}</span>
                                of <span className="tabular-nums">{sessionCardCount}</span>
                            </p>
                        </div>
                        <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-foreground/[0.07]">
                            <motion.div
                                initial={false}
                                animate={{ width: `${sessionProgressPercent}%` }}
                                transition={SOFT_SPRING}
                                className="h-full bg-accent"
                            />
                            <motion.div
                                initial={false}
                                animate={{ width: `${missedProgressPercent}%` }}
                                transition={SOFT_SPRING}
                                className="h-full bg-danger"
                            />
                        </div>
                    </div>

                    {/* phones don't get this. the card is already full width there */}
                    <div className="hidden md:block">
                        <CardWidthSwitcher selectedWidth={cardWidth} onSelectWidth={handleSelectWidth} />
                    </div>

                    {missedCardIds.length > 0 && (
                        <span className="flex h-7 shrink-0 items-center gap-1 rounded-full bg-danger/10 px-2.5 text-sm font-semibold tabular-nums text-danger">
                            <X className="h-3.5 w-3.5 shrink-0" strokeWidth={2.75} />
                            {missedCardIds.length}
                        </span>
                    )}

                    <span className="flex min-w-[72px] shrink-0 items-center justify-end gap-1.5 pl-1 text-sm tabular-nums text-secondary">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <Stopwatch startedAtMs={sessionStartedAtMs} finishedAtMs={sessionFinishedAtMs} />
                    </span>
                </motion.div>
            </header>

            <div
                onClick={handleStudyAreaClick}
                onPointerDown={handleStudyAreaPointerDown}
                className={`flex min-h-0 flex-1 select-none flex-col overflow-y-auto pt-[72px] sm:pt-[88px] ${isAnswerShown ? "touch-none" : "cursor-pointer"}`}
            >
                <motion.div
                    initial={false}
                    animate={{ maxWidth: CARD_MAX_WIDTH_PX[cardWidth] }}
                    transition={SOFT_SPRING}
                    className="mx-auto flex w-full flex-1 flex-col px-3 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-[5vh]"
                >
                    {/* relative so the old card can fly off while the new one comes in */}
                    <div className="relative">
                        <AnimatePresence mode="popLayout" custom={lastExit} initial={false}>
                            <StudyCard
                                key={`${currentCard.id}:${cardChangeCount}`}
                                card={currentCard}
                                isAnswerShown={isAnswerShown}
                                isEnterAnimated={lastExit !== null}
                                onRate={handleRatingClick}
                                dragControls={dragControls}
                            />
                        </AnimatePresence>
                    </div>

                    <div className="mt-5 flex h-10 justify-center">
                        {/* computers: which keys do what */}
                        <div
                            className={`hidden w-[280px] items-center justify-center rounded-full text-xs text-secondary pointer-fine:flex ${SOLID_PILL}`}
                        >
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.span
                                    key={isAnswerShown ? "rate" : "reveal"}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    transition={{ duration: 0.15 }}
                                    className="flex items-center gap-4"
                                >
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
                                </motion.span>
                            </AnimatePresence>
                        </div>

                        {/* phones */}
                        <motion.p
                            initial={false}
                            animate={{ opacity: isAnswerShown ? 0 : 1, y: isAnswerShown ? 6 : 0 }}
                            transition={SPRING}
                            className={`hidden items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm text-secondary pointer-coarse:flex ${SOLID_PILL}`}
                        >
                            <Hand className="h-4 w-4" />
                            Tap anywhere to reveal the answer
                        </motion.p>
                    </div>

                    <div className="flex-1" />

                    <div className="relative flex justify-center pt-6">
                        {isInfoOpen && <CardInfoPanel card={currentCard} onClose={() => setIsInfoOpen(false)} />}
                        <StudyToolbar
                            canUndo={undoHistory.length > 0}
                            isInfoOpen={isInfoOpen}
                            onUndo={handleUndo}
                            onEdit={() => setIsEditing(true)}
                            onSkip={handleSkip}
                            onInfo={() => setIsInfoOpen(!isInfoOpen)}
                            onDelete={handleDelete}
                        />
                    </div>
                </motion.div>
            </div>

            {deleteToast}

            {isEditing && (
                <EditCardSheet card={currentCard} onSave={handleSaveEdit} onClose={() => setIsEditing(false)} />
            )}
        </main>
    );
}