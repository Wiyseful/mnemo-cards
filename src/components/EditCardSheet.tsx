"use client";

import { useEffect, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, SubmitEvent } from "react";
import { motion } from "motion/react";
import { SPRING } from "@/components/springs";
import type { Card } from "@/scheduler/types";

type VisibleArea = { top: number; height: number };

function readVisibleArea(): VisibleArea | null {
    const viewport = window.visualViewport;
    return viewport ? { top: viewport.offsetTop, height: viewport.height } : null;
}

type EditCardSheetProps = {
    card: Card;
    onSave: (front: string, back: string) => void;
    onClose: () => void;
};

export default function EditCardSheet({ card, onSave, onClose }: EditCardSheetProps) {
    const [frontText, setFrontText] = useState(card.front);
    const [backText, setBackText] = useState(card.back);
    const [visibleArea, setVisibleArea] = useState(readVisibleArea);

    useEffect(() => {
        const viewport = window.visualViewport;
        if (!viewport) return;

        const handleViewportChange = () => setVisibleArea(readVisibleArea());
        viewport.addEventListener("resize", handleViewportChange);
        viewport.addEventListener("scroll", handleViewportChange);
        return () => {
            viewport.removeEventListener("resize", handleViewportChange);
            viewport.removeEventListener("scroll", handleViewportChange);
        };
    }, []);

    const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSave(frontText, backText);
    };

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLFormElement>) => {
        if (event.key === "Escape") {
            onClose();
        }
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            onSave(frontText, backText);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={visibleArea ?? undefined}
            className="fixed inset-x-0 top-0 z-50 flex h-dvh items-end justify-center bg-foreground/20 sm:items-center sm:p-6"
        >
            <motion.form
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={SPRING}
                onClick={(event) => event.stopPropagation()}
                onSubmit={handleSubmit}
                onKeyDown={handleKeyDown}
                className="w-full max-w-xl rounded-t-[22px] bg-surface px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-5 shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.2)] sm:rounded-[22px] sm:pb-5"
            >
                <div className="flex items-center justify-between">
                    <button type="button" onClick={onClose} className="text-[15px] text-muted">
                        Cancel
                    </button>
                    <p className="text-[15px] font-semibold tracking-tight">Edit card</p>
                    <button type="submit" className="text-[15px] font-semibold text-foreground">
                        Save
                    </button>
                </div>

                <textarea
                    autoFocus
                    value={frontText}
                    onChange={(event) => setFrontText(event.target.value)}
                    placeholder="Question"
                    rows={1}
                    className="mt-6 block max-h-[20vh] w-full resize-none bg-transparent text-xl font-semibold leading-snug tracking-tight outline-none field-sizing-content placeholder:text-placeholder"
                />
                <div className="my-5 border-t-2 border-dashed border-foreground/[0.08]" />
                <textarea
                    value={backText}
                    onChange={(event) => setBackText(event.target.value)}
                    placeholder="Answer"
                    rows={2}
                    className="block max-h-[25vh] min-h-[3lh] w-full resize-none bg-transparent text-lg leading-relaxed text-secondary outline-none field-sizing-content placeholder:text-placeholder"
                />
            </motion.form>
        </motion.div>
    );
}