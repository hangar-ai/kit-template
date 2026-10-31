"use strict";
// What the bench shows the tab: one entry per state worth looking at.
window.BENCH_STATES = {
  list: {
    panes: [
      { name: "Iris", agent: "claude", role: "orchestrator", state: "working", canSend: true },
      { name: "Zoe with a name long enough to have to truncate at the narrowest width", agent: "codex", role: "worker", state: "waiting", canSend: false },
      { name: "Ava", agent: "gemini", role: "worker", state: "yours", canSend: false },
      { name: "Shell", agent: "shell", role: null, state: null, canSend: false },
    ],
  },
  empty: { panes: [] },
  denied: { deny: ["panes.list"] },
  error: { fail: { code: "unavailable", message: "The workspace's folder is gone." } },
};
