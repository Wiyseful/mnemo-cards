"use client";

import {type SubmitEvent, useEffect, useState, useRef} from "react";
import Link from "next/link";
import {useParams} from "next/navigation";
import {sampleCards, sampleDecks} from "@/data/sampleCards";
import {loadSavedCards, saveCards} from "@/data/cardStorage";
import {loadSavedDecks} from "@/data/deckStorage";
import {dueCardIdsInOrder} from "@/scheduler/sessionQueue";
import {createUnstudiedCard} from "@/data/createUnstudiedCard";


export default function DeckPage() {
    // the deck id from the address. "cs-fundamentals" in /deck/cs-fundamentals
    const {deckId} = useParams<{ deckId: string }>();
    const [decks, setDecks] = useState(sampleDecks);
    const [cards, setCards] = useState(sampleCards);
    const [hasLoadedSavedData, setHasLoadedSavedData] = useState(false);
    const [newCardFront, setNewCardFront] = useState("");
    const [newCardBack, setNewCardBack] = useState("");
    const frontInputRef = useRef<HTMLInputElement>(null);

    // on page open: swap in saved decks and cards
    useEffect(() => {
        const savedDecks = loadSavedDecks();
        if (savedDecks !== null) {
            setDecks(savedDecks);
        }

        const savedCards = loadSavedCards();
        if (savedCards !== null) {
            setCards(savedCards);
        }

        setHasLoadedSavedData(true); // both loads are done
    }, []);

    const createCard = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (newCardFront.trim() === "" || newCardBack.trim() === "") return;
        const newCard = createUnstudiedCard(crypto.randomUUID(), deckId, newCardFront.trim(), newCardBack.trim());
        const updatedCards = [...cards, newCard];
        setCards(updatedCards);
        saveCards(updatedCards);
        setNewCardFront("");
        setNewCardBack("");
        frontInputRef.current?.focus();
    }

    // moves one card to the trash. nothing is erased yet
    const deleteCard = (cardId: string) => {
        const deletedAtMs = Date.now();

        const updatedCards = cards.map((card) =>
            card.id === cardId ? { ...card, deletedAt: deletedAtMs } : card,
        );
        setCards(updatedCards);
        saveCards(updatedCards);
    };


    // this deck's cards, skipping any in the trash
    const deckCards = cards.filter((card) => card.deckId === deckId && card.deletedAt === null);

    const newestFirstCards = deckCards.toReversed();

    // how many of them are ready to study.
    const dueCardCount = dueCardIdsInOrder(deckCards, Date.now()).length;

    const currentDeck = decks.find((deck) => deck.id === deckId);

    if (!hasLoadedSavedData) {
        return <main className="min-h-screen bg-neutral-50"/>;
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
            <form onSubmit={createCard}>
                <input
                    ref={frontInputRef}
                    value={newCardFront}
                    onChange={(event) => setNewCardFront(event.target.value)}
                    placeholder="Front"
                    />
                <input
                    value={newCardBack}
                    onChange={(event) => setNewCardBack(event.target.value)}
                    placeholder="Back"
                    />
                <button type="submit">Add card</button>
            </form>
            <ul>
                {newestFirstCards.map((card) => (
                    <li key={card.id}>
                        <p>{card.front}</p>
                        <p>{card.back}</p>
                        <button onClick={() => deleteCard(card.id)}>Delete</button>
                    </li>
                ))}
            </ul>
        </main>
    );
}

