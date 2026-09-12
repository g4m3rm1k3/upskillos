export default {
  label: "Sprite Forge",
  emoji: "🧿",
  color: "fuchsia",
  kind: "builder",
  subject: "Creative",
  desc: "A pixel-art studio for real game assets: draw on an indexed grid with symmetry and onion skinning, animate across frames with per-frame timing, then pack the whole thing into a sprite sheet with the atlas JSON an engine needs to slice it.",
  path: "/lab/sprite-forge",
  tags: ["Design", "Pixel Art", "Game Dev", "Animation", "Creative", "Sprites"],
  cover: {
    grad: "from-fuchsia-600 via-purple-800 to-slate-950",
    mark: "▦",
    sub: "Draw · Animate · Pack"
  },
  order: 43,
  // A pixel editor is all side panels: tool rail, palette, preview, export
  // options and a frame strip all have to be on screen at once for the loop
  // between drawing and checking playback to stay tight. The app's default
  // 960x640 floating window leaves the canvas itself a few hundred pixels
  // wide. FloatingWindow clamps this against the real screen size.
  width: 1360,
  height: 900,
}
