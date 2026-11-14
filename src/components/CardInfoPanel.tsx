"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { SPRING } from "@/components/springs";
import { averageRecallChance } from "@/scheduler/averageRecallChance";
import { formatDuration } from "@/scheduler/formatDuration";
import type { Card } from "@/scheduler/types";

const DIFFICULTY_DOT_COUNT = 5;

function difficultyLabel(difficulty: number): string {
    if (difficulty < 4) return "Easy";
    if (difficulty < 7) return "Medium";
    return "Hard";
}

function nextDueText(card: Card, currentTimeMs: number): string {
    if (card.reviewCount === 0) return "Not studied yet";
    if (card.dueAt <= currentTimeMs) return "Now";
    return `in ${formatDuration(card.dueAt - currentTimeMs)}`;
}

function timesText(count: number): string {
    return count === 1 ? "1 time" : `${count} times`;
}

type CardInfoPanelProps = {
    card: Card;
    onClose: () => void;
};

export default function CardInfoPanel({ card, onClose }: CardInfoPanelProps) {
    const [openedAtMs] = useState(() => Date.now());

    const hasBeenStudied = card.lastReviewedAt !== null && card.stability !== null;
    const recallPercent = hasBeenStudied ? Math.round(averageRecallChance([card], openedAtMs) * 100) : null;
    const filledDifficultyDots =
        card.difficulty === null ? 0 : Math.ceil((card.difficulty / 10) * DIFFICULTY_DOT_COUNT);

    const rows: { label: string; value: string; isWarning?: boolean }[] = [
        { label: "Next due", value: nextDueText(card, openedAtMs) },
        {
            label: "Last studied",
            value: card.lastReviewedAt === null ? "Never" : `${formatDuration(openedAtMs - card.lastReviewedAt)} ago`,
        },
        { label: "Reviewed", value: timesText(card.reviewCount) },
        { label: "Forgotten", value: timesText(card.forgetCount), isWarning: card.forgetCount > 0 },
    ];

    const stopEventFromReachingStudyArea = (event: { stopPropagation: () => void }) => event.stopPropagation();

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={(event) => {
                    event.stopPropagation();
                    onClose();
                }}
                onPointerDown={stopEventFromReachingStudyArea}
                className="fixed inset-0 z-40 bg-foreground/20 sm:bg-transparent"
            />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={SPRING}
                onClick={stopEventFromReachingStudyArea}
                onPointerDown={stopEventFromReachingStudyArea}
                role="dialog"
                aria-label="Card info"
                className="fixed inset-x-0 bottom-0 z-50 rounded-t-[22px] bg-surface px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-5 shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.2)] sm:absolute sm:inset-x-auto sm:bottom-full sm:left-1/2 sm:mb-3 sm:-ml-[160px] sm:w-[320px] sm:rounded-[18px] sm:pb-2 sm:pt-4 sm:shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_20px_50px_-16px_rgba(0,0,0,0.28)]"
            >
                <div className="flex items-center justify-between">
                    <span className="rounded-full bg-foreground/[0.05] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
                        {card.studyPhase}
                    </span>
                    <button type="button" onClick={onClose} className="text-[15px] font-semibold sm:hidden">
                        Done
                    </button>
                </div>

                <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-[34px] font-bold leading-none tracking-tight tabular-nums sm:text-[28px]">
                        {recallPercent === null ? "New" : `${recallPercent}%`}
                    </span>
                    <span className="text-sm text-muted sm:hidden">
                        {recallPercent === null ? "you haven't studied this card yet" : "chance you remember it right now"}
                    </span>
                    <span className="hidden text-sm text-muted sm:inline">
                        {recallPercent === null ? "not studied yet" : "recall right now"}
                    </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/[0.07]">
                    <div className="h-full bg-accent" style={{ width: `${recallPercent ?? 0}%` }} />
                </div>

                <dl className="mt-3 divide-y divide-foreground/[0.05] text-[14px]">
                    {rows.map((row) => (
                        <div key={row.label} className="flex items-center justify-between py-2.5">
                            <dt className="text-muted">{row.label}</dt>
                            <dd className={`font-semibold tabular-nums ${row.isWarning ? "text-danger" : "text-foreground"}`}>
                                {row.value}
                            </dd>
                        </div>
                    ))}
                    <div className="flex items-center justify-between py-2.5">
                        <dt className="text-muted">Difficulty</dt>
                        <dd className="flex items-center gap-2 font-semibold">
                            {card.difficulty === null ? "Not rated yet" : difficultyLabel(card.difficulty)}
                            {card.difficulty !== null && (
                                <span className="flex gap-[3px]">
                                    {Array.from({ length: DIFFICULTY_DOT_COUNT }, (_, dotIndex) => (
                                        <span
                                            key={dotIndex}
                                            className={`h-1.5 w-1.5 rounded-full ${
                                                dotIndex < filledDifficultyDots ? "bg-foreground" : "bg-control"
                                            }`}
                                        />
                                    ))}
                                </span>
                            )}
                        </dd>
                    </div>
                </dl>
            </motion.div>
        </>
    );
}