"use client";

import { useMemo } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import type { DragControls, PanInfo, Variants } from "motion/react";
import type { Ref } from "react";
import { QUICK_SPRING, SPRING } from "@/components/springs";
import { applyRating } from "@/scheduler/applyRating";
import { formatDuration } from "@/scheduler/formatDuration";
import type { Card, Rating } from "@/scheduler/types";

// Hard isn't used. The order matches the swipe directions: left, up, right
export const BUTTON_RATINGS = ["Again", "Good", "Easy"] as const;

export const BUTTON_LABEL_FOR_RATING: Record<(typeof BUTTON_RATINGS)[number], string> = {
    Again: "Forgot",
    Good: "Recalled",
    Easy: "Instant",
};

export type CardExit = Rating | "Skip" | "Trash";

// where a rated card flies. same directions as the swipes will be
const EXIT_MOTION: Record<CardExit, { x: number; y: number; scale?: number }> = {
    Again: { x: -1200, y: 120 },
    Hard: { x: 0, y: -1000 },
    Good: { x: 0, y: -1000 },
    Easy: { x: 1200, y: 120 },
    Skip: { x: 0, y: -60, scale: 0.96 },
    Trash: { x: 0, y: 320, scale: 0.6 },
};

const SWIPE_DISTANCE_PX = 100;
const SWIPE_SPEED = 500;

function ratingForSwipe(info: PanInfo): Rating | null {
    const { offset, velocity } = info;
    const isMostlySideways = Math.abs(offset.x) > Math.abs(offset.y);

    if (isMostlySideways) {
        if (offset.x < -SWIPE_DISTANCE_PX || velocity.x < -SWIPE_SPEED) return "Again";
        if (offset.x > SWIPE_DISTANCE_PX || velocity.x > SWIPE_SPEED) return "Easy";
        return null;
    }

    if (offset.y < -SWIPE_DISTANCE_PX || velocity.y < -SWIPE_SPEED) return "Good";
    return null;
}

const CARD_VARIANTS: Variants = {
    enter: { opacity: 0, y: 28, scale: 0.96 },
    center: { opacity: 1, x: 0, y: 0, scale: 1 },
    exit: (lastExit: CardExit | null) => ({
        ...(lastExit ? EXIT_MOTION[lastExit] : { y: -40 }),
        opacity: [1, 1, 0],
        transition: {
            duration: 0.3,
            ease: [0.55, 0, 0.8, 0.2],
            opacity: { duration: 0.3, times: [0, 0.85, 1] },
        },
    }),
};

type StudyCardProps = {
    card: Card;
    isAnswerShown: boolean;
    onRate: (rating: Rating) => void;
    dragControls: DragControls;
    ref?: Ref<HTMLDivElement>;
};

export default function StudyCard({ card, isAnswerShown, onRate, dragControls, ref }: StudyCardProps) {
    const cardPositionX = useMotionValue(0);
    const cardPositionY = useMotionValue(0);
    const cardTilt = useTransform(cardPositionX, [-600, 600], [-12, 12]);
    const forgotTintOpacity = useTransform(cardPositionX, [-100, 0], [0.1, 0]);

    const timeUntilDueTextForRating = useMemo(() => {
        const currentTimeMs = Date.now();
        return Object.fromEntries(
            BUTTON_RATINGS.map((rating) => [
                rating,
                formatDuration(applyRating(card, rating, currentTimeMs).dueAt - currentTimeMs),
            ]),
        ) as Record<(typeof BUTTON_RATINGS)[number], string>;
    }, [card]);

    return (
        <motion.div
            ref={ref}
            style={{ x: cardPositionX, y: cardPositionY, rotate: cardTilt }}
            variants={CARD_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            transition={SPRING}
            drag={isAnswerShown}
            dragControls={dragControls}
            dragListener={false}
            dragSnapToOrigin
            whileDrag={{ scale: 1.02 }}
            onDragEnd={(event, info) => {
                const swipedRating = ratingForSwipe(info);
                if (swipedRating) {
                    onRate(swipedRating);
                }
            }}
            className="relative overflow-hidden rounded-[22px] bg-surface ring-1 ring-foreground/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-16px_rgba(0,0,0,0.14)]"
        >
            <motion.div
                style={{ opacity: forgotTintOpacity }}
                className="pointer-events-none absolute inset-0 z-10 bg-danger"
            />
            <div className="relative px-7 py-9 sm:px-11 sm:py-12">
                <p className="whitespace-pre-wrap text-[22px] font-semibold leading-snug tracking-tight sm:text-2xl">
                    {card.front}
                </p>

                {/* the card grows to fit the answer instead of jumping */}
                <AnimatePresence initial={false}>
                    {isAnswerShown && (
                        <motion.div
                            key="answer"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={QUICK_SPRING}
                            className="overflow-hidden"
                        >
                            <div className="my-7 border-t-2 border-dashed border-foreground/[0.08]" />
                            <p className="whitespace-pre-wrap text-lg leading-relaxed text-secondary">
                                {card.back}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence initial={false}>
                {isAnswerShown && (
                    <motion.div
                        key="ratings"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={QUICK_SPRING}
                        className="relative overflow-hidden"
                    >
                        <div className="grid grid-cols-3 divide-x-[3px] divide-foreground/[0.05] border-t-[3px] border-foreground/[0.05] bg-background">
                            {BUTTON_RATINGS.map((rating) => (
                                <motion.button
                                    key={rating}
                                    whileTap={{ scale: 0.94 }}
                                    transition={SPRING}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onRate(rating);
                                    }}
                                    className="relative flex h-16 flex-col items-center justify-center gap-0.5 overflow-hidden"
                                >
                                    <span className="relative text-[15px] font-semibold tracking-tight text-foreground">
                                        {BUTTON_LABEL_FOR_RATING[rating]}
                                    </span>
                                    <span className="relative text-xs tabular-nums text-faint">
                                        {timeUntilDueTextForRating[rating]}
                                    </span>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}