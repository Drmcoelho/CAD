"use strict";
/* Recomputa fixtures.json pelo core. Falha se qualquer caso divergir. */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const core = require("./cad_core.js");
const fx = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures.json"), "utf8"));

let n = 0;
const approx = (a, b, tol = 0.02) => Math.abs(a - b) <= tol;

for (const c of fx.deltaRatio) {
  const ag = core.anionGap(c.na, c.cl, c.hco3);
  const agc = core.correctedAnionGap(ag, c.albumin);
  const ratio = core.deltaRatio(agc, c.hco3);
  assert.ok(approx(ratio, c.expectRatio, 0.02), `${c.id}: Δ/Δ ${ratio.toFixed(2)} != ${c.expectRatio}`);
  assert.strictEqual(core.interpretDeltaRatio(ratio).band, c.expectBand, `${c.id}: banda`);
  n += 2;
}
for (const c of fx.osmolality) {
  const osm = core.effectiveOsmolality(c.na, c.glucose);
  assert.ok(approx(osm, c.expectEffective, 0.1), `${c.id}: osm ${osm.toFixed(1)} != ${c.expectEffective}`);
  n += 1;
}
for (const c of fx.potassium) {
  const plan = core.potassiumPlan(c.k);
  if (c.expectInsulin) { assert.strictEqual(plan.insulin, c.expectInsulin, `${c.id}: insulina`); n++; }
  if (c.expectReplace === false) { assert.ok(/no initial potassium/.test(plan.potassium), `${c.id}: sem reposição`); n++; }
}
console.log(`fixtures passed ${n}`);
