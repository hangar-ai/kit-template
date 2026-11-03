//! What the tab shows, with no page around it: `tabs/panes/logic.js`, ported.
//!
//! Plain functions of what Hangar answered, so they are tested without a harness
//! (`tests/logic.rs`) and read without knowing the SDK's widgets. `lib.rs` draws them.

use hangar_kit_sdk::api::{KitError, Pane};
use hangar_kit_sdk::ui::Status;

/// One pane, as a row says it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Row {
    pub name: String,
    pub agent: String,
    /// `working`, `waiting`, `yours`, `idle`, or `unknown` when Hangar cannot tell.
    pub state: String,
    /// The shape that says the state, for anyone who cannot tell its colour.
    pub status: Status,
}

/// Everything the page can be: each of these is designed, none is a blank page.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum View {
    Loading,
    Empty,
    /// Hangar refused: the permission is not given.
    Denied,
    /// Anything else Hangar said, in its words.
    Error(String),
    List(Vec<Row>),
}

pub fn view_of(panes: &[Pane]) -> View {
    if panes.is_empty() {
        return View::Empty;
    }
    View::List(
        panes
            .iter()
            .map(|pane| Row {
                name: pane.name.clone(),
                agent: pane.agent.clone(),
                state: pane.state.clone().unwrap_or_else(|| "unknown".into()),
                status: status_of(pane.state.as_deref()),
            })
            .collect(),
    )
}

/// `denied` and the like are ordinary states of a tab, not exceptions to print.
pub fn view_of_error(error: &KitError) -> View {
    if error.is(KitError::DENIED) {
        View::Denied
    } else {
        View::Error(error.message.clone())
    }
}

fn status_of(state: Option<&str>) -> Status {
    match state {
        Some("working") => Status::Running,
        Some("waiting") => Status::Waiting,
        Some("yours") => Status::Success,
        _ => Status::Neutral,
    }
}
