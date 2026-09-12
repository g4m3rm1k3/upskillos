export default {
  label: "Tile Mapper",
  emoji: "🗺️",
  color: "emerald",
  kind: "builder",
  subject: "Creative",
  desc: "Build game backgrounds and levels from a tileset — paint on stacked layers, let autotiling join terrain up for you with a 4-bit neighbour mask, mark collision, then export a flattened background PNG or Tiled .tmj map data that Phaser, Godot and LÖVE read directly. Loads sprite sheets straight from Sprite Forge.",
  path: "/lab/tile-mapper",
  tags: ["Design", "Game Dev", "Tilemaps", "Pixel Art", "Level Design", "Creative"],
  cover: {
    grad: "from-emerald-600 via-teal-800 to-slate-950",
    mark: "▦",
    sub: "Paint · Autotile · Export"
  },
  order: 44,
  // Tileset picker, layer stack and export options all need to be visible
  // while the map itself stays big enough to paint on. The app's default
  // 960x640 floating window leaves the map a few hundred pixels wide;
  // FloatingWindow clamps this against the real screen.
  width: 1360,
  height: 900,
}
