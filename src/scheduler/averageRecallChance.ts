import type {Card} from './types';
import {MS_PER_DAY} from './time';
import {retrievability} from '@/engine';


export function averageRecallChance(cards: Card[], currentTimeMs: number): number {
    let total = 0;
    for (const card of cards) {
        if (card.stability === null || card.lastReviewedAt === null) {
            continue;
        }

        const daysSinceLastReview = Math.max(0, (currentTimeMs - card.lastReviewedAt) / MS_PER_DAY);
        const recallChance = retrievability(card.stability, daysSinceLastReview);
        total += recallChance;
    }
    return cards.length > 0 ? total / cards.length : 0;
}
