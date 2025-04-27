import * as Modules from "."

export default function loadDOM() {
    window.sendWhisper = Modules.WhisperPlus.sendWhisper;
    window.printRoster = Modules.Roster.printRoster;
}
