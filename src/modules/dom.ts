import * as Modules from "."

/** Loads DOM functions into the window object
 *  @returns {void}
 */
export default function loadDOM() {
    window.sendWhisper = Modules.WhisperPlus.sendWhisper;
    window.PlayerFocus = Modules.Roster.showPlayerFocus;
    window.printRoster = Modules.Roster.printRoster;
    window.crabsCloseItem = Modules.Roster.closeElement;
}
