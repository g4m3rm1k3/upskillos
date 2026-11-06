// worlds/views.js
// The picture for each world in worlds/index.js, plus what the inspector says about one thing
// in it: the name of the argument the learner's function receives, and what the ship did.
import LightsView from './LightsView.jsx'

export const VIEWS = {
  lights: {
    View: LightsView,
    argName: 'room',
    defaultSelection: 'Cargo',
    selectTip: 'Click any room on the ship to inspect it.',
    // index of the selected thing in world.inputs() order
    indexOf: (world, selected) => world.rooms.findIndex(r => r.name === selected),
    did: (world, i) => `Light is ${world.rooms[i]?.lit ? 'on' : 'off'}${world.blackout ? ' (the blackout overrides your code)' : ''}.`,
  },
}
