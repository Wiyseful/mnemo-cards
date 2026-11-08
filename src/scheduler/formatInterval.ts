export function formatInterval(ms: number): string {
    const day = 86400000;
    const hour = 3600000;
    const minute = 60000;

    if (ms < hour) {
        return `${Math.round(ms / minute)} min`;
    } else if (ms < day) {
        return `${Math.round(ms / hour)} h`;
    } else {
        return `${Math.round(ms / day)} d`;
    }
}