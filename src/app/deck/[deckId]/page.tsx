"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, ChevronLeft, Play, Plus, Search, Trash2 } from "lucide-react";
import { useStudyData } from "@/data/StudyDataProvider";
import { createUnstudiedCard } from "@/data/createUnstudiedCard";
import { dueCardIdsInOrder } from "@/scheduler/sessionQueue";
import { averageRecallChance, memoryPercentForecast } from "@/scheduler/averageRecallChance";
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
    const { cards, decks, hasLoadedSavedData, updateCards } = useStudyData();
    const [openCardId, setOpenCardId] = useState<string | null>(null);
    const [searchText, setSearchText] = useState("");

    const frontTextBoxRef = useRef<HTMLTextAreaElement>(null);
    const backTextBoxRef = useRef<HTMLTextAreaElement>(null);
    // only new cards should grab the cursor
    const shouldFocusFrontRef = useRef(false);

    const currentTimeMs = Date.now();

    const deckCards = cards.filter((card) => card.deckId === deckId && card.deletedAt === null);
    const dueCardCount = dueCardIdsInOrder(deckCards, currentTimeMs).length;
    const deckMemoryPercent = memoryPercentForecast(deckCards, currentTimeMs);

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
        return <main className="h-dvh bg-neutral-50" />;
    }

    if (!currentDeck) {
        return (
            <main className="flex h-dvh flex-col items-center justify-center gap-3 bg-neutral-50 p-8 text-[15px] text-neutral-500">
                <p>Deck not found</p>
                <Link href="/" className="font-medium text-neutral-900 hover:underline">
                    Back to decks
                </Link>
            </main>
        );
    }

    const studyLink = `/deck/${deckId}/study`;
    const openCardRecallPercent =
        openCard !== null && openCard.reviewCount > 0
            ? Math.round(averageRecallChance([openCard], currentTimeMs) * 100)
            : null;

    return (
        <main className="flex h-dvh bg-neutral-50 text-neutral-900">
            {/* phones hide the list while a card is open */}
            <section
                className={`${openCard ? "hidden md:flex" : "flex"} w-full flex-col md:w-120 md:shrink-0 md:border-r md:border-neutral-200`}
            >
                <div className="px-4 pt-3 md:pt-4">
                    <Link
                        href="/"
                        className="-ml-1.5 inline-flex h-8 items-center gap-0.5 rounded-md pl-0.5 pr-2 text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 md:hidden"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Decks
                    </Link>

                    <div className="mt-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h1 className="truncate text-[28px] font-semibold tracking-tight md:text-xl">
                                {currentDeck.name}
                            </h1>
                            <p className="mt-1 text-sm text-neutral-500">
                                <span className="font-medium text-neutral-900">{dueCardCount} due</span> ·{" "}
                                {deckCards.length} {deckCards.length === 1 ? "card" : "cards"} · {deckMemoryPercent}% memory
                            </p>
                        </div>

                        <Link
                            href={studyLink}
                            className="hidden h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-800 md:flex"
                        >
                            <Play className="h-3 w-3 fill-current" />
                            Review
                        </Link>
                    </div>

                    <div className="mt-4 flex gap-2">
                        <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg bg-neutral-100 px-3 text-neutral-400 focus-within:bg-white focus-within:ring-1 focus-within:ring-neutral-300">
                            <Search className="h-4 w-4 shrink-0" />
                            <input
                                value={searchText}
                                onChange={(event) => setSearchText(event.target.value)}
                                placeholder="Search cards"
                                className="min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
                            />
                        </label>
                        <button
                            onClick={createBlankCard}
                            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-neutral-50"
                        >
                            <Plus className="h-4 w-4" />
                            New
                            <kbd className="ml-0.5 hidden rounded border border-neutral-200 px-1 font-sans text-[10px] text-neutral-400 pointer-fine:inline">
                                N
                            </kbd>
                        </button>
                    </div>
                </div>

                {/* pt-1 keeps the first card's border from getting cut off */}
                <ul className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-28 pt-1 md:pb-4">
                    {visibleCards.map((card) => {
                        const isOpen = card.id === openCardId;
                        const isDue = isCardDue(card, currentTimeMs);
                        const isFrontEmpty = card.front.trim() === "";
                        const isBackEmpty = card.back.trim() === "";

                        return (
                            <li key={card.id}>
                                <button
                                    onClick={() => switchOpenCard(card.id)}
                                    className={`w-full rounded-xl border bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors ${
                                        isOpen
                                            ? "border-neutral-500 shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                                            : "border-neutral-200 hover:border-neutral-500 hover:bg-neutral-100"
                                    }`}
                                >
                                    <p
                                        className={`line-clamp-2 text-[15px] font-medium leading-snug ${isFrontEmpty ? "text-neutral-400" : ""}`}
                                    >
                                        {isFrontEmpty ? "Untitled card" : card.front}
                                    </p>

                                    <div className="my-2.5 border-t border-dashed border-neutral-200" />

                                    <p
                                        className={`line-clamp-2 text-sm leading-snug ${isBackEmpty ? "text-neutral-300" : "text-neutral-500"}`}
                                    >
                                        {isBackEmpty ? "No answer yet" : card.back}
                                    </p>

                                    <p
                                        className={`mt-2.5 text-xs ${isDue ? "font-medium text-neutral-900" : "text-neutral-400"}`}
                                    >
                                        {isDue && (
                                            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-neutral-900 align-middle" />
                                        )}
                                        {describeCardStatus(card, currentTimeMs)}
                                    </p>
                                </button>
                            </li>
                        );
                    })}

                    {deckCards.length === 0 && (
                        <li className="px-3 py-6 text-center text-sm text-neutral-400">
                            No cards yet. Tap New to make one.
                        </li>
                    )}
                    {deckCards.length > 0 && visibleCards.length === 0 && (
                        <li className="px-3 py-6 text-center text-sm text-neutral-400">No cards match your search.</li>
                    )}
                </ul>

                {/* phones get the Review button at the bottom */}
                <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200/70 bg-neutral-50/90 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:hidden">
                    <Link
                        href={studyLink}
                        className={`flex h-12 items-center justify-center gap-2 rounded-xl text-base font-medium ${
                            dueCardCount > 0
                                ? "bg-neutral-900 text-white active:bg-neutral-800"
                                : "bg-neutral-200/70 text-neutral-500"
                        }`}
                    >
                        <Play className="h-4 w-4 fill-current" />
                        {dueCardCount > 0 ? `Review · ${dueCardCount} due` : "Nothing due"}
                    </Link>
                </div>
            </section>

            {/* the open card. phones only show this while a card is open */}
            <section className={`${openCard ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col bg-white`}>
                {openCard ? (
                    <>
                        <div className="flex h-12 shrink-0 items-center gap-1 border-b border-neutral-100 px-2">
                            <button
                                onClick={() => switchOpenCard(null)}
                                className="flex h-9 items-center gap-0.5 rounded-lg pl-1 pr-2.5 text-[15px] text-neutral-500 hover:bg-neutral-100 md:hidden"
                            >
                                <ChevronLeft className="h-5 w-5" />
                                Cards
                            </button>
                            <div className="flex-1" />
                            <span className="flex items-center gap-1 px-2 text-xs text-neutral-400">
                                <Check className="h-3.5 w-3.5" />
                                Saved
                            </span>
                            <button
                                onClick={deleteOpenCard}
                                aria-label="Move card to trash"
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
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
                                    className="mt-2 block w-full resize-none bg-transparent text-2xl font-medium leading-snug tracking-tight outline-none field-sizing-content placeholder:text-neutral-300"
                                />

                                <div className="my-8 border-t border-dashed border-neutral-200" />

                                <textarea
                                    ref={backTextBoxRef}
                                    value={openCard.back}
                                    onChange={(event) => editOpenCard("back", event.target.value)}
                                    onKeyDown={handleBackKeyDown}
                                    enterKeyHint="done"
                                    placeholder="Answer"
                                    rows={3}
                                    className="mt-2 block min-h-[4lh] w-full resize-none bg-transparent text-lg leading-relaxed text-neutral-700 outline-none field-sizing-content placeholder:text-neutral-300"
                                />
                            </div>
                        </div>

                        <div className="flex w-full max-w-2xl shrink-0 gap-6 border-t border-neutral-100 px-5 py-3 text-xs text-neutral-400 md:px-10">
                            <span>Reviewed {openCard.reviewCount}×</span>
                            <span>{describeCardStatus(openCard, currentTimeMs)}</span>
                            {openCardRecallPercent !== null && <span>Recall {openCardRecallPercent}%</span>}
                            <span className="ml-auto hidden pointer-fine:inline">Enter next · Shift+Enter new line</span>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center text-sm text-neutral-400">
                        <p>Pick a card to edit it</p>
                        <p className="hidden pointer-fine:block">
                            or press{" "}
                            <kbd className="rounded border border-neutral-200 px-1 font-sans text-xs">N</kbd> for a new one
                        </p>
                    </div>
                )}
            </section>
        </main>
    );
}