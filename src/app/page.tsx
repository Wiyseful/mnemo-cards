"use client";

import { useState } from "react";
import { sampleCards } from "@/data/sampleCards";
import { applyRating } from "@/scheduler/applyRating";
import { findNextDueCard } from "@/scheduler/findNextDueCard";
import { formatDuration } from "@/scheduler/formatDuration";
import type { Rating } from "@/scheduler/types";

const RATING_BUTTON_CLASSES =
    "rounded-full border border-gray-200 bg-white px-5 py-2 text-sm shadow-sm hover:bg-gray-100";

export default function StudyPage() {
    const [isAnswerShown, setIsAnswerShown] = useState(false);
    const [cards, setCards] = useState(sampleCards);
    const currentCard = findNextDueCard(cards, Date.now());

    if (!currentCard) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
                <p className="text-xl">All done for now!</p>
            </main>
        );
    }

    // saves the rated card and moves on to the next one
    const handleRatingClick = (rating: Rating) => {
        const ratedCard = applyRating(currentCard, rating, Date.now());
        setCards(cards.map((card) => (card.id === currentCard.id ? ratedCard : card)));
        setIsAnswerShown(false);
    };

    // text like "3 d": how long until the card comes back if this rating is picked
    const timeUntilDueText = (rating: Rating) => {
        const currentTimeMs = Date.now();
        const cardIfRated = applyRating(currentCard, rating, currentTimeMs);
        return formatDuration(cardIfRated.dueAt - currentTimeMs);
    };

    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-8">
            <button
                onClick={() => setIsAnswerShown(!isAnswerShown)}
                className="w-full max-w-md rounded-2xl bg-white p-10 text-center text-xl shadow"
            >
                <p>{currentCard.front}</p>
                {isAnswerShown && (
                    <p className="mt-6 border-t border-gray-200 pt-6">{currentCard.back}</p>
                )}
            </button>

            {isAnswerShown && (
                <div className="mt-6 flex gap-2">
                    <button onClick={() => handleRatingClick("Again")} className={RATING_BUTTON_CLASSES}>
                        Again · {timeUntilDueText("Again")}
                    </button>
                    <button onClick={() => handleRatingClick("Hard")} className={RATING_BUTTON_CLASSES}>
                        Hard · {timeUntilDueText("Hard")}
                    </button>
                    <button onClick={() => handleRatingClick("Good")} className={RATING_BUTTON_CLASSES}>
                        Good · {timeUntilDueText("Good")}
                    </button>
                    <button onClick={() => handleRatingClick("Easy")} className={RATING_BUTTON_CLASSES}>
                        Easy · {timeUntilDueText("Easy")}
                    </button>
                </div>
            )}
        </main>
    );
}
