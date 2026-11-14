"use client";

import { motion } from "motion/react";
import type { Transition } from "motion/react";

export type CardWidth = "narrow" | "normal" | "wide";

const WIDTH_OPTIONS: CardWidth[] = ["narrow", "normal", "wide"];

// a little card outline inside each option. the wider the option, the wider the outline
const OUTLINE_WIDTH_CLASS: Record<CardWidth, string> = {
    narrow: "w-2",
    normal: "w-3.5",
    wide: "w-5",
};

const LABEL_FOR_WIDTH: Record<CardWidth, string> = {
    narrow: "Narrow card",
    normal: "Normal card",
    wide: "Wide card",
};

const SPRING: Transition = { type: "spring", stiffness: 420, damping: 34, mass: 0.9 };

export default function CardWidthSwitcher({
                                              selectedWidth,
                                              onSelectWidth,
                                          }: {
    selectedWidth: CardWidth;
    onSelectWidth: (width: CardWidth) => void;
}) {
    return (
        <div
            role="radiogroup"
            aria-label="Card width"
            className="flex h-8 shrink-0 items-center gap-0.5 rounded-full bg-foreground/[0.05] p-0.5"
        >
            {WIDTH_OPTIONS.map((width) => {
                const isSelected = width === selectedWidth;

                return (
                    <motion.button
                        key={width}
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={LABEL_FOR_WIDTH[width]}
                        title={LABEL_FOR_WIDTH[width]}
                        whileTap={{ scale: 0.88 }}
                        transition={SPRING}
                        onClick={(event) => {
                            event.stopPropagation(); // keep the click from flipping the card
                            onSelectWidth(width);
                        }}
                        className="relative flex h-7 w-8 items-center justify-center rounded-full"
                    >
                        {/* only the selected option draws this. layoutId makes it slide over instead of jumping */}
                        {isSelected && (
                            <motion.span
                                layoutId="card-width-highlight"
                                transition={SPRING}
                                className="absolute inset-0 rounded-full bg-accent shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
                            />
                        )}
                        <span
                            className={`relative h-3 rounded-[3px] border-[1.5px] transition-colors duration-200 ${OUTLINE_WIDTH_CLASS[width]} ${
                                isSelected ? "border-on-accent" : "border-faint"
                            }`}
                        />
                    </motion.button>
                );
            })}
        </div>
    );
}