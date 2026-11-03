//! The panes tab, in Rust: what a native kit starts from.
//!
//! A tab is a [`Kit`], the shape of an iced program:
//!
//! - **State**: the struct below. One instance per open tab, dropped when it closes.
//! - **Messages**: everything that can happen to it (an answer, an event, a click).
//! - **`init`** makes the state and asks Hangar for the panes. **`update`** answers a
//!   message. **`view`** draws the state, and nothing else: Hangar asks for it after
//!   every update. **`subscriptions`** says which of Hangar's events it listens to.
//! - **Calls are tasks**: `cx.call` goes out when `update` returns, and the answer
//!   comes back later as a message of its own. Nothing here waits.
//!
//! The same tab as `tabs/panes/` (the page Hangar 1.x opens): it asks for
//! `panes.list` under `panes.read`, reads again when `panes.changed`, and draws a
//! row per pane, or one of four states: loading, empty, denied, failed.
//! `logic.rs` decides what to show, this file draws it.

pub mod logic;

use hangar_kit_sdk::api::{Pane, Theme};
use hangar_kit_sdk::prelude::*;

use logic::View;

/// Every string the tab says, in English and in French; English fills in what
/// French lacks. A key with `_one` and `_other` is picked by a count (`tn`).
fn strings(locale: &str) -> Strings {
    Strings::new(locale)
        .add(
            "en",
            &[
                ("title", "Panes"),
                ("loading", "Reading the panes…"),
                ("empty", "No pane yet"),
                (
                    "emptyText",
                    "Open a terminal in this workspace, and it shows here.",
                ),
                ("denied", "This tab may not read the panes"),
                (
                    "deniedText",
                    "Accept panes.read for this kit in Settings › Kits.",
                ),
                ("failed", "The panes could not be read"),
                ("working", "Working"),
                ("waiting", "Waiting for an answer"),
                ("yours", "Your turn"),
                ("idle", "Idle"),
                ("unknown", "State unknown"),
            ],
        )
        .add(
            "fr",
            &[
                ("title", "Panneaux"),
                ("loading", "Lecture des panneaux…"),
                ("empty", "Aucun panneau"),
                (
                    "emptyText",
                    "Ouvrez un terminal dans cet espace de travail : il s'affiche ici.",
                ),
                ("denied", "Cet onglet ne peut pas lire les panneaux"),
                (
                    "deniedText",
                    "Acceptez panes.read pour ce kit dans Réglages › Kits.",
                ),
                ("failed", "Impossible de lire les panneaux"),
                ("working", "Au travail"),
                ("waiting", "Attend une réponse"),
                ("yours", "À vous"),
                ("idle", "Inactif"),
                ("unknown", "État inconnu"),
            ],
        )
}

pub struct Panes {
    t: Strings,
    /// What the page shows now.
    view: View,
    /// How many times the panes were asked for. An answer carries the number of its
    /// asking, so one that arrives late cannot replace a newer one.
    asked: u32,
}

#[derive(Clone)]
pub enum Message {
    /// `panes.list` answered: `turn` is the asking it answers.
    Panes {
        turn: u32,
        answer: Result<Vec<Pane>, KitError>,
    },
    /// `panes.changed`: the workspace's panes are not the ones we have.
    Changed,
    /// Hangar's language or scheme changed.
    Theme(Theme),
}

impl Panes {
    fn read(&mut self, cx: &mut Context<Message>) {
        self.asked += 1;
        let turn = self.asked;
        cx.call(api::PanesList {}, move |answer| Message::Panes {
            turn,
            answer,
        });
    }
}

impl Kit for Panes {
    type Message = Message;

    fn init(start: &Start, cx: &mut Context<Message>) -> Self {
        let mut tab = Panes {
            t: strings(&start.theme.locale),
            view: View::Loading,
            asked: 0,
        };
        tab.read(cx);
        tab
    }

    fn update(&mut self, message: Message, cx: &mut Context<Message>) {
        match message {
            Message::Changed => self.read(cx),
            Message::Panes { turn, answer } => {
                // An older answer arriving late must not replace a newer one.
                if turn == self.asked {
                    self.view = match answer {
                        Ok(panes) => logic::view_of(&panes),
                        Err(error) => logic::view_of_error(&error),
                    };
                }
            }
            Message::Theme(theme) => self.t.set_locale(theme.locale),
        }
    }

    fn view(&self) -> Element<Message> {
        let t = &self.t;
        let body: Element<Message> = match &self.view {
            View::Loading => loading(t.t("loading")).into(),
            View::Empty => empty(t.t("empty")).text(t.t("emptyText")).into(),
            View::Denied => denied(t.t("denied")).text(t.t("deniedText")).into(),
            View::Error(message) => failed(t.t("failed")).text(message.clone()).into(),
            View::List(rows) => list(rows.iter().map(|row| {
                let state = t.t(&row.state);
                item(row.name.clone())
                    .lead(glyph(row.status, state.clone()))
                    .sub(format!("{}, {state}", row.agent))
            }))
            .into(),
        };
        page![header(t.t("title")), body].into()
    }

    fn subscriptions(&self) -> Subscriptions<Message> {
        Subscriptions::none()
            .panes_changed(Message::Changed)
            .theme(Message::Theme)
    }
}

// Gives the module its exports. Written once; on the host it writes nothing, which
// is why `cargo test` can run this same crate.
export_kit!(Panes);
