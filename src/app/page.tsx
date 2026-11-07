"use client";

import { initialState, nextInterval } from "@/engine";

export default function Home() {
    const state = initialState("Good");
    const days = nextInterval(state.stability, 0.9);

    return (
        <main className="p-8">
            <h1 className="text-2xl font-bold">Mnemo</h1>
            <p>
                A new card rated Good has stability {state.stability.toFixed(2)}, so it comes back in {" "}{days.toFixed(2)} days.
            </p>
        </main>
    )
}