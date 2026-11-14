import type { Transition } from "motion/react";

export const SPRING: Transition = { type: "spring", stiffness: 500, damping: 48 };
export const SOFT_SPRING: Transition = { type: "spring", stiffness: 300, damping: 36 };
export const QUICK_SPRING: Transition = { type: "spring", stiffness: 600, damping: 52 };
