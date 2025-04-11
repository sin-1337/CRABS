import bcModSdk, {ModSDKModAPI, ModSDKModInfo} from "bondage-club-mod-sdk";

export default class CRABS {
    declare crabs: ModSDKModAPI;
    
    prtected readonly ICONS: Record<string, string> = {
        "admin" : "icons/admin.svg",
        "vip" : "icons/vip.svg",
        "player" : "icons/player.svg",
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
        "thought": "icons/thought.svg"
    }

    protected icon_height = 0;
    protected icon_width = 0

    constructor (icon_height: number, icon_width: number, CRABS: ModSDKModAPI) {
        this.icon_height = icon_height;
        this.icon_width = icon_width;
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


    protected detectMod(targetmod: string): boolean {
        return(this.modlist.filter(x => x.name == targetmod).length > 0);
    }

    protected printicon(key: string) : string {
        let ICON = "./icons/error.svg";
        if (key in this.ICONS) {
            ICON = this.ICONS[key];
        }

        let absolutepath = "https://sin-1337.github.io/CRABS/"
        let html = "";
        html += "<img ";
        html += "height=" + this.icon_height + "px' ";
        html += "width='" + this.icon_width + "px' ";
        html += "alt='" + key + "' ";
        html += "src='" + absolutepath + ICON + "'";
        html += ">";
        return(html);
    }
}
