import type { Transition } from "motion/react";

export const SPRING: Transition = { type: "spring", stiffness: 420, damping: 34, mass: 0.9 };
export const SOFT_SPRING: Transition = { type: "spring", stiffness: 240, damping: 30 };
export const QUICK_SPRING: Transition = { type: "spring", stiffness: 600, damping: 45 };
