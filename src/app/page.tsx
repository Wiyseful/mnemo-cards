import Link from "next/link";
import { sampleDecks } from "@/data/sampleCards";

export default function HomePage() {
    return (
        <main>
            <h1>Decks</h1>
            <ul>
                {sampleDecks.map((deck) => (
                    <li key={deck.id}>
                        <Link href={`/deck/${deck.id}`}>{deck.name}</Link>
                    </li>
                ))}
            </ul>
        </main>
    );
}