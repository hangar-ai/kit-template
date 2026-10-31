"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { viewOf, viewOfError, start } = require("../tabs/panes/logic.js");
const { createFakeHangar } = require("./fake-hangar.js");

const settle = () => new Promise((resolve) => setImmediate(resolve));
const pane = (name, state) => ({ name, agent: "claude", role: null, state, canSend: true });

test("each pane becomes a row, with a shape for its state", () => {
  const { rows } = viewOf([pane("Ava", "working"), pane("Zoe", "waiting"), pane("Iris", "yours"), pane("Bob", "idle"), pane("Sam", null)]);
  assert.deepEqual(rows.map((row) => row.glyph), ["running", "waiting", "success", "neutral", "neutral"]);
  assert.equal(rows[4].state, "unknown");
});

test("no pane is a designed state, and so is a refusal", () => {
  assert.deepEqual(viewOf([]), { kind: "empty" });
  assert.deepEqual(viewOfError(Object.assign(new Error("no"), { code: "denied" })), { kind: "denied" });
  assert.deepEqual(viewOfError(Object.assign(new Error("gone"), { code: "unavailable" })), { kind: "error", message: "gone" });
});

test("it says it is loading, shows the panes, and reads again when they change", async () => {
  const hangar = createFakeHangar({ panes: [pane("Ava", "idle")] });
  const views = [];
  start(hangar, (view) => views.push(view));
  assert.equal(views[0].kind, "loading");
  await settle();
  assert.equal(views.at(-1).rows[0].name, "Ava");
  hangar.panes = [];
  hangar.emit("panes.changed");
  await settle();
  assert.deepEqual(views.at(-1), { kind: "empty" });
});

test("denied by Hangar, the tab says so", async () => {
  const hangar = createFakeHangar({ deny: ["panes.list"] });
  const views = [];
  start(hangar, (view) => views.push(view));
  await settle();
  assert.deepEqual(views.at(-1), { kind: "denied" });
});

test("an older answer arriving late does not replace a newer one", async () => {
  const answers = [];
  const hangar = createFakeHangar();
  hangar.call = () => new Promise((resolve) => answers.push(resolve));
  const views = [];
  start(hangar, (view) => views.push(view));
  hangar.emit("panes.changed");
  answers[1]([pane("New", "idle")]);
  await settle();
  answers[0]([pane("Old", "idle")]);
  await settle();
  assert.equal(views.at(-1).rows[0].name, "New");
});
