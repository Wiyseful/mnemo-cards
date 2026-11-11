"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { sampleCards, sampleDecks } from "@/data/sampleCards";
import { loadSavedCards } from "@/data/cardStorage";
import { loadSavedDecks } from "@/data/deckStorage";
import { dueCardIdsInOrder } from "@/scheduler/sessionQueue";

export default function DeckPage() {
    // the deck id from the address, like "cs-fundamentals" in /deck/cs-fundamentals
    const { deckId } = useParams<{ deckId: string }>();
    const [decks, setDecks] = useState(sampleDecks);
    const [cards, setCards] = useState(sampleCards);
    const [hasLoadedSavedData, setHasLoadedSavedData] = useState(false);

    // on page open: swap in saved decks and cards, if there are any
    useEffect(() => {
        const savedDecks = loadSavedDecks();
        if (savedDecks !== null) {
            setDecks(savedDecks);
        }

        const savedCards = loadSavedCards();
        if (savedCards !== null) {
            setCards(savedCards);
        }

        setHasLoadedSavedData(true); // both loads are done, whether or not anything was saved
    }, []);



    // this deck's cards, skipping any in the trash
    const deckCards = cards.filter((card) => card.deckId === deckId && card.deletedAt === null);

    // how many of them are ready to study. same rule as the study page
    const dueCardCount = dueCardIdsInOrder(deckCards, Date.now()).length;

    const currentDeck = decks.find((deck) => deck.id === deckId);

    if (!hasLoadedSavedData) {
        return <main className="min-h-screen bg-neutral-50" />;
    }

    if (!currentDeck) {
        return (
            <main className="min-h-screen bg-neutral-50 p-8">
                <p>Deck not found</p>
                <Link href="/">Back to decks</Link>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-neutral-50 p-8">
            <h1 className="text-xl font-semibold">{currentDeck.name}</h1>
            <Link href={`/deck/${deckId}/study`}>Study</Link>
            <p>Due count: {dueCardCount}</p>
        </main>
    );
}