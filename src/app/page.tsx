"use client";

import {useState} from "react";
import {sampleCards} from "@/data/sampleCards";

export default function Home() {
    const [flipped, setFlipped] = useState(false);
    const card = sampleCards[0]!;

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
            <button onClick={() => setFlipped(!flipped)}
                    className="w-full max-w-md rounded-2xl bg-white p-10 text-center text-xl shadow">
                {flipped ? card.back : card.front}
            </button>

        </main>
    );
}