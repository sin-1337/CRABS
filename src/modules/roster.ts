export default class Roster {
    const ICONS: Record<string, string> = {
        "admin" : "./icons/admin.svg",
        "vip" : "./icons/vip.svg",
        "player" : "./icons/player.svg",
        "you" : "./icons/you.svg",
        "owner" : "./icons/owner.svg",
        "sub" : "./icons/sub.svg",
        "trial" : "./icons/trial.svg",
        "lover" : "./icons/lover.svg",
        "friend" : "./icons/friends.svg",
        "whitelist" : "./icons/whitelist.svg",
        "blacklist" : "./icons/blacklist.svg",
        "ghost" : "./icons/ghost.svg"
    }

    icon_height = 0;
    icon_width = 0

    constructor (icon_height: number, icon_width: number) {
        this.icon_height = icon_height;
        this.icon_width = icon_width;
    }

    printicon(key: string) : string {
        let ICON = "./icons/error.svg";
        if (key in this.ICONS) {
            ICON = this.ICONS[key];
        }

        let html = "";

        html += "<img ";
        html += "height=" + this.icon_height + "' ";
        html += "width='" + this.icon_width + "' ";
        html += "alt='" + key + "' ";
        html += "src='" + ICON + "'";
        html += ">"
        return(html);
    }

    // show help
    showhelp() : string {
        return `<table style="width: 100%"><tr><td>
            <span style=" text-shadow: 0px 0px 3px #000000; white-space: normal;">
            </br>
            <hr>
            /player help sheet</br>
            This command lists the number of admins and players </br>
            in a room and gives you some informatoin about them </br>

            </br>
            Arguments:
            <hr>
            help - show this menu </br>
            count - show only the player count </br>
            admins - show only a list of admins and the counts </br>
            vips - show only room whitelisted and the counts </br>

            </br>
            Badges:
            <hr>
            ${printicon("admin")} = Person is Admin</br>
            ${printicon("vip")} = Person is whitelisted in the room </br>
            ${printicon("player")} = Person is a normal user </br>

            </br>
            Icons:
            <hr>
            ${printicon("you")} = Person is you </br>
            ${printicon("owner")} = Person is your owner </br>
            ${printicon("sub")} = Person is your submissive </br>
            ${printicon("trial")} = Person is on trial with you </br>
            ${printicon("lover")} = Person is your lover </br>
            ${printicon("friend")} = Person is a friend </br>
            ${printicon("whitelist")} = You have this person whitelisted </br>
            ${printicon("blacklist")} = You have this person blacklisted </br>
            ${printicon("ghost")} = You have ghosted this person </br>

            </br>
            Actions:
            <hr>
            Click Badge - If you click the badge for a player it will be as if you clicked them to interact. </br>
            Click name - If you click the name/number of a player it will whisper them without range constraints. </br>
            </span>
            </td>
            </tr>
            </table>`;
    }


    // Opens the player profile
    // This functions is setup up to be exposed to the global DOM
    window.showPlayerProfile = function (MemberNumber) {
        // Check if the person is still in the room
        const PLAYER = ChatRoomCharacter.find(C => C.MemberNumber == MemberNumber);
        if (PLAYER) {
            ChatRoomStatusUpdate("Preference");
            InformationSheetLoadCharacter(PLAYER);
        } else {
            ChatRoomSendLocal("This person is no longer in the room.");
        }
    };

    // This functions is setup up to be exposed to the global DOM
    window.showPlayerFocus = function (MemberNumber) {
        // Check if the person is still in the room
      const PLAYER = ChatRoomCharacter.find(C => C.MemberNumber == MemberNumber);
        if (PLAYER) {
            ChatRoomStatusUpdate("Preference");
            ChatRoomFocusCharacter(PLAYER);
        } else {
            ChatRoomSendLocal("This person is no longer in the room.");
        }
    };

    // formats the data for outputting
   formatoutput(player: any, badge: string, player_icons: string, isMe: boolean) : string {
      let playername = CharacterNickname(player);
      let output = `<tr>
                <td style="padding-left: 5px; padding-right-5px; padding-bottom: 1px; padding-top: 0;"><span style="cursor:pointer;" onclick="showPlayerFocus(${player.MemberNumber})">${badge}</span></td>`;

      if (isMe) {
      // if the player is me, don't let me whisper myself
        output += `<td style="padding-left: 5px; padding-right-5px; padding-bottom: 1px; padding-top: 0;"><span style="color:${player.LabelColor || '#000000'};
                    font-family: Arial, sans-serif;
                    text-shadow: 2px 2px 2px rgba(0, 0, 0, 0.7); white-space: nowrap;">
                      ${CharacterNickname(player).normalize("NFKC")}[${player.MemberNumber}]
                  </span>${player_icons}</td>
              </tr>`;
      }
      else {
      // set up whispering
         output += `<td style="padding-left: 5px; padding-right-5px; padding-bottom: 1px; padding-top: 0;"><span style="color:${player.LabelColor || '#000000'}; cursor:pointer;
                    font-family: Arial, sans-serif;
                    text-shadow: 2px 2px 2px rgba(0, 0, 0, 0.7); white-space: nowrap;"
                    onclick="sendWhisper(${player.MemberNumber})"
                    onmouseover="this.style.textDecoration='underline';"
                    onmouseout="this.style.textDecoration='none';">
                      ${CharacterNickname(player).normalize("NFKC")}[${player.MemberNumber}]
                  </span>${player_icons}</td>
              </tr>`;
      }

      return output;
    }

    // determine if player is admin or whitelisted in the room and set their badge icon
    setbadge(player: any) : string {
      let badge = this.printicon("player");
      badge = ChatRoomData.Whitelist.includes(player.MemberNumber) ? this.printicon("vip") : badge;
      badge = ChatRoomData.Admin.includes(player.MemberNumber) ? this.printicon("admin") : badge
      return badge;
    }

    setIcons(player: any) : string {
      let player_icons = "";
      if (Player.OwnerNumber() == player.MemberNumber) {
        // person owns you
        player_icons += this.printicon("owner") + " ";
      }

      else if (Player.IsInFamilyOfMemberNumber(player.MemberNumber)) {
        // if they down't own you but you are in their family, we assume you own them
        if (Player.IsOwnedByPlayer(player.membernumber)) {
          // The person is fully owned if this is true
          player_icons += this.printicon("sub") + " ";
        }
        else {
          // person is on trial
          player_icons += this.printicon("trial") + " "
        }
      }
      if (Player.GetLoversNumbers().includes(player.MemberNumber)) {
        // person is a lover
        player_icons += this.printicon("lover") + " ";
      }
      if (Player.FriendList.includes(player.MemberNumber)) {
        // person is a friend
        player_icons += this.printicon("friend") + " ";
      }
      if (Player.WhiteList.includes(player.MemberNumber)) {
        player_icons += this.printicon("whitelist") + " ";
      }
      if (Player.BlackList.includes(player.MemberNumber)) {
        player_icons += this.printicon("blacklist") + " ";
      }
      if (Player.GhostList.includes(player.MemberNumber)) {
        player_icons += this.printicon("ghost") + " ";
      }
      return player_icons;
    }

    checkIfMe(player: any) : boolean {
      return player.MemberNumber == Player.MemberNumber ? true : false;
    }
}
