"use client";

import {useState} from "react";
import {sampleCards} from "@/data/sampleCards";
import {nextCard} from "@/scheduler/nextCard";
import {rateCard} from "@/scheduler/rateCard";
import {Rating} from "@/scheduler/types";

export default function Home() {
    const [flipped, setFlipped] = useState(false);
    const [cards, setCards] = useState(sampleCards);
    const card = nextCard(cards, Date.now());

    if (!card) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
                <p className="text-xl">All done for now!</p>
            </main>
        );
    }

    function handleRate(rating: Rating) {
        const updatedCard = rateCard(card, rating, Date.now());
        setCards(cards.map((c) => (c.id === card.id ? updatedCard : c)));
        setFlipped(false);
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
            <button onClick={() => setFlipped(!flipped)}
                    className="w-full max-w-md rounded-2xl bg-white p-10 text-center text-xl shadow">
                {flipped ? card.back : card.front}
            </button>

            {flipped && (
                <div className="mt-6 flex gap-2">
                    <button onClick={() => handleRate("Again")}>Again</button>
                    <button onClick={() => handleRate("Hard")}>Hard</button>
                    <button onClick={() => handleRate("Good")}>Good</button>
                    <button onClick={() => handleRate("Easy")}>Easy</button>
                </div>
            )}

        </main>
    );
}