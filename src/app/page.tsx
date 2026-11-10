"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { sampleCards, sampleDecks } from "@/data/sampleCards";
import { loadSavedCards } from "@/data/cardStorage";
import { dueCardIdsInOrder } from "@/scheduler/sessionQueue";
import { MEMORY_FORECAST_DAYS, memoryPercentForecast } from "@/scheduler/averageRecallChance";

export default function HomePage() {
    const [cards, setCards] = useState(sampleCards);

    // on page open: swap in saved progress, if there is any
    useEffect(() => {
        const savedCards = loadSavedCards();
        if (savedCards !== null) {
            setCards(savedCards);
        }
    }, []);

    const cardsInDeck = (deckId: string) => cards.filter((card) => card.deckId === deckId);

    // how many cards in this deck are ready to study right now
    const dueCardCountForDeck = (deckId: string) =>
        dueCardIdsInOrder(cardsInDeck(deckId), Date.now()).length;

    // how much of this deck you'd remember if you stopped studying now
    const memoryPercentForDeck = (deckId: string) =>
        memoryPercentForecast(cardsInDeck(deckId), Date.now());

    return (
        <main>
            <h1>Decks</h1>
            <ul>
                {sampleDecks.map((deck) => (
                    <li key={deck.id}>
                        <Link href={`/deck/${deck.id}`}>{deck.name}</Link>
                        {" · "}
                        {dueCardCountForDeck(deck.id)} due
                        {" · "}
                        {memoryPercentForDeck(deck.id)}% in {MEMORY_FORECAST_DAYS} days
                    </li>
                ))}
            </ul>
        </main>
    );
}