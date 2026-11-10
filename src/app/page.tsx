"use client";

import {type FormEvent, useEffect, useState} from "react";
import Link from "next/link";
import { sampleCards, sampleDecks } from "@/data/sampleCards";
import { loadSavedCards } from "@/data/cardStorage";
import { dueCardIdsInOrder } from "@/scheduler/sessionQueue";
import { MEMORY_FORECAST_DAYS, memoryPercentForecast } from "@/scheduler/averageRecallChance";
import {loadSavedDecks, saveDecks} from "@/data/deckStorage";
import type {Deck} from "@/scheduler/types";
import type { FormEvent } from "react";

export default function HomePage() {
    const [cards, setCards] = useState(sampleCards);
    const [decks, setDecks] = useState(sampleDecks);
    const [newDeckName, setNewDeckName] = useState("");

    // on page open: swap in saved progress if there is any
    useEffect(() => {
        const savedCards = loadSavedCards();
        if (savedCards !== null) {
            setCards(savedCards);
        }
    }, []);

    useEffect(() => {
        const savedDecks = loadSavedDecks();
        if (savedDecks !== null) {
            setDecks(savedDecks);
        }
    }, []);


    const createDeck = (event: FormEvent) => {
        event.preventDefault();
        if (newDeckName.trim() === "") return;

        const newDeck: Deck = {
            id: crypto.randomUUID(),
            name: newDeckName.trim(),
            parentDeckId: null,
        };

        const updatedDecks = [...decks, newDeck];
        setDecks(updatedDecks);
        saveDecks(updatedDecks);
        setNewDeckName("");
    };


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
                {decks.map((deck) => (
                    <li key={deck.id}>
                        <Link href={`/deck/${deck.id}`}>{deck.name}</Link>
                        {" · "}
                        {dueCardCountForDeck(deck.id)} due
                        {" · "}
                        {memoryPercentForDeck(deck.id)}% in {MEMORY_FORECAST_DAYS} days
                    </li>
                ))}
            </ul>
            <form onSubmit={createDeck}>
                <input value={newDeckName} onChange={(event) => setNewDeckName(event.target.value)} />
                <button type="submit">New deck</button>
            </form>
        </main>
    );
}