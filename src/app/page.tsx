"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { BookOpen, Brain, Plus } from "lucide-react";
import { sampleCards, sampleDecks } from "@/data/sampleCards";
import { loadSavedCards } from "@/data/cardStorage";
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
            deletedAt: null,
            name: newDeckName.trim(),
            parentDeckId: null,
        };

        const updatedDecks = [...decks, newDeck];
        setDecks(updatedDecks);
        saveDecks(updatedDecks);
        setNewDeckName("");
    };

    const deleteDeck = (deckId: string) => {
        const updatedDecks = decks.filter((deck) => deck.id !== deckId);
        setDecks(updatedDecks);
        saveDecks(updatedDecks);
    }

    const cardsInDeck = (deckId: string) => cards.filter((card) => card.deckId === deckId);

    // how many cards in this deck are ready to study right now
    const dueCardCountForDeck = (deckId: string) =>
        dueCardIdsInOrder(cardsInDeck(deckId), Date.now()).length;

    // how much of this deck you'd remember if you stopped studying now
    const memoryPercentForDeck = (deckId: string) =>
        memoryPercentForecast(cardsInDeck(deckId), Date.now());

    return (
        <main className="min-h-screen bg-gray-50">
            {/* phones: full width with side margins. desktop: wider centered column */}
            <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:max-w-3xl sm:py-16">
                <h1 className="mb-8 text-sm font-semibold uppercase text-gray-800 sm:text-base">
                    It's study time!
                </h1>

                <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wide text-gray-400 sm:text-xs">
                    Decks
                </p>

                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <ul className="divide-y divide-gray-100">
                        {decks.map((deck) => {
                            const dueCardCount = dueCardCountForDeck(deck.id);

                            return (
                                <li key={deck.id}>
                                    <Link
                                        href={`/deck/${deck.id}`}
                                        className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 sm:gap-4 sm:px-6 sm:py-4 sm:text-base"
                                    >
                                        <BookOpen className="h-4 w-4 shrink-0 text-gray-400 sm:h-5 sm:w-5" />
                                        <span className="flex-1 truncate text-gray-800">{deck.name}</span>

                                        <span
                                            className="flex items-center gap-1 text-xs tabular-nums text-gray-400 sm:text-sm"
                                            title={`Average chance you'd remember each card in ${MEMORY_FORECAST_DAYS} days`}
                                        >
                                            <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                            {memoryPercentForDeck(deck.id)}%
                                        </span>

                                        {/* due count: a gray badge when there's work to do, faded when there isn't */}
                                        <span
                                            className={`min-w-6 rounded-md px-1.5 py-0.5 text-center text-xs font-medium tabular-nums sm:min-w-7 sm:text-sm ${
                                                dueCardCount > 0 ? "bg-gray-200 text-gray-700" : "text-gray-300"
                                            }`}
                                        >
                                            {dueCardCount}
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>

                    {/* new deck: looks like one more row in the list */}
                    <form
                        onSubmit={createDeck}
                        className="flex items-center gap-3 border-t border-gray-100 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4"
                    >
                        <Plus className="h-4 w-4 shrink-0 text-gray-400 sm:h-5 sm:w-5" />
                        <input
                            value={newDeckName}
                            onChange={(event) => setNewDeckName(event.target.value)}
                            placeholder="New deck"
                            className="flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400 sm:text-base"
                        />
                        {newDeckName.trim() !== "" && (
                            <button
                                type="submit"
                                className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 sm:px-3 sm:text-sm"
                            >
                                Add
                            </button>
                        )}
                    </form>
                </div>
            </div>
        </main>
    );
}