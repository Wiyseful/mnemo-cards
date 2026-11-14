"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, ChevronLeft, Play, Plus, Search, Trash2 } from "lucide-react";
import { useStudyData } from "@/data/StudyDataProvider";
import { createUnstudiedCard } from "@/data/createUnstudiedCard";
import { dueCardIdsInOrder } from "@/scheduler/sessionQueue";
import { averageRecallChance } from "@/scheduler/averageRecallChance";
import { daysUntilExam, examDateToTimeMs, forecastEndTimeMs, memoryForecast } from "@/scheduler/memoryForecast";
import MemoryForecastChart from "@/components/MemoryForecastChart";
import { formatDuration } from "@/scheduler/formatDuration";
import type { Card } from "@/scheduler/types";

function describeCardStatus(card: Card, currentTimeMs: number): string {
    if (card.reviewCount === 0) return "New";
    if (card.dueAt <= currentTimeMs) return "Due now";
    return `Due in ${formatDuration(card.dueAt - currentTimeMs)}`;
}

// new cards show "New" instead
function isCardDue(card: Card, currentTimeMs: number): boolean {
    return card.reviewCount > 0 && card.dueAt <= currentTimeMs;
}

function toDateText(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

function isCardEmpty(card: Card): boolean {
    return card.front.trim() === "" && card.back.trim() === "";
}

function isTypingInTextBox(eventTarget: EventTarget | null): boolean {
    return eventTarget instanceof HTMLInputElement || eventTarget instanceof HTMLTextAreaElement;
}

// Shift+Enter still makes a new line
function isPlainEnter(event: ReactKeyboardEvent): boolean {
    return event.key === "Enter" && !event.shiftKey;
}

export default function DeckPage() {
    const { deckId } = useParams<{ deckId: string }>();
    const { cards, decks, hasLoadedSavedData, updateCards, updateDecks } = useStudyData();
    const [openCardId, setOpenCardId] = useState<string | null>(null);
    const [searchText, setSearchText] = useState("");

    const frontTextBoxRef = useRef<HTMLTextAreaElement>(null);
    const backTextBoxRef = useRef<HTMLTextAreaElement>(null);
    // only new cards should grab the cursor
    const shouldFocusFrontRef = useRef(false);
    const examDateInputRef = useRef<HTMLInputElement>(null);

    const currentTimeMs = Date.now();

    const deckCards = cards.filter((card) => card.deckId === deckId && card.deletedAt === null);
    const dueCardCount = dueCardIdsInOrder(deckCards, currentTimeMs).length;

    const searchTextLowercase = searchText.trim().toLowerCase();
    const visibleCards = deckCards
        .toReversed()
        .filter(
            (card) =>
                card.front.toLowerCase().includes(searchTextLowercase) ||
                card.back.toLowerCase().includes(searchTextLowercase),
        );

    const openCard = deckCards.find((card) => card.id === openCardId) ?? null;

    // drops the open card if nothing was typed in it
    const cardsWithoutEmptyOpenCard = () =>
        cards.filter((card) => !(card.id === openCardId && isCardEmpty(card)));

    const switchOpenCard = (nextCardId: string | null) => {
        const keptCards = cardsWithoutEmptyOpenCard();
        if (keptCards.length !== cards.length) {
            updateCards(keptCards);
        }
        setOpenCardId(nextCardId);
    };

    const createBlankCard = () => {
        const newCard = createUnstudiedCard(crypto.randomUUID(), deckId, "", "");
        updateCards([...cardsWithoutEmptyOpenCard(), newCard]);
        setSearchText(""); // an old search could hide the new card
        shouldFocusFrontRef.current = true;
        setOpenCardId(newCard.id);
    };

    const editOpenCard = (side: "front" | "back", text: string) => {
        updateCards(cards.map((card) => (card.id === openCardId ? { ...card, [side]: text } : card)));
    };

    const deleteOpenCard = () => {
        const deletedAtMs = Date.now();
        updateCards(cards.map((card) => (card.id === openCardId ? { ...card, deletedAt: deletedAtMs } : card)));
        setOpenCardId(null);
    };

    const handleFrontKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
        if (isPlainEnter(event)) {
            event.preventDefault();
            backTextBoxRef.current?.focus();
        }
    };

    const handleBackKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
        if (isPlainEnter(event)) {
            event.preventDefault();
            createBlankCard();
        }
    };

    useEffect(() => {
        if (shouldFocusFrontRef.current) {
            frontTextBoxRef.current?.focus();
            shouldFocusFrontRef.current = false;
        }
    }, [openCardId]);

    // N new card, Esc close, arrows move between cards
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && openCardId !== null) {
                switchOpenCard(null);
                return;
            }

            if (isTypingInTextBox(event.target)) return;

            const hasModifierKey = event.metaKey || event.ctrlKey || event.altKey;
            if (event.key.toLowerCase() === "n" && !hasModifierKey) {
                event.preventDefault(); // otherwise the "n" gets typed into the new card
                createBlankCard();
                return;
            }

            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                const openCardIndex = visibleCards.findIndex((card) => card.id === openCardId);
                const nextCardIndex = event.key === "ArrowDown" ? openCardIndex + 1 : openCardIndex - 1;
                const nextCard = visibleCards[Math.max(0, nextCardIndex)];
                if (nextCard) {
                    event.preventDefault();
                    switchOpenCard(nextCard.id);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    });

    const currentDeck = decks.find((deck) => deck.id === deckId);

    if (!hasLoadedSavedData) {
        return <main className="h-dvh bg-background" />;
    }

    if (!currentDeck) {
        return (
            <main className="flex h-dvh flex-col items-center justify-center gap-3 bg-background p-8 text-[15px] text-muted">
                <p>Deck not found</p>
                <Link href="/" className="font-medium text-foreground hover:underline">
                    Back to decks
                </Link>
            </main>
        );
    }

    const studyLink = `/deck/${deckId}/study`;

    const examDate = currentDeck.examDate;
    const daysLeftUntilExam = examDate === null ? null : daysUntilExam(examDate, currentTimeMs);
    const hasUpcomingExam = daysLeftUntilExam !== null && daysLeftUntilExam >= 0;
    const forecastEndMs = forecastEndTimeMs(examDate, currentTimeMs);
    const forecast = memoryForecast(deckCards, currentTimeMs, forecastEndMs);
    const forecastEndDateText = new Date(forecastEndMs).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const isForecastToExam = daysLeftUntilExam !== null && daysLeftUntilExam > 0;
    const todayAsDateText = toDateText(new Date(currentTimeMs));

    const examCountdownText =
        daysLeftUntilExam === 0 ? "Exam today" : daysLeftUntilExam === 1 ? "Exam tomorrow" : `Exam in ${daysLeftUntilExam} days`;

    const saveExamDate = (newExamDate: string | null) => {
        updateDecks(decks.map((deck) => (deck.id === deckId ? { ...deck, examDate: newExamDate } : deck)));
    };

    const openExamDatePicker = () => {
        try {
            examDateInputRef.current?.showPicker();
        } catch {
            examDateInputRef.current?.focus();
        }
    };
    const openCardRecallPercent =
        openCard !== null && openCard.reviewCount > 0
            ? Math.round(averageRecallChance([openCard], currentTimeMs) * 100)
            : null;

    return (
        <main className="flex h-dvh bg-background text-foreground">
            {/* phones hide the list while a card is open */}
            <section
                className={`${openCard ? "hidden md:flex" : "flex"} w-full flex-col md:w-120 md:shrink-0 md:border-r md:border-border`}
            >
                <div className="px-4 pt-3 md:pt-4">
                    <Link
                        href="/"
                        className="-ml-1.5 inline-flex h-8 items-center gap-0.5 rounded-md pl-0.5 pr-2 text-sm text-muted hover:bg-surface-muted hover:text-foreground md:hidden"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Decks
                    </Link>

                    <div className="mt-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h1 className="truncate text-[28px] font-semibold tracking-tight md:text-xl">
                                {currentDeck.name}
                            </h1>
                            <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-muted">
                                <span className="font-medium text-foreground">{dueCardCount} due</span>
                                <span>
                                    {deckCards.length} {deckCards.length === 1 ? "card" : "cards"}
                                </span>
                            </p>
                            <div className="relative mt-2 flex items-center gap-3 text-sm">
                                <input
                                    ref={examDateInputRef}
                                    type="date"
                                    min={todayAsDateText}
                                    value={hasUpcomingExam ? (examDate ?? "") : ""}
                                    onChange={(event) => saveExamDate(event.target.value || null)}
                                    aria-label="Exam date"
                                    tabIndex={-1}
                                    className="pointer-events-none absolute bottom-0 left-0 h-px w-px opacity-0"
                                />
                                {hasUpcomingExam ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={openExamDatePicker}
                                            className="font-medium text-foreground hover:underline"
                                        >
                                            {examCountdownText}
                                        </button>
                                        <span className="text-faint">
                                            {new Date(examDateToTimeMs(examDate!)).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => saveExamDate(null)}
                                            className="text-muted hover:text-foreground"
                                        >
                                            Remove
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={openExamDatePicker}
                                        className="font-medium text-foreground underline decoration-control-hover underline-offset-4 hover:decoration-foreground"
                                    >
                                        Add exam date
                                    </button>
                                )}
                            </div>
                        </div>

                        <Link
                            href={studyLink}
                            className="hidden h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-accent px-3 text-sm font-medium text-on-accent hover:bg-accent-hover md:flex"
                        >
                            <Play className="h-3 w-3 fill-current" />
                            Review
                        </Link>
                    </div>

                    <div className="mt-4 flex gap-2">
                        <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg bg-surface-muted px-3 text-faint focus-within:bg-surface focus-within:ring-1 focus-within:ring-control-hover">
                            <Search className="h-4 w-4 shrink-0" />
                            <input
                                value={searchText}
                                onChange={(event) => setSearchText(event.target.value)}
                                placeholder="Search cards"
                                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-faint"
                            />
                        </label>
                        <button
                            onClick={createBlankCard}
                            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-secondary shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-background"
                        >
                            <Plus className="h-4 w-4" />
                            New
                            <kbd className="ml-0.5 hidden rounded border border-border px-1 font-sans text-[10px] text-faint pointer-fine:inline">
                                N
                            </kbd>
                        </button>
                    </div>
                </div>

                {/* pt-1 keeps the first card's border from getting cut off */}
                <div className="mt-2 min-h-0 flex-1 overflow-y-auto pb-28 md:pb-4">
                {forecast !== null && (
                    <div className="px-4 pb-5 pt-2">
                        <MemoryForecastChart
                            forecast={forecast}
                            endLabel={forecastEndDateText}
                            axisEndLabel={isForecastToExam ? `Exam, ${forecastEndDateText}` : forecastEndDateText}
                        />
                    </div>
                )}
                <ul className="space-y-2 px-3 pt-1">
                    {visibleCards.map((card) => {
                        const isOpen = card.id === openCardId;
                        const isDue = isCardDue(card, currentTimeMs);
                        const isFrontEmpty = card.front.trim() === "";
                        const isBackEmpty = card.back.trim() === "";

                        return (
                            <li key={card.id}>
                                <button
                                    onClick={() => switchOpenCard(card.id)}
                                    className={`w-full rounded-xl border bg-surface p-3.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors ${
                                        isOpen
                                            ? "border-border-strong shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                                            : "border-border hover:border-border-strong hover:bg-surface-muted"
                                    }`}
                                >
                                    <p
                                        className={`line-clamp-2 text-[15px] font-medium leading-snug ${isFrontEmpty ? "text-faint" : ""}`}
                                    >
                                        {isFrontEmpty ? "Untitled card" : card.front}
                                    </p>

                                    <div className="my-2.5 border-t border-dashed border-border" />

                                    <p
                                        className={`line-clamp-2 text-sm leading-snug ${isBackEmpty ? "text-placeholder" : "text-muted"}`}
                                    >
                                        {isBackEmpty ? "No answer yet" : card.back}
                                    </p>

                                    <p
                                        className={`mt-2.5 text-xs ${isDue ? "font-medium text-foreground" : "text-faint"}`}
                                    >
                                        {isDue && (
                                            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" />
                                        )}
                                        {describeCardStatus(card, currentTimeMs)}
                                    </p>
                                </button>
                            </li>
                        );
                    })}

                    {deckCards.length === 0 && (
                        <li className="px-3 py-6 text-center text-sm text-faint">
                            No cards yet. Tap New to make one.
                        </li>
                    )}
                    {deckCards.length > 0 && visibleCards.length === 0 && (
                        <li className="px-3 py-6 text-center text-sm text-faint">No cards match your search.</li>
                    )}
                </ul>
                </div>

                {/* phones get the Review button at the bottom */}
                <div className="fixed inset-x-0 bottom-0 border-t border-border/70 bg-background/90 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:hidden">
                    <Link
                        href={studyLink}
                        className={`flex h-12 items-center justify-center gap-2 rounded-xl text-base font-medium ${
                            dueCardCount > 0
                                ? "bg-accent text-on-accent active:bg-accent-hover"
                                : "bg-control/70 text-muted"
                        }`}
                    >
                        <Play className="h-4 w-4 fill-current" />
                        {dueCardCount > 0 ? `Review · ${dueCardCount} due` : "Nothing due"}
                    </Link>
                </div>
            </section>

            {/* the open card. phones only show this while a card is open */}
            <section className={`${openCard ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col bg-surface`}>
                {openCard ? (
                    <>
                        <div className="flex h-12 shrink-0 items-center gap-1 border-b border-border px-2">
                            <button
                                onClick={() => switchOpenCard(null)}
                                className="flex h-9 items-center gap-0.5 rounded-lg pl-1 pr-2.5 text-[15px] text-muted hover:bg-surface-muted md:hidden"
                            >
                                <ChevronLeft className="h-5 w-5" />
                                Cards
                            </button>
                            <div className="flex-1" />
                            <span className="flex items-center gap-1 px-2 text-xs text-faint">
                                <Check className="h-3.5 w-3.5" />
                                Saved
                            </span>
                            <button
                                onClick={deleteOpenCard}
                                aria-label="Move card to trash"
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-faint hover:bg-surface-muted hover:text-secondary"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto">
                            <div className="w-full max-w-2xl px-5 pb-10 pt-6 md:px-10 md:pt-14">
                                <textarea
                                    ref={frontTextBoxRef}
                                    value={openCard.front}
                                    onChange={(event) => editOpenCard("front", event.target.value)}
                                    onKeyDown={handleFrontKeyDown}
                                    enterKeyHint="next"
                                    placeholder="Question"
                                    rows={1}
                                    className="mt-2 block w-full resize-none bg-transparent text-2xl font-medium leading-snug tracking-tight outline-none field-sizing-content placeholder:text-placeholder"
                                />

                                <div className="my-8 border-t border-dashed border-border" />

                                <textarea
                                    ref={backTextBoxRef}
                                    value={openCard.back}
                                    onChange={(event) => editOpenCard("back", event.target.value)}
                                    onKeyDown={handleBackKeyDown}
                                    enterKeyHint="done"
                                    placeholder="Answer"
                                    rows={3}
                                    className="mt-2 block min-h-[4lh] w-full resize-none bg-transparent text-lg leading-relaxed text-secondary outline-none field-sizing-content placeholder:text-placeholder"
                                />
                            </div>
                        </div>

                        <div className="flex w-full max-w-2xl shrink-0 gap-6 border-t border-border px-5 py-3 text-xs text-faint md:px-10">
                            <span>Reviewed {openCard.reviewCount}×</span>
                            <span>{describeCardStatus(openCard, currentTimeMs)}</span>
                            {openCardRecallPercent !== null && <span>Recall {openCardRecallPercent}%</span>}
                            <span className="ml-auto hidden pointer-fine:inline">Enter next · Shift+Enter new line</span>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center text-sm text-faint">
                        <p>Pick a card to edit it</p>
                        <p className="hidden pointer-fine:block">
                            or press{" "}
                            <kbd className="rounded border border-border px-1 font-sans text-xs">N</kbd> for a new one
                        </p>
                    </div>
                )}
            </section>
        </main>
    );
}