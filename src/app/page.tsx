"use client";

import {useState} from "react";
import {sampleCards} from "@/data/sampleCards";
import {nextCard} from "@/scheduler/nextCard";
import {rateCard} from "@/scheduler/rateCard";
import type {Rating} from "@/scheduler/types";
import {formatInterval} from "@/scheduler/formatInterval";

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

    const handleRate = (rating: Rating) => {
        const updatedCard = rateCard(card, rating, Date.now());
        setCards(cards.map((c) => (c.id === card.id ? updatedCard : c)));
        setFlipped(false);
    }

    const previewInterval = (rating: Rating) => {
        const now = Date.now();
        const preview = rateCard(card, rating, now);
        return formatInterval(preview.due - now);
    }

    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-8">
            <button onClick={() => setFlipped(!flipped)}
                    className="w-full max-w-md rounded-2xl bg-white p-10 text-center text-xl shadow">
                <p>{card.front}</p>
                {flipped && (
                    <p className="mt-6 border-t border-gray-200 pt-6">{card.back}</p>
                )}
            </button>

            {flipped && (
                <div className="mt-6 flex gap-2">
                    <button onClick={() => handleRate("Again")}
                            className="rounded-full border border-gray-200 bg-white px-5 py-2 text-sm shadow-sm hover:bg-gray-100">
                        Again · {previewInterval("Again")}
                    </button>
                    <button onClick={() => handleRate("Hard")}
                            className="rounded-full border border-gray-200 bg-white px-5 py-2 text-sm shadow-sm hover:bg-gray-100">
                        Hard · {previewInterval("Hard")}
                    </button>
                    <button onClick={() => handleRate("Good")}
                            className="rounded-full border border-gray-200 bg-white px-5 py-2 text-sm shadow-sm hover:bg-gray-100">
                        Good · {previewInterval("Good")}
                    </button>
                    <button onClick={() => handleRate("Easy")}
                            className="rounded-full border border-gray-200 bg-white px-5 py-2 text-sm shadow-sm hover:bg-gray-100">
                        Easy · {previewInterval("Easy")}
                    </button>
                </div>
            )}

        </main>
    );
}