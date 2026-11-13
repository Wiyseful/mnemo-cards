"use client";

import type {Deck, Card} from "@/scheduler/types";
import type {ReactNode} from "react";
import {loadSavedDecks, saveDecks} from "@/data/deckStorage";
import {loadSavedCards, saveCards} from "@/data/cardStorage";
import { createContext, useContext, useEffect, useState } from "react";
import { sampleCards, sampleDecks } from "@/data/sampleCards";



type StudyData = {
    cards: Card[];
    decks: Deck[];
    hasLoadedSavedData: boolean;
    updateDecks: (updatedDecks: Deck[]) => void;
    updateCards: (updatedCards: Card[]) => void;
}

const StudyDataContext = createContext<StudyData | null>(null);

export function StudyDataProvider({ children }: {children: ReactNode}) {
    const [decks, setDecks] = useState(sampleDecks);
    const [cards, setCards] = useState(sampleCards);
    const [hasLoadedSavedData, setHasLoadedSavedData] = useState(false);

    useEffect(() => {
        const loadedDecks = loadSavedDecks();
        if (loadedDecks !== null) {
            setDecks(loadedDecks);
        };
        const loadedCards = loadSavedCards();
        if (loadedCards !== null) {
            setCards(loadedCards);
        };
        setHasLoadedSavedData(true);
    }, []);


    const updateDecks = (updatedDecks: Deck[]) => {
        setDecks(updatedDecks);
        saveDecks(updatedDecks);
    };

    const updateCards = (updatedCards: Card[]) => {
        setCards(updatedCards);
        saveCards(updatedCards);
    };
    return (
        <StudyDataContext.Provider value={{ decks, cards, hasLoadedSavedData, updateDecks, updateCards }}>
            {children}
        </StudyDataContext.Provider>
    );
}

export function useStudyData(): StudyData {
    const studyData = useContext(StudyDataContext);
    if (studyData === null) {
        throw new Error("useStudyData only works inside <StudyDataProvider>");
    };
    return studyData;
};