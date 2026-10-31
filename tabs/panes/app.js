"use strict";
// Draws what logic.js says, with Hangar UI's classes: no colour and no measure of its own.
(function () {
  const t = window.hangar.ui.i18n({
    en: {
      title: "Panes",
      loading: "Reading the panes…",
      empty: "No pane yet",
      emptyText: "Open a terminal in this workspace, and it shows here.",
      denied: "This tab may not read the panes",
      deniedText: "Accept panes.read for this kit in Settings › Kits.",
      failed: "The panes could not be read",
      working: "Working",
      waiting: "Waiting for an answer",
      yours: "Your turn",
      idle: "Idle",
      unknown: "State unknown",
    },
    fr: {
      title: "Panneaux",
      loading: "Lecture des panneaux…",
      empty: "Aucun panneau",
      emptyText: "Ouvrez un terminal dans cet espace de travail : il s'affiche ici.",
      denied: "Cet onglet ne peut pas lire les panneaux",
      deniedText: "Acceptez panes.read pour ce kit dans Réglages › Kits.",
      failed: "Impossible de lire les panneaux",
      working: "Au travail",
      waiting: "Attend une réponse",
      yours: "À vous",
      idle: "Inactif",
      unknown: "État inconnu",
    },
  });

  const app = document.getElementById("app");

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function notice(title, text, icon) {
    const box = element("div", "kit-empty");
    if (icon) box.append(element("span", `kit-icon kit-icon--${icon} kit-empty__icon`));
    box.append(element("p", "kit-empty__title", title));
    if (text) box.append(element("p", "kit-empty__text", text));
    return box;
  }

  function row({ name, agent, state, glyph }) {
    const item = element("li", "kit-row");
    const lead = element("span", "kit-row__lead");
    const shape = element("span", `kit-glyph kit-glyph--${glyph}`);
    shape.setAttribute("role", "img");
    shape.setAttribute("aria-label", t(state));
    lead.append(shape);
    const main = element("span", "kit-row__main");
    main.append(element("span", "kit-row__title", name), element("span", "kit-row__sub", `${agent}, ${t(state)}`));
    item.append(lead, main);
    return item;
  }

  function draw(view) {
    const page = element("main", "kit-page");
    if (view.kind === "loading") {
      const box = element("div", "kit-empty");
      box.append(element("span", "kit-state kit-state--running", t("loading")));
      page.append(box);
    } else if (view.kind === "empty") {
      page.append(notice(t("empty"), t("emptyText")));
    } else if (view.kind === "denied") {
      page.append(notice(t("denied"), t("deniedText"), "lock"));
    } else if (view.kind === "error") {
      page.append(notice(t("failed"), view.message, "alert"));
    } else {
      const list = element("ul", "kit-rows");
      list.append(...view.rows.map(row));
      page.append(list);
    }
    const header = element("header", "kit-header");
    const main = element("div", "kit-header__main");
    main.append(element("h1", "kit-header__title", t("title")));
    header.append(main);
    app.replaceChildren(header, page);
  }

  window.kitLogic.start(window.hangar, draw);
})();
