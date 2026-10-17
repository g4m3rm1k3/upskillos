// The hidden tests behind every coding challenge in this course. A challenge's `tests` is
// KIT followed by a few calls to __check, run right after the learner's code in a Web
// Worker started by the sandboxed frame (ScienceNotebook puts both in one function, so the
// tests can call what they defined). There is no DOM there: results go out through
// __line(ok, text) and __verdict(pass, message), which the host provides (the frame draws
// each line in the output pane). __check compares the learner's function with a brute-force
// reference written a different way, on fixed cases and on seeded random ones; the run ends
// with one verdict.
//
// dp-challenges.test.js runs every challenge the same way in Node, and requires the
// reference solution to pass and the starting code to fail.
//
// In a challenge:
//   tests: KIT + `
//     __check(climbStairs, 'climbStairs', [[1], [2], [5]], n => ..., { random: { count: 20, make: r => [1 + r.int(30)] } })
//     __done()
//   `
//   __check(fn, name, cases, reference, options)
//     cases      a list of argument lists, e.g. [[[1, 2, 3]], [[5]]] for a one-array function
//     reference  the trusted answer for the same arguments
//     options    random: { count, make(r) → argument list }  r.int(n) is 0..n-1, r.pick(list)
//                same(got, want) → bool                        default: deep equality
//   __done(note) passes, unless a check already failed.

export const KIT = String.raw`
var __failed = false, __passed = 0;
function __rng(seed) {
  var s = seed >>> 0;
  function next() { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  return { next: next, int: function (n) { return Math.floor(next() * n); }, pick: function (list) { return list[Math.floor(next() * list.length)]; } };
}
function __show(v) { try { var j = JSON.stringify(v); return j === undefined ? String(v) : (j.length > 80 ? j.slice(0, 77) + '...' : j); } catch (e) { return String(v); } }
function __same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function __clone(v) { return v === undefined ? v : JSON.parse(JSON.stringify(v)); }
function __check(fn, name, cases, reference, options) {
  if (__failed) return;
  options = options || {};
  var same = options.same || __same, all = cases.map(function (c) { return { args: c, random: false }; });
  if (options.random) { var r = __rng(options.random.seed || 12345); for (var i = 0; i < options.random.count; i++) all.push({ args: options.random.make(r), random: true }); }
  if (typeof fn !== 'function') { __failed = true; __line(false, name + ' is not a function'); __verdict(false, name + ' should be a function, but it is ' + typeof fn + '.'); return; }
  for (var k = 0; k < all.length; k++) {
    var args = all[k].args, call = name + '(' + args.map(__show).join(', ') + ')', want = reference.apply(null, __clone(args)), got;
    try { got = fn.apply(null, __clone(args)); } catch (e) { __failed = true; __line(false, call + ' threw: ' + e.message); __verdict(false, call + ' threw an error: ' + e.message); return; }
    if (!same(got, want)) { __failed = true; __line(false, call + ' returned ' + __show(got) + ', expected ' + __show(want)); __verdict(false, call + ' returned ' + __show(got) + ', but the answer is ' + __show(want) + (all[k].random ? '. (A random case: the fixed examples passed.)' : '.')); return; }
    __passed++;
    if (!all[k].random) __line(true, call + ' = ' + __show(got));
  }
  if (options.random) __line(true, options.random.count + ' random cases checked against a brute-force answer');
}
function __done(note) { if (!__failed) __verdict(true, 'All ' + __passed + ' cases passed.' + (note ? ' ' + note : '')); }
`
