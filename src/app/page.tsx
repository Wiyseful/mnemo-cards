"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { Folder, Plus, Trash2 } from "lucide-react";
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
    }, []);

    // adds a deck with the typed name, then clears the box
    const createDeck = (event: FormEvent) => {
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

    return (
        <main className="min-h-screen bg-neutral-50">
            <div className="mx-auto w-full max-w-xl px-3 py-8 sm:py-16">
                <h1 className="px-3 text-lg font-semibold text-neutral-800 sm:text-xl">My Decks</h1>


                <ul className="mt-1.5 space-y-0.5">
                    {remainingDecks.map((deck) => {
                        const dueCardCount = dueCardCountForDeck(deck.id);
                        const deckCardCount = cardsInDeck(deck.id).length;
                        return (
                            // "group" lets the trash button show when this row is hovered
                            <li key={deck.id} className="group flex items-center rounded-md hover:bg-neutral-200/60">
                                <Link
                                    href={`/deck/${deck.id}`}
                                    className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-[15px] text-neutral-800 sm:py-1.5 sm:text-base"
                                >
                                    <Folder className="h-4 w-4 shrink-0 fill-current text-neutral-500" />

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate">{deck.name}</p>

                                        {/* subtitle: what's due and how well you know it, in words */}
                                        <p className="truncate text-xs text-neutral-400">
                                            {deckCardCount === 0 ? (
                                                "No cards yet"
                                            ) : (
                                                <>
                                                    {dueCardCount > 0 ? (
                                                        <span className="font-medium text-neutral-700">{dueCardCount} due</span>
                                                    ) : (
                                                        "Nothing due"
                                                    )}
                                                    {" · "}
                                                    {memoryPercentForDeck(deck.id)}% memory in {MEMORY_FORECAST_DAYS} days
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </Link>

                                {/* hidden until you hover the row on desktop. always visible on phones */}
                                <button
                                    onClick={() => deleteDeck(deck.id)}
                                    aria-label={`Move ${deck.name} to trash`}
                                    className="mr-1.5 rounded p-1 text-neutral-400 opacity-0 hover:bg-neutral-300/60 hover:text-neutral-700 group-hover:opacity-100 pointer-coarse:opacity-100"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </li>
                        );
                    })}

                    {/* new deck: looks like one more row in the list */}
                    <li>
                        <form
                            onSubmit={createDeck}
                            className="flex items-center gap-2.5 rounded-md px-3 py-2 hover:bg-neutral-200/60 sm:py-1.5"
                        >
                            <Plus className="h-4 w-4 shrink-0 text-neutral-400" />
                            <input
                                value={newDeckName}
                                onChange={(event) => setNewDeckName(event.target.value)}
                                placeholder="New Deck"
                                className="min-w-0 flex-1 bg-transparent text-[15px] text-neutral-800 outline-none placeholder:text-neutral-400 sm:text-base"
                            />
                            {newDeckName.trim() !== "" && (
                                <button
                                    type="submit"
                                    className="rounded-md bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-700 hover:bg-neutral-300"
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