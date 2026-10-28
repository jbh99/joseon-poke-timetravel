// Frame-cost probe for the lag review: times the current scene's update() and draw() for a while (CPU side; the
// browser's own raster work is not included), and how long building towns and floors takes (a hitch on entering).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stats = (a) => {
  a.sort((x, y) => x - y);
  const n = a.length, avg = a.reduce((s, x) => s + x, 0) / Math.max(1, n);
  return { n, avg: +avg.toFixed(2), p95: +(a[Math.floor(n * 0.95)] || 0).toFixed(2), max: +(a[n - 1] || 0).toFixed(2) };
};
// the current scene, sampled for `ms`
export async function frames(label, ms = 2500) {
  const { G } = window.__game, sc = G.scene, P = Object.getPrototypeOf(sc), d = [], u = [];
  sc.draw = function (c) { const t = performance.now(); P.draw.call(this, c); d.push(performance.now() - t); };
  sc.update = function (dt) { const t = performance.now(); P.update.call(this, dt); u.push(performance.now() - t); };
  await sleep(ms);
  delete sc.draw; delete sc.update;
  return { label, scene: sc.constructor.name, draw: stats(d), update: stats(u) };
}
// milliseconds to run fn (mean of `n` runs)
export function time(fn, n = 3) {
  const t = [];
  for (let i = 0; i < n; i++) { const t0 = performance.now(); fn(); t.push(performance.now() - t0); }
  return +stats(t).avg.toFixed(1);
}
