// Cards and the deck. A card is a plain object, { rank, suit }: rank 1 (ace) to 13 (king), suit one of S H D C.
// Nothing here draws anything, so the rules can be tested, and an agent can learn, without a screen.

export const SUITS = ['S', 'H', 'D', 'C'];
export const SUIT_SYMBOL = { S: '♠', H: '♥', D: '♦', C: '♣' };
export const RANK_NAME = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/** What a card counts for, toward 15 and 31: an ace is 1, a face card 10. */
export function value(card) { return Math.min(card.rank, 10); }

/** A card's name, such as 10♥. */
export function cardName(card) { return RANK_NAME[card.rank] + SUIT_SYMBOL[card.suit]; }

/** Its picture: assets/cards/10H.svg (the card tool, scripts/tools/cards.js, draws all 52, and the back). */
export function cardImage(card) { return `assets/cards/${RANK_NAME[card.rank]}${card.suit}.svg`; }

/** A fresh deck: the 52 cards in order. */
export function newDeck() {
  const deck = [];
  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ rank, suit });
  return deck;
}

/**
 * Shuffle in place (Fisher–Yates): for each position from the last down, swap in a card chosen at random from those
 * not yet placed. Every order is equally likely. It uses Math.random, which training seeds, so a hand can be replayed.
 */
export function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** The same card? (Two objects can describe one card.) */
export function sameCard(a, b) { return a.rank === b.rank && a.suit === b.suit; }
