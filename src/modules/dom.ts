import * as Modules from "."

export default function loadDOM() {
    window.sendWhisper = Modules.WhisperPlus.sendWhisper;
    window.PlayerFocus = Modules.Roster.showPlayerFocus;
    window.printRoster = Modules.Roster.printRoster;
    window.crabsCloseItem = Modules.Banner.close;
}
