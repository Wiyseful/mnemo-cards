"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type { Transition, Variants } from "motion/react";
import { ArrowLeft, Check, ChevronLeft, Clock, Coffee, Hand, X } from "lucide-react";
import CardWidthSwitcher from "@/components/CardWidthSwitcher";
import type { CardWidth } from "@/components/CardWidthSwitcher";
import { useStudyData } from "@/data/StudyDataProvider";
import { loadCardWidth, saveCardWidth } from "@/data/settingsStorage";
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

const RATING_FOR_KEY: Record<string, Rating> = {
    "1": "Again",
    "2": "Good",
    "3": "Easy",
};

// quick and snappy, for things you press
const SPRING: Transition = { type: "spring", stiffness: 420, damping: 34, mass: 0.9 };
// slower and softer, for things that grow
const SOFT_SPRING: Transition = { type: "spring", stiffness: 240, damping: 30 };

// where a rated card flies. same directions as the swipes will be
const EXIT_MOTION: Record<Rating, { x: number; y: number; rotate: number }> = {
    Again: { x: -160, y: 10, rotate: -6 },
    Hard: { x: 0, y: -100, rotate: 0 },
    Good: { x: 0, y: -100, rotate: 0 },
    Easy: { x: 160, y: 10, rotate: 6 },
};

const CARD_VARIANTS: Variants = {
    enter: { opacity: 0, y: 28, scale: 0.96 },
    center: { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 },
    exit: (lastRating: Rating | null) => ({
        opacity: 0,
        scale: 0.94,
        ...(lastRating ? EXIT_MOTION[lastRating] : { y: -40 }),
    }),
};

// frosted glass. the page shows through it as it scrolls underneath
const GLASS =
    "bg-white/70 backdrop-blur-xl backdrop-saturate-150 ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)]";

const KEY_STYLE =
    "inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-md bg-white px-1.5 font-sans text-[11px] font-semibold text-neutral-600 ring-1 ring-black/10 shadow-[0_1px_0_rgba(0,0,0,0.10)]";

const MotionLink = motion.create(Link);

const CARD_MAX_WIDTH_PX: Record<CardWidth, number> = {
    narrow: 576,
    normal: 768,
    wide: 1024,
};

// 245000 ms -> "4:05"
function formatStopwatch(durationMs: number): string {
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// the old number slides up and out as the new one slides in
function RollingNumber({ value }: { value: number }) {
    return (
        <span className="relative inline-flex overflow-hidden tabular-nums">
            <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                    key={value}
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: "0%", opacity: 1 }}
                    exit={{ y: "-100%", opacity: 0 }}
                    transition={SPRING}
                >
                    {value}
                </motion.span>
            </AnimatePresence>
        </span>
    );
}

