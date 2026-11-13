"use client";

import { useState } from "react";
import type { SubmitEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Brain, Folder, Plus, Trash2 } from "lucide-react";
import { useStudyData } from "@/data/StudyDataProvider";
import { dueCardIdsInOrder } from "@/scheduler/sessionQueue";
import { MEMORY_FORECAST_DAYS, memoryPercentForecast } from "@/scheduler/averageRecallChance";
import type { Deck } from "@/scheduler/types";

// compact in the sidebar, roomier on the home page
export default function DeckList({ isInSidebar = false }: { isInSidebar?: boolean }) {
    const { cards, decks, hasLoadedSavedData, updateCards, updateDecks } = useStudyData();
    const [newDeckName, setNewDeckName] = useState("");

    // on the home page there's no deck in the address, so this is undefined
    const { deckId: openDeckId } = useParams<{ deckId?: string }>();

    const createDeck = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (newDeckName.trim() === "") return;

        const newDeck: Deck = {
            id: crypto.randomUUID(),
            name: newDeckName.trim(),
            parentDeckId: null,
            deletedAt: null,
        };

        updateDecks([...decks, newDeck]);
        setNewDeckName("");
    };

    // the deck and its cards go to the trash with the same time, so they can be restored together
    const deleteDeck = (deckId: string) => {
        const deletedAtMs = Date.now();

        updateDecks(decks.map((deck) => (deck.id === deckId ? { ...deck, deletedAt: deletedAtMs } : deck)));
        updateCards(cards.map((card) => (card.deckId === deckId ? { ...card, deletedAt: deletedAtMs } : card)));
    };

    const remainingDecks = decks.filter((deck) => deck.deletedAt === null);

    const cardsInDeck = (deckId: string) =>
        cards.filter((card) => card.deckId === deckId && card.deletedAt === null);

    const dueCardCountForDeck = (deckId: string) =>
        dueCardIdsInOrder(cardsInDeck(deckId), Date.now()).length;

    const memoryPercentForDeck = (deckId: string) =>
        memoryPercentForecast(cardsInDeck(deckId), Date.now());

    if (!hasLoadedSavedData) return null;

    const rowTextClass = isInSidebar
        ? "gap-2 px-2.5 py-1.5 text-sm"
        : "gap-2 px-2.5 py-2.5 text-sm sm:gap-3 sm:px-4 sm:py-3 sm:text-lg";
    const iconClass = isInSidebar ? "h-4 w-4" : "h-4 w-4 sm:h-5 sm:w-5";
    const smallTextClass = isInSidebar ? "text-xs" : "text-xs sm:text-sm";

    return (
        <nav>
            <p
                className={`mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-wider text-neutral-400 ${isInSidebar ? "" : "sm:mb-3 sm:px-4 sm:text-xs"}`}
            >
                Decks
            </p>

            <ul className="space-y-0.5">
                {remainingDecks.map((deck) => {
                    const dueCardCount = dueCardCountForDeck(deck.id);
                    const isDeckEmpty = cardsInDeck(deck.id).length === 0;
                    const isOpenDeck = deck.id === openDeckId;

                    return (
                        <li
                            key={deck.id}
                            className={`group flex items-center rounded-md ${
                                isOpenDeck ? "bg-black/[0.06]" : "hover:bg-black/[0.04]"
                            }`}
                        >
                            <Link
                                href={`/deck/${deck.id}`}
                                className={`flex min-w-0 flex-1 items-center ${rowTextClass} ${
                                    isOpenDeck ? "font-medium text-neutral-900" : "text-neutral-700"
                                }`}
                            >
                                <Folder className={`${iconClass} shrink-0 fill-current text-neutral-400`} />
                                <span className="flex-1 truncate">{deck.name}</span>

                                {isDeckEmpty ? (
                                    <span className={`${smallTextClass} text-neutral-400`}>empty</span>
                                ) : (
                                    <>
                                        {/* the sidebar is too narrow for memory %, so only the due count shows there */}
                                        {!isInSidebar && (
                                            <span
                                                className={`flex items-center gap-1 ${smallTextClass} tabular-nums text-neutral-400`}
                                                title={`Average chance you'd remember each card in ${MEMORY_FORECAST_DAYS} days`}
                                            >
                                                <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                {memoryPercentForDeck(deck.id)}%
                                            </span>
                                        )}

                                        {dueCardCount > 0 && (
                                            <span
                                                className={`rounded-full bg-neutral-200/80 px-2 py-0.5 font-medium tabular-nums text-neutral-600 ${
                                                    isInSidebar ? "text-[11px]" : "text-[11px] sm:px-2.5 sm:text-sm"
                                                }`}
                                            >
                                                {dueCardCount} due
                                            </span>
                                        )}
                                    </>
                                )}
                            </Link>

                            <button
                                onClick={() => deleteDeck(deck.id)}
                                aria-label={`Move ${deck.name} to trash`}
                                className="mr-1.5 rounded p-1 text-neutral-400 opacity-0 hover:bg-black/[0.06] hover:text-neutral-700 group-hover:opacity-100 pointer-coarse:opacity-100"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </li>
                    );
                })}

                <li>
                    <form
                        onSubmit={createDeck}
                        className={`flex items-center rounded-md hover:bg-black/[0.04] ${rowTextClass}`}
                    >
                        <Plus className={`${iconClass} shrink-0 text-neutral-400`} />
                        <input
                            value={newDeckName}
                            onChange={(event) => setNewDeckName(event.target.value)}
                            placeholder="New Deck"
                            className="min-w-0 flex-1 bg-transparent text-neutral-700 outline-none placeholder:text-neutral-400"
                        />
                        {newDeckName.trim() !== "" && (
                            <button
                                type="submit"
                                className="rounded-md bg-neutral-200/80 px-2 py-0.5 text-xs font-medium text-neutral-600 hover:bg-neutral-300/80"
                            >
                                Add
                            </button>
                        )}
                    </form>
                </li>
            </ul>
        </nav>
    );
}