import bcModSdk, {ModSDKModAPI, ModSDKModInfo} from "bondage-club-mod-sdk";
import "./styles/base.css";
export default class CRABS {
    declare crabs: ModSDKModAPI;
    
    protected readonly ICONS: Record<string, string> = {
        // logo
        "logo" : "CRABS_Logo.png",

        // badges
        "admin" : "icons/admin.svg",
        "vip" : "icons/vip.svg",
        "player" : "icons/player.svg",

        // icons
        "you" : "icons/you.svg",
        "owner" : "icons/owner.svg",
        "sub" : "icons/sub.svg",
        "trial" : "icons/trial.svg",
        "lover" : "icons/lover.svg",
        "bestfriend" : "icons/bestfriend.svg",
        "friend" : "icons/friends.svg",
        "whitelist" : "icons/whitelist.svg",
        "blacklist" : "icons/blacklist.svg",
        "ghost" : "icons/ghost.svg",
        "thought": "icons/thought.svg",
        
        // globe icon for all BC players
        "connected": "icons/connected.svg",

        //map keys
        "keyGold": "icons/keyGold.png",
        "keySilver": "icons/keySilver.png",
        "keyBronze": "icons/keyBronze.png",
        "keyNull": "icons/keyNull.svg",
    }

    constructor (CRABS: ModSDKModAPI) {
        this.crabs = CRABS;
    }

        // Opens the player profile
        // This functions is setup up to be exposed to the global DOM
    public static showPlayerFocus(MemberNumber: number): void {
        // Check if the person is still in the room
      const PLAYER = ChatRoomCharacter.find(C => C.MemberNumber == MemberNumber);
        if (PLAYER) {
            ChatRoomStatusUpdate("Preference");
            ChatRoomFocusCharacter(PLAYER);
        } else {
            ChatRoomSendLocal("This person is no longer in the room.");
        }
    };

    // determine if requested mod is loaded.
    protected detectMod(targetmod: string): boolean {
        let modlist = bcModSdk.getModsInfo();
        console.log(modlist);
        return(modlist.filter(x => x.name == targetmod).length > 0);
    }

    //print the crabs logo
    protected printlogo(): string {
        let absolutepath = "https://sin-1337.github.io/CRABS/" // absolute path of the crabs project
        let html = "";
        html += `<img `;
        html += `alt='CRABS' `;
        html += `src='${absolutepath}${this.ICONS["logo"]}' `;
        html += `height="100px" width="100px"`;
        html += `>`;
        return(html);
    }

    // print icons
    protected printicon(key: string, tooltip: string = "") : string {
        let ICON = "./icons/error.svg";
        if (key in this.ICONS) {
            ICON = this.ICONS[key];
        }

        let absolutepath = "https://sin-1337.github.io/CRABS/" // absolute path of the crabs project
        let html = "";
        if (tooltip != "") html += `<div class='CRABS_tooltip-wrapper'>` // skip the tool tip if string wasn't set
        html += `<img `;
        html += `alt='${key}' `;
        html += `src='${absolutepath}${ICON}' `;
        html += `class='CRABS_tooltip-image'`;
        html += `>`;
        if (tooltip != "") html += `<div class='CRABS_tooltip'>${tooltip}</div>`
        if (tooltip != "") html += `</div>`;
        return(html);
    }
}