export default function StudyPage() {
    const { deckId } = useParams<{ deckId: string }>();
    const { hasLoadedSavedData } = useStudyData();

    // StudySession builds its queue from the cards, so it waits until they're loaded
    if (!hasLoadedSavedData) {
        return <main className="h-dvh bg-neutral-50" />;
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
    const [sessionStartedAtMs, setSessionStartedAtMs] = useState<number | null>(null);
    const [sessionFinishedAtMs, setSessionFinishedAtMs] = useState<number | null>(null);
    const [currentTimeMs, setCurrentTimeMs] = useState(Date.now());
    // cards still being missed. a card leaves once it's gotten right
    const [missedCardIds, setMissedCardIds] = useState<string[]>([]);
    // every card forgotten at least once this session. nothing ever leaves
    const [forgottenCardIds, setForgottenCardIds] = useState<string[]>([]);
    // decides which way the old card flies off
    const [lastRating, setLastRating] = useState<Rating | null>(null);
    // a forgotten card can come back as the very next card, so its id alone can't tell the two apart
    const [ratingCount, setRatingCount] = useState(0);
    // how wide the card and header are
    // remembered from last time. safe to read here because this only ever runs in the browser
    const [cardWidth, setCardWidth] = useState<CardWidth>(() => loadCardWidth());

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
        updateCards(cards.map((card) => (card.id === currentCard.id ? ratedCard : card)));

        const updatedSessionQueue = queueAfterRating(sessionQueue, rating);
        setSessionQueue(updatedSessionQueue);
        if (updatedSessionQueue.length === 0) {
            setSessionFinishedAtMs(Date.now());
        }

        setLastRating(rating);
        setRatingCount(ratingCount + 1);
        setIsAnswerShown(false);
    };

    const handleSelectWidth = (width: CardWidth) => {
        setCardWidth(width);
        saveCardWidth(width);
    };

    // tapping anywhere below the header flips the card
    const handleStudyAreaClick = () => {
        if (!isAnswerShown) {
            revealAnswer();
        }
    };

    useEffect(() => {
        const tickIntervalId = setInterval(() => setCurrentTimeMs(Date.now()), 1000);
        return () => clearInterval(tickIntervalId);
    }, []);

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
                { label: `Retention in ${MEMORY_FORECAST_DAYS} days`, value: `${deckMemoryPercent}%` },
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
            <main className="flex min-h-dvh flex-col items-center bg-neutral-50 text-neutral-900 antialiased">
                <motion.div
                    initial={{ opacity: 0, y: 24, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={SOFT_SPRING}
                    className="mt-6 w-full max-w-xl px-4 sm:mt-[16vh]"
                >
                    <div className="overflow-hidden rounded-[22px] bg-white ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-16px_rgba(0,0,0,0.14)]">
                        <div className="px-6 pb-2 pt-6">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                                {hasStudiedThisSession ? <Check className="h-3 w-3" /> : <Coffee className="h-3 w-3" />}
                                {headerText}
                            </span>
                        </div>

                        {summaryRows.length > 0 && (
                            // each row slides in a beat after the one above it
                            <motion.dl
                                initial="hidden"
                                animate="shown"
                                variants={{ shown: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } }}
                                className="divide-y divide-black/[0.05] px-6 pb-2"
                            >
                                {summaryRows.map((row) => (
                                    <motion.div
                                        key={row.label}
                                        variants={{ hidden: { opacity: 0, y: 8 }, shown: { opacity: 1, y: 0 } }}
                                        transition={SPRING}
                                        className="flex items-center justify-between py-3.5 text-[15px]"
                                    >
                                        <dt className="text-neutral-500">{row.label}</dt>
                                        <dd
                                            className={`font-semibold tabular-nums tracking-tight ${
                                                row.isWarning ? "text-red-500" : "text-neutral-900"
                                            }`}
                                        >
                                            {row.value}
                                        </dd>
                                    </motion.div>
                                ))}
                            </motion.dl>
                        )}
                    </div>

                    <div className="mt-6 flex justify-center">
                        <MotionLink
                            href={`/deck/${deckId}`}
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.95 }}
                            transition={SPRING}
                            className={`relative inline-flex h-11 items-center gap-1.5 overflow-hidden rounded-full px-5 text-sm font-semibold text-neutral-800 ${GLASS}`}
                        >
                            <ArrowLeft className="relative h-4 w-4" />
                            <span className="relative">Back to deck</span>
                        </MotionLink>
                    </div>
                </motion.div>
            </main>
        );
    }

    const finishedCardCount = sessionCardCount - sessionQueue.length;
    const missedProgressPercent =
        sessionCardCount > 0 ? (missedCardIds.length / sessionCardCount) * 100 : 0;
    const sessionProgressPercent =
        sessionCardCount > 0 ? (finishedCardCount / sessionCardCount) * 100 : 0;

    // "3d": when the card would come back with this rating
    const timeUntilDueText = (rating: Rating) => {
        const currentTimeMs = Date.now();
        const cardIfRated = applyRating(currentCard, rating, currentTimeMs);
        return formatDuration(cardIfRated.dueAt - currentTimeMs);
    };

    return (
        <main className="relative flex h-dvh flex-col overflow-hidden bg-neutral-50 text-neutral-900 antialiased">
            {/* floats on top, so the card shows through the glass when it scrolls under */}
            <header className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-3 sm:px-6 sm:pt-5">
                <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0, maxWidth: CARD_MAX_WIDTH_PX[cardWidth] }}
                    transition={SOFT_SPRING}
                    className={`pointer-events-auto mx-auto flex items-center gap-2 rounded-full p-1.5 pr-3 ${GLASS}`}
                >
                    <MotionLink
                        href={`/deck/${deckId}`}
                        aria-label="Back to deck"
                        whileTap={{ scale: 0.88 }}
                        transition={SPRING}
                        className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-neutral-700"
                    >
                        <ChevronLeft className="relative h-5 w-5" />
                    </MotionLink>

                    <div className="min-w-0 flex-1 px-1">
                        <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate text-sm font-semibold tracking-tight text-neutral-800">
                                {currentDeck?.name}
                            </p>
                            <p className="flex shrink-0 items-baseline gap-1 text-xs text-neutral-500">
                                <span className="font-semibold text-neutral-800">
                                    <RollingNumber value={finishedCardCount} />
                                </span>
                                of <span className="tabular-nums">{sessionCardCount}</span>
                            </p>
                        </div>
                        <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-black/[0.07]">
                            <motion.div
                                initial={false}
                                animate={{ width: `${sessionProgressPercent}%` }}
                                transition={SOFT_SPRING}
                                className="h-full rounded-full bg-neutral-900"
                            />
                            <motion.div
                                initial={false}
                                animate={{ width: `${missedProgressPercent}%` }}
                                transition={SOFT_SPRING}
                                className="h-full rounded-r-full bg-red-400"
                            />
                        </div>
                    </div>

                    {/* phones don't get this. the card is already full width there */}
                    <div className="hidden md:block">
                        <CardWidthSwitcher selectedWidth={cardWidth} onSelectWidth={handleSelectWidth} />
                    </div>

                    <AnimatePresence initial={false}>
                        {missedCardIds.length > 0 && (
                            <motion.span
                                initial={{ opacity: 0, scale: 0.5, width: 0 }}
                                animate={{ opacity: 1, scale: 1, width: "auto" }}
                                exit={{ opacity: 0, scale: 0.5, width: 0 }}
                                transition={SPRING}
                                className="flex h-7 shrink-0 items-center gap-1 overflow-hidden rounded-full bg-red-500/10 px-2.5 text-sm font-semibold text-red-600"
                            >
                                <X className="h-3.5 w-3.5 shrink-0" strokeWidth={2.75} />
                                <RollingNumber value={missedCardIds.length} />
                            </motion.span>
                        )}
                    </AnimatePresence>

                    <span className="flex shrink-0 items-center gap-1.5 pl-1 text-sm tabular-nums text-neutral-600">
                        <Clock className="h-3.5 w-3.5" />
                        {formatStopwatch(elapsedStudyTimeMs)}
                    </span>
                </motion.div>
            </header>

            <div
                onClick={handleStudyAreaClick}
                className={`flex min-h-0 flex-1 flex-col overflow-y-auto pt-[72px] sm:pt-[88px] ${isAnswerShown ? "" : "cursor-pointer"}`}
            >
                <motion.div
                    initial={false}
                    animate={{ maxWidth: CARD_MAX_WIDTH_PX[cardWidth] }}
                    transition={SOFT_SPRING}
                    className="mx-auto flex w-full flex-1 flex-col px-3 pb-6 pt-4 sm:px-6 sm:pt-[5vh]"
                >
                    {/* relative so the old card can fly off while the new one comes in */}
                    <div className="relative">
                        <AnimatePresence mode="popLayout" custom={lastRating} initial={false}>
                            <motion.div
                                key={`${currentCard.id}:${ratingCount}`}
                                custom={lastRating}
                                variants={CARD_VARIANTS}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={SPRING}
                                className="relative overflow-hidden rounded-[22px] bg-white ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-16px_rgba(0,0,0,0.14)]"
                            >

                                <div className="relative px-7 py-9 sm:px-11 sm:py-12">
                                    <p className="whitespace-pre-wrap text-[22px] font-semibold leading-snug tracking-tight sm:text-2xl">
                                        {currentCard.front}
                                    </p>

                                    {/* the card grows to fit the answer instead of jumping */}
                                    <AnimatePresence initial={false}>
                                        {isAnswerShown && (
                                            <motion.div
                                                key="answer"
                                                initial={{ height: 0, opacity: 0, filter: "blur(6px)" }}
                                                animate={{ height: "auto", opacity: 1, filter: "blur(0px)" }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={SOFT_SPRING}
                                                className="overflow-hidden"
                                            >
                                                <div className="my-7 border-t-2 border-dashed border-black/[0.08]" />
                                                <p className="whitespace-pre-wrap text-lg leading-relaxed text-neutral-600">
                                                    {currentCard.back}
                                                </p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <AnimatePresence initial={false}>
                                    {isAnswerShown && (
                                        <motion.div
                                            key="ratings"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={SOFT_SPRING}
                                            className="relative overflow-hidden"
                                        >
                                            <div className="grid grid-cols-3 divide-x-[3px] divide-black/[0.05] border-t-[3px] border-black/[0.05] bg-neutral-50">
                                                {BUTTON_RATINGS.map((rating) => (
                                                    <motion.button
                                                        key={rating}
                                                        whileTap={{ scale: 0.94 }}
                                                        transition={SPRING}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            handleRatingClick(rating);
                                                        }}
                                                        className="relative flex h-16 flex-col items-center justify-center gap-0.5 overflow-hidden"
                                                    >
                                                        <span className="relative text-[15px] font-semibold tracking-tight text-neutral-800">
                                                            {BUTTON_LABEL_FOR_RATING[rating]}
                                                        </span>
                                                        <span className="relative text-xs tabular-nums text-neutral-400">
                                                            {timeUntilDueText(rating)}
                                                        </span>
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* computers: which keys do what */}
                    <div className="mt-5 hidden justify-center pointer-fine:flex">
                        <motion.div
                            layout
                            transition={SPRING}
                            className={`flex items-center rounded-full px-4 py-2 text-xs text-neutral-600 ${GLASS}`}
                        >
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.span
                                    key={isAnswerShown ? "rate" : "reveal"}
                                    initial={{ opacity: 0, y: 4, filter: "blur(4px)" }}
                                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                    exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
                                    transition={{ duration: 0.18 }}
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
                        </motion.div>
                    </div>

                    {/* phones */}
                    <AnimatePresence>
                        {!isAnswerShown && (
                            <motion.p
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 6 }}
                                transition={SPRING}
                                className={`mx-auto mb-2 mt-6 hidden items-center gap-1.5 rounded-full px-4 py-2 text-sm text-neutral-600 pointer-coarse:flex ${GLASS}`}
                            >
                                <Hand className="h-4 w-4" />
                                Tap anywhere to reveal the answer
                            </motion.p>
                        )}
                    </AnimatePresence>
                    <div className="flex-1" />
                </motion.div>
            </div>
        </main>
    );
}