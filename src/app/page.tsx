"use client";

import { useEffect, useState } from "react";
import type { SubmitEvent } from "react";
import Link from "next/link";
import { Brain, Folder, Plus, Trash2 } from "lucide-react";
import { sampleCards, sampleDecks } from "@/data/sampleCards";
import { loadSavedCards, saveCards } from "@/data/cardStorage";
import { loadSavedDecks, saveDecks } from "@/data/deckStorage";
import { dueCardIdsInOrder } from "@/scheduler/sessionQueue";
import { MEMORY_FORECAST_DAYS, memoryPercentForecast } from "@/scheduler/averageRecallChance";
import type { Deck } from "@/scheduler/types";

export default function HomePage() {
    const [cards, setCards] = useState(sampleCards);
    const [decks, setDecks] = useState(sampleDecks);
    const [newDeckName, setNewDeckName] = useState("");
    const [hasLoadedSavedData, setHasLoadedSavedData] = useState(false);

    // on page open: swap in saved cards and decks, if there are any
    useEffect(() => {
        const savedCards = loadSavedCards();
        if (savedCards !== null) {
            setCards(savedCards);
        }

        const savedDecks = loadSavedDecks();
        if (savedDecks !== null) {
            setDecks(savedDecks);
        }
        setHasLoadedSavedData(true);
    }, []);

    // adds a deck with the typed name, then clears the box
    const createDeck = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault(); // stop the form from reloading the page
        if (newDeckName.trim() === "") return;

        const newDeck: Deck = {
            id: crypto.randomUUID(),
            name: newDeckName.trim(),
            parentDeckId: null,
            deletedAt: null,
        };

        const updatedDecks = [...decks, newDeck];
        setDecks(updatedDecks);
        saveDecks(updatedDecks);
        setNewDeckName("");
    };

    // moves a deck and its cards to the trash. nothing is erased yet
    const deleteDeck = (deckId: string) => {
        const deletedAtMs = Date.now(); // same time for the deck and its cards

        const updatedDecks = decks.map((deck) =>
            deck.id === deckId ? { ...deck, deletedAt: deletedAtMs } : deck,
        );
        setDecks(updatedDecks);
        saveDecks(updatedDecks);

        const updatedCards = cards.map((card) =>
            card.deckId === deckId ? { ...card, deletedAt: deletedAtMs } : card,
        );
        setCards(updatedCards);
        saveCards(updatedCards);
    };

    // decks that aren't in the trash
    const remainingDecks = decks.filter((deck) => deck.deletedAt === null);

    // this deck's cards, skipping any in the trash
    const cardsInDeck = (deckId: string) =>
        cards.filter((card) => card.deckId === deckId && card.deletedAt === null);

    // how many cards in this deck are ready to study right now
    const dueCardCountForDeck = (deckId: string) =>
        dueCardIdsInOrder(cardsInDeck(deckId), Date.now()).length;

    // how much of this deck you'd remember if you stopped studying now
    const memoryPercentForDeck = (deckId: string) =>
        memoryPercentForecast(cardsInDeck(deckId), Date.now());

    if (!hasLoadedSavedData) {
        return <main className="min-h-screen bg-neutral-50" />;
    }

    return (
        <main className="min-h-screen bg-[#f7f7f5]">
            {/* phones: full width. bigger screens: a wider column with bigger text */}
            <div className="mx-auto w-full max-w-lg px-3 pt-10 sm:max-w-2xl sm:pt-24">
                <p className="mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-wider text-neutral-400 sm:mb-3 sm:px-4 sm:text-xs">
                    Decks
                </p>

                <ul className="sm:space-y-0.5">
                    {remainingDecks.map((deck) => {
                        const dueCardCount = dueCardCountForDeck(deck.id);
                        const isDeckEmpty = cardsInDeck(deck.id).length === 0;

                        return (
                            // "group" lets the trash button show when this row is hovered
                            <li
                                key={deck.id}
                                className="group flex items-center rounded-md hover:bg-black/[0.04] sm:rounded-lg"
                            >
                                <Link
                                    href={`/deck/${deck.id}`}
                                    className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2.5 text-sm text-neutral-700 sm:gap-3 sm:px-4 sm:py-3 sm:text-lg"
                                >
                                    <Folder className="h-4 w-4 shrink-0 fill-current text-neutral-400 sm:h-5 sm:w-5" />
                                    <span className="flex-1 truncate">{deck.name}</span>

                                    {isDeckEmpty ? (
                                        <span className="text-xs text-neutral-400 sm:text-sm">empty</span>
                                    ) : (
                                        <>
                                            {/* brain icon labels the number as memory, same as the study screen */}
                                            <span
                                                className="flex items-center gap-1 text-xs tabular-nums text-neutral-400 sm:text-sm"
                                                title={`Average chance you'd remember each card in ${MEMORY_FORECAST_DAYS} days`}
                                            >
                                                <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                {memoryPercentForDeck(deck.id)}%
                                            </span>

                                            {/* only shows when there's something to study */}
                                            {dueCardCount > 0 && (
                                                <span className="rounded-full bg-neutral-200/80 px-2 py-0.5 text-[11px] font-medium tabular-nums text-neutral-600 sm:px-2.5 sm:text-sm">
                                                    {dueCardCount} due
                                                </span>
                                            )}
                                        </>
                                    )}
                                </Link>

                                {/* hidden until you hover the row on desktop. always visible on phones */}
                                <button
                                    onClick={() => deleteDeck(deck.id)}
                                    aria-label={`Move ${deck.name} to trash`}
                                    className="mr-1.5 rounded p-1 text-neutral-400 opacity-0 hover:bg-black/[0.06] hover:text-neutral-700 group-hover:opacity-100 pointer-coarse:opacity-100 sm:mr-2 sm:p-1.5"
                                >
                                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </button>
                            </li>
                        );
                    })}

                    {/* new deck: looks like one more row in the list */}
                    <li>
                        <form
                            onSubmit={createDeck}
                            className="flex items-center gap-2 rounded-md px-2.5 py-2.5 hover:bg-black/[0.04] sm:gap-3 sm:rounded-lg sm:px-4 sm:py-3"
                        >
                            <Plus className="h-4 w-4 shrink-0 text-neutral-400 sm:h-5 sm:w-5" />
                            <input
                                value={newDeckName}
                                onChange={(event) => setNewDeckName(event.target.value)}
                                placeholder="New Deck"
                                className="min-w-0 flex-1 bg-transparent text-sm text-neutral-700 outline-none placeholder:text-neutral-400 sm:text-lg"
                            />
                            {newDeckName.trim() !== "" && (
                                <button
                                    type="submit"
                                    className="rounded-md bg-neutral-200/80 px-2 py-0.5 text-xs font-medium text-neutral-600 hover:bg-neutral-300/80 sm:px-3 sm:py-1 sm:text-sm"
                                >
                                    Add
                                </button>
                            )}
                        </form>
                    </li>
                </ul>
            </div>
        </main>
    );
}