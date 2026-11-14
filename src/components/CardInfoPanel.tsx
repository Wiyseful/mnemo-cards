"use client";

import { useState } from "react";
import { averageRecallChance, FORGET_WARNING_DAYS } from "@/scheduler/averageRecallChance";
import { formatDuration } from "@/scheduler/formatDuration";
import { MS_PER_DAY } from "@/scheduler/time";
import type { Card } from "@/scheduler/types";

function difficultyLabel(difficulty: number): string {
    if (difficulty < 4) return "Easy";
    if (difficulty < 7) return "Medium";
    return "Hard";
}

function nextReviewText(card: Card, currentTimeMs: number): string {
    if (card.dueAt <= currentTimeMs) return "Now";
    return `In ${formatDuration(card.dueAt - currentTimeMs)}`;
}

function weekdayName(timeMs: number): string {
    return new Date(timeMs).toLocaleDateString("en-US", { weekday: "long" });
}

type CardInfoPanelProps = {
    card: Card;
    onClose: () => void;
};

export default function CardInfoPanel({ card, onClose }: CardInfoPanelProps) {
    const [openedAtMs] = useState(() => Date.now());

    const stopEventFromReachingStudyArea = (event: { stopPropagation: () => void }) => event.stopPropagation();

    const isNewCard = card.lastReviewedAt === null || card.stability === null || card.difficulty === null;
    const warningTimeMs = openedAtMs + FORGET_WARNING_DAYS * MS_PER_DAY;
    const recallPercentNow = isNewCard ? 0 : Math.round(averageRecallChance([card], openedAtMs) * 100);
    const recallPercentLater = isNewCard ? 0 : Math.round(averageRecallChance([card], warningTimeMs) * 100);

    const stats = isNewCard
        ? []
        : [
              { label: "Next review", value: nextReviewText(card, openedAtMs) },
              { label: "Last studied", value: `${formatDuration(openedAtMs - card.lastReviewedAt!)} ago` },
              { label: "Reviews", value: `${card.reviewCount}` },
              { label: "Forgotten", value: `${card.forgetCount}`, isWarning: card.forgetCount > 0 },
          ];

    return (
        <>
            <div
                onClick={(event) => {
                    event.stopPropagation();
                    onClose();
                }}
                onPointerDown={stopEventFromReachingStudyArea}
                className="fixed inset-0 z-40 bg-foreground/20 sm:bg-transparent"
            />

            <div
                onClick={stopEventFromReachingStudyArea}
                onPointerDown={stopEventFromReachingStudyArea}
                role="dialog"
                aria-label="Card info"
                className="fixed inset-x-0 bottom-0 z-50 rounded-t-[22px] bg-surface px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-5 shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.2)] sm:absolute sm:inset-x-auto sm:bottom-full sm:left-1/2 sm:mb-3 sm:-ml-[160px] sm:w-[320px] sm:rounded-[18px] sm:px-5 sm:pb-5 sm:pt-4 sm:shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_20px_50px_-16px_rgba(0,0,0,0.28)]"
            >
                <div className="flex items-center justify-between">
                    <p className="text-[13px] font-medium text-muted">
                        {isNewCard ? "New card" : `${card.studyPhase} · ${difficultyLabel(card.difficulty!)}`}
                    </p>
                    <button type="button" onClick={onClose} className="text-[15px] font-medium text-foreground sm:hidden">
                        Done
                    </button>
                </div>

                {isNewCard ? (
                    <p className="mt-3 text-[15px] leading-relaxed text-secondary">
                        You haven&apos;t studied this one yet. Rate it once and Mnemo starts tracking how well you
                        remember it.
                    </p>
                ) : (
                    <>
                        <div className="mt-3 flex items-baseline justify-between">
                            <p className="text-[15px] text-secondary">Memory right now</p>
                            <p className="text-[22px] font-semibold tracking-tight tabular-nums">{recallPercentNow}%</p>
                        </div>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-foreground/[0.07]">
                            <div className="h-full bg-accent" style={{ width: `${recallPercentNow}%` }} />
                        </div>
                        {recallPercentLater < recallPercentNow && (
                            <p className="mt-2.5 text-[13px] text-muted">
                                Without a review, it drops to{" "}
                                <span className="font-medium text-danger">{recallPercentLater}%</span> by{" "}
                                {weekdayName(warningTimeMs)}.
                            </p>
                        )}

                        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-foreground/[0.06] pt-4">
                            {stats.map((stat) => (
                                <div key={stat.label}>
                                    <dt className="text-[12px] text-muted">{stat.label}</dt>
                                    <dd
                                        className={`mt-0.5 text-[15px] font-medium tabular-nums ${
                                            stat.isWarning ? "text-danger" : "text-foreground"
                                        }`}
                                    >
                                        {stat.value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </>
                )}
            </div>
        </>
    );
}
