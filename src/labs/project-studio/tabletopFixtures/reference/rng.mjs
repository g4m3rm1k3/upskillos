// A repeatable source for experiments, not a security random generator.
export function seeded(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
export function rollFace(random = Math.random) {
  return 1 + Math.floor(random() * 6);
}
