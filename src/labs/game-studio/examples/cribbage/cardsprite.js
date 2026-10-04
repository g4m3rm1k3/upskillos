// A card on the table: a sprite that shows its face or its back, and slides to wherever the table puts it.

import { cardImage } from './cards.js';

export const CARD_BACK = 'assets/cards/back.svg';
/** Cards are drawn at 80 × 112: the 100 × 140 pictures at 0.8. */
export const CARD_SCALE = 0.8;

export default class CardSprite extends Sprite2D {
  constructor(card, from) {
    super();
    this.card = card;
    this.name = 'Card';
    this.faceUp = false;
    this.position = new Vec2(from.x, from.y);
    this.target = { x: from.x, y: from.y };
    this.scale = new Vec2(CARD_SCALE, CARD_SCALE);
    this.texture = CARD_BACK;
  }

  update(dt) {
    // Close most of the gap each frame: fast at first, slowing as it arrives (about a fifth of a second).
    const k = 1 - Math.exp(-14 * dt), p = this.position, t = this.target;
    this.position = new Vec2(p.x + (t.x - p.x) * k, p.y + (t.y - p.y) * k);
    this.texture = this.faceUp ? cardImage(this.card) : CARD_BACK;
  }

  /** Is a point on this card? */
  contains(point) {
    return this.visible && Math.abs(point.x - this.target.x) <= 50 * CARD_SCALE && Math.abs(point.y - this.target.y) <= 70 * CARD_SCALE;
  }
}
