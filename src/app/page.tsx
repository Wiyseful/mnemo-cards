import DeckList from "@/components/DeckList";

export default function HomePage() {
    return (
        <main className="min-h-screen bg-[#f7f7f5]">
            <div className="mx-auto w-full max-w-lg px-3 pt-10 sm:max-w-2xl sm:pt-24">
                <DeckList />
            </div>
        </main>
    );
}