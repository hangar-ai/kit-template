"use strict";
// What the tab shows, with no page around it. It takes window.hangar as an argument, so a test can
// pass a fake one.
(function (exports) {
  const GLYPHS = { working: "running", waiting: "waiting", yours: "success" };

  function viewOf(panes) {
    if (panes.length === 0) return { kind: "empty" };
    return {
      kind: "list",
      rows: panes.map((pane) => ({ name: pane.name, agent: pane.agent, state: pane.state ?? "unknown", glyph: GLYPHS[pane.state] ?? "neutral" })),
    };
  }

  /** `denied` and the like are ordinary states of a tab, not exceptions to print. */
  function viewOfError(error) {
    if (error.code === "denied") return { kind: "denied" };
    return { kind: "error", message: error.message };
  }

  /** Reads the panes now and whenever they change, and hands each view to `draw`. */
  function start(hangar, draw) {
    draw({ kind: "loading" });
    let latest = 0;
    async function read() {
      const turn = ++latest;
      let view;
      try {
        view = viewOf(await hangar.call("panes.list"));
      } catch (error) {
        view = viewOfError(error);
      }
      // An older answer arriving late must not replace a newer one.
      if (turn === latest) draw(view);
    }
    const stop = hangar.on("panes.changed", read);
    read();
    return stop;
  }

  exports.viewOf = viewOf;
  exports.viewOfError = viewOfError;
  exports.start = start;
})(typeof module === "object" ? module.exports : (window.kitLogic = {}));
