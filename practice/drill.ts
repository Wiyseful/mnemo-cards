type Card = {
    front: string,
    back: string,
    reviewCount: number,
    isDue: boolean,
};


const practiceCard: Card = {
    front: "What is RAM",
    back: "Random Access Memory",
    reviewCount: 2,
    isDue: true,
};

const getQuestion = (card: Card): string => {
    return card.front;
}

function getSummary(card: Card): string {
    return `${card.front} - reviewed ${card.reviewCount} times`;
}


function reviewCard(card: Card): void {
    card.reviewCount++;
    card.isDue = false;
}

const reviewedCard = {
    ...practiceCard,
    isDue: false,
    reviewCount: practiceCard.reviewCount + 1,
};


const getReviewedCard = (card: Card): Card => {
    return {
        ...card,
        reviewCount: card.reviewCount + 1,
        isDue: false,
    }
};

const resetCard = (card: Card): Card => {
    return {
        ...card,
        reviewCount: 0,
        isDue: true,
    }
}

const nextCard = getReviewedCard(practiceCard);
const studyCards: Card[] = [practiceCard, resetCard(nextCard)];
const reviewedCards = studyCards.filter(card => card.reviewCount > 0);
const dueCards = studyCards.filter(card => card.isDue === true);
const reviewCount = studyCards.map(card => card.reviewCount);
const questions = studyCards.map(card => card.front);
const sortedCards = [...studyCards].sort((a, b) => a.reviewCount - b.reviewCount);
const firstCard = sortedCards[0];

if (sortedCards[0] !== undefined) {
    console.log(sortedCards[0].front);
}