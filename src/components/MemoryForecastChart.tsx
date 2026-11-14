import type { MemoryForecast } from "@/scheduler/memoryForecast";

const CHART_WIDTH = 440;
const CHART_HEIGHT = 190;
const PADDING_LEFT = 36;
const PADDING_RIGHT = 8;
const PADDING_TOP = 10;
const PADDING_BOTTOM = 26;
const GRID_PERCENTS = [50, 75, 100];

type MemoryForecastChartProps = {
    forecast: MemoryForecast;
    endLabel: string;
    axisEndLabel: string;
};

export default function MemoryForecastChart({ forecast, endLabel, axisEndLabel }: MemoryForecastChartProps) {
    const { percentsIfYouStop, percentsIfYouReviewDueCards, dueCardCount } = forecast;
    const lastPointIndex = percentsIfYouStop.length - 1;
    const lowestPercent = Math.min(...percentsIfYouStop);
    const bottomPercent = lowestPercent >= 50 ? 50 : 0;
    const gridPercents = bottomPercent === 50 ? GRID_PERCENTS : [0, 50, 100];

    const innerWidth = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
    const innerHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
    const xFor = (pointIndex: number) => PADDING_LEFT + (innerWidth * pointIndex) / lastPointIndex;
    const yFor = (percent: number) =>
        PADDING_TOP + innerHeight * (1 - (percent - bottomPercent) / (100 - bottomPercent));
    const linePath = (percents: number[]) =>
        percents.map((percent, pointIndex) => `${pointIndex === 0 ? "M" : "L"}${xFor(pointIndex)},${yFor(percent)}`).join(" ");

    const hasDueCards = dueCardCount > 0;
    const percentNow = Math.round(percentsIfYouStop[0]!);
    const percentAtEndIfStop = Math.round(percentsIfYouStop[lastPointIndex]!);
    const percentAtEndIfReview = Math.round(percentsIfYouReviewDueCards[lastPointIndex]!);
    const reviewPathWithJump = `M${xFor(0)},${yFor(percentsIfYouStop[0]!)} ${linePath(percentsIfYouReviewDueCards).replace("M", "L")}`;

    return (
        <figure>
            <figcaption className="text-[13px] text-muted">How much you&apos;ll remember</figcaption>
            <svg
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                className="mt-2 block h-auto w-full overflow-visible"
                role="img"
                aria-label={
                    hasDueCards
                        ? `You remember ${percentNow}% now. By ${endLabel}, ${percentAtEndIfReview}% if you review today, ${percentAtEndIfStop}% if you stop.`
                        : `You remember ${percentNow}% now and ${percentAtEndIfStop}% by ${endLabel}.`
                }
            >
                {gridPercents.map((percent) => (
                    <g key={percent}>
                        <line
                            x1={PADDING_LEFT}
                            x2={CHART_WIDTH - PADDING_RIGHT}
                            y1={yFor(percent)}
                            y2={yFor(percent)}
                            className="stroke-foreground/[0.07]"
                        />
                        <text
                            x={PADDING_LEFT - 8}
                            y={yFor(percent) + 4}
                            textAnchor="end"
                            className="fill-faint text-[11px] tabular-nums"
                        >
                            {percent}%
                        </text>
                    </g>
                ))}

                <line
                    x1={xFor(lastPointIndex)}
                    x2={xFor(lastPointIndex)}
                    y1={PADDING_TOP}
                    y2={CHART_HEIGHT - PADDING_BOTTOM}
                    strokeDasharray="3 4"
                    className="stroke-foreground/15"
                />

                <path
                    d={linePath(percentsIfYouStop)}
                    fill="none"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={hasDueCards ? "5 5" : undefined}
                    className={hasDueCards ? "stroke-faint" : "stroke-accent"}
                />
                {hasDueCards && (
                    <path
                        d={reviewPathWithJump}
                        fill="none"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="stroke-accent"
                    />
                )}

                <circle cx={xFor(0)} cy={yFor(percentsIfYouStop[0]!)} r={4} className="fill-accent" />
                {hasDueCards && (
                    <circle
                        cx={xFor(lastPointIndex)}
                        cy={yFor(percentsIfYouStop[lastPointIndex]!)}
                        r={3.5}
                        strokeWidth={2}
                        className="fill-surface stroke-faint"
                    />
                )}
                <circle
                    cx={xFor(lastPointIndex)}
                    cy={yFor(hasDueCards ? percentsIfYouReviewDueCards[lastPointIndex]! : percentsIfYouStop[lastPointIndex]!)}
                    r={4}
                    className="fill-accent"
                />

                <text x={PADDING_LEFT} y={CHART_HEIGHT - 6} className="fill-faint text-[11px]">
                    Today
                </text>
                <text x={xFor(lastPointIndex)} y={CHART_HEIGHT - 6} textAnchor="end" className="fill-faint text-[11px]">
                    {axisEndLabel}
                </text>
                <text
                    x={xFor(0) + 8}
                    y={yFor(percentsIfYouStop[Math.round(lastPointIndex / 6)]!) + 20}
                    className="fill-foreground text-[11.5px] font-semibold tabular-nums"
                >
                    {percentNow}% now
                </text>
            </svg>

            <dl className="mt-3 text-sm">
                <div className="flex justify-end text-[12px] text-muted">On {endLabel}</div>
                {hasDueCards ? (
                    <>
                        <div className="mt-1 flex items-center gap-2.5">
                            <dt className="flex flex-1 items-center gap-2.5">
                                <span className="h-[2.5px] w-4 rounded-full bg-accent" />
                                If you review today
                            </dt>
                            <dd className="font-semibold tabular-nums">{percentAtEndIfReview}%</dd>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2.5">
                            <dt className="flex flex-1 items-center gap-2.5">
                                <span className="w-4 border-t-2 border-dashed border-faint" />
                                If you stop studying
                            </dt>
                            <dd className="font-semibold tabular-nums text-danger">{percentAtEndIfStop}%</dd>
                        </div>
                    </>
                ) : (
                    <div className="mt-1 flex items-center gap-2.5">
                        <dt className="flex flex-1 items-center gap-2.5">
                            <span className="h-[2.5px] w-4 rounded-full bg-accent" />
                            Nothing due, you&apos;re on track
                        </dt>
                        <dd className="font-semibold tabular-nums">{percentAtEndIfStop}%</dd>
                    </div>
                )}
            </dl>
        </figure>
    );
}
