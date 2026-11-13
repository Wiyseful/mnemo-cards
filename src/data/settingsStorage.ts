import type { CardWidth } from "@/components/CardWidthSwitcher";

const CARD_WIDTH_KEY = "mnemo-card-width";

const CARD_WIDTH_OPTIONS: CardWidth[] = ["narrow", "normal", "wide"];

export function saveCardWidth(width: CardWidth) {
    localStorage.setItem(CARD_WIDTH_KEY, width);
}

// "normal" if nothing was saved yet, or if what's saved isn't a real option
export function loadCardWidth(): CardWidth {
    const savedWidth = localStorage.getItem(CARD_WIDTH_KEY);
    const matchingOption = CARD_WIDTH_OPTIONS.find((option) => option === savedWidth);
    return matchingOption ?? "normal";
}