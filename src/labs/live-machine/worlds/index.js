// worlds/index.js
// The simulations a level can run in (its "world" field). A new world is a new kind of ship
// system: add its pure module here and its picture in views.js. Levels that reuse an
// existing world need only a JSON file. Shared ship parts live in ship.js.
import * as lights from './lights.js'
import * as reactor from './reactor.js'
import * as doors from './doors.js'

export const WORLDS = {
  lights,
  reactor,
  doors,
}
