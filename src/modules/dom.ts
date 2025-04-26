import * as Modules from "."

export function loadDOM() {
    window.sendWhisper = Modules.WhisperPlus.sendWhisper;
    window.printRoster = Modules.Roster.printRoster;
}
