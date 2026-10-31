"use strict";
// A window.hangar that answers as Hangar's docs say, over data held in memory. The tests call it
// directly, and the bench answers a real page's messages with it. Add the methods your tab calls.
(function (exports) {
  const refusal = (code, message) => Object.assign(new Error(message), { code });

  function createFakeHangar({ panes = [], deny = [], fail = null } = {}) {
    const listeners = new Map();
    const calls = [];
    const hangar = {
      calls,
      panes,
      /** What Hangar sends: an event to the tab. */
      emit(event, data = {}) {
        for (const handler of listeners.get(event) ?? []) handler(data);
      },
      on(event, handler) {
        listeners.set(event, [...(listeners.get(event) ?? []), handler]);
        return () => listeners.set(event, listeners.get(event).filter((other) => other !== handler));
      },
      async call(method, params) {
        calls.push({ method, params });
        if (deny.includes(method)) throw refusal("denied", `this tab was not granted ${method}`);
        if (fail) throw refusal(fail.code, fail.message);
        if (method === "panes.list") return hangar.panes;
        throw refusal("unknown", `no such method: ${method}`);
      },
    };
    return hangar;
  }

  exports.createFakeHangar = createFakeHangar;
})(typeof module === "object" ? module.exports : window);
