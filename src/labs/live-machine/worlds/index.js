// worlds/index.js
// The simulations a level can run in (its "world" field). A new world is a new kind of ship
// system: add its pure module here and its picture in views.jsx. Levels that reuse an
// existing world need only a JSON file.
import * as lights from './lights.js'

export const WORLDS = {
  lights,
}
