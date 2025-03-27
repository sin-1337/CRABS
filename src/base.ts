export default class CRABS {
    private readonly ICONS: Record<string, string> = {
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

    private icon_height = 0;
    private icon_width = 0

    private modlist: Array<any>;

    constructor (icon_height: number, icon_width: number, modlist: any) {
        this.icon_height = icon_height;
        this.icon_width = icon_width;
        window.PlayerFocus = CRABS.showPlayerFocus;
        this.modlist = modlist;
    }

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


    private detectMod(targetmod: string): boolean {
        if (this.modlist.filter(x => x.name == targetmod).length > 0) {
            return(true);
        }
        else {
            return(false);
        }
    }

    private printicon(key: string) : string {
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
