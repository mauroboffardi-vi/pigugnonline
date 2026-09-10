import { Card } from './Card';
import { CardSorter } from './CardSorter';

// 1. Estendiamo l'interfaccia globale Array per far felice TypeScript
declare global {
    interface Array<T> {
        toDebugString(): string;
    }
}

// 2. Implementiamo il metodo sul prototipo di Array
Array.prototype.toDebugString = function (this: any[]): string {
    if (!this || this.length === 0) {
        return "Nessuna carta";
    }

    // Se il primo elemento non è una carta, fallback a stringa standard
    if (!(this[0] instanceof Card)) {
        return this.toString();
    }

    const sortedCards = CardSorter.sortHand([...this]);
    const groupedBySuit: Record<string, string[]> = {};

    for (const card of sortedCards) {
        if (!groupedBySuit[card.suit]) {
            groupedBySuit[card.suit] = [];
        }

        const name = card.value === 1 ? 'asso' : card.getImageName();
        groupedBySuit[card.suit].push(name);
    }

    return Object.entries(groupedBySuit)
        .map(([suit, cardNames]) => {
            const suitName = suit.charAt(0).toUpperCase() + suit.slice(1);
            return `${suitName}: ${cardNames.join(', ')}`;
        })
        .join('; ');
};