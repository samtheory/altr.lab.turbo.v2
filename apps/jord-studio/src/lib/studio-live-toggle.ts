/** Live toggle state for a table tab (S0086). Pure reducer; in-memory only (not persisted). */

export type LiveConn = "off" | "connecting" | "live" | "reconnecting";

export type LiveToggleState = {
  on: boolean;
  conn: LiveConn;
  /** Dismissible banner text; null when none. */
  error: string | null;
};

export type LiveToggleAction =
  | { type: "toggle"; on: boolean }
  | { type: "connecting" }
  | { type: "open" }
  | { type: "reconnecting" }
  /** The stream closed for good (EventSource CLOSED): turn off and surface why. */
  | { type: "closed"; message: string }
  | { type: "dismiss" };

export const LIVE_TOGGLE_INITIAL: LiveToggleState = { on: false, conn: "off", error: null };

export function liveToggleReducer(state: LiveToggleState, action: LiveToggleAction): LiveToggleState {
  switch (action.type) {
    case "toggle":
      // Turning on clears a stale error; turning off unsubscribes (conn off) but keeps the banner.
      return action.on
        ? { on: true, conn: "connecting", error: null }
        : { on: false, conn: "off", error: state.error };
    case "connecting":
      return state.on ? { ...state, conn: "connecting" } : state;
    case "open":
      return state.on ? { ...state, conn: "live", error: null } : state;
    case "reconnecting":
      return state.on ? { ...state, conn: "reconnecting" } : state;
    case "closed":
      return { on: false, conn: "off", error: action.message };
    case "dismiss":
      return state.error == null ? state : { ...state, error: null };
  }
}

/** Badge label + tone for the toggle. */
export function liveBadge(conn: LiveConn): { label: string; tone: "success" | "warning" | "secondary" } {
  switch (conn) {
    case "live":
      return { label: "Live", tone: "success" };
    case "connecting":
      return { label: "Connecting", tone: "secondary" };
    case "reconnecting":
      return { label: "Degraded · reconnecting", tone: "warning" };
    case "off":
      return { label: "Off", tone: "secondary" };
  }
}
