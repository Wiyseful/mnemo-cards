import { MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE } from "./time";

// turns a length of time into short text like "10 min", "5 h", or "3 d"
export function formatDuration(durationMs: number): string {
    if (durationMs < MS_PER_HOUR) {
        return `${Math.round(durationMs / MS_PER_MINUTE)} min`;
    } else if (durationMs < MS_PER_DAY) {
        return `${Math.round(durationMs / MS_PER_HOUR)} h`;
    } else {
        return `${Math.round(durationMs / MS_PER_DAY)} d`;
    }
}
