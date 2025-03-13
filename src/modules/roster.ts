import WhisperPlus from "./whisperplus";
window.sendWhisper = WhisperPlus.sendWhisper;

export default class Roster {
    const ICONS: Record<string, string> = {
        "admin" : "icons/admin.svg",
        "vip" : "icons/vip.svg",
        "player" : "icons/player.svg",
        "you" : "icons/you.svg",
        "owner" : "icons/owner.svg",
        "sub" : "icons/sub.svg",
        "trial" : "icons/trial.svg",
        "lover" : "icons/lover.svg",
        "friend" : "icons/friends.svg",
        "whitelist" : "icons/whitelist.svg",
        "blacklist" : "icons/blacklist.svg",
        "ghost" : "icons/ghost.svg"
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
            ${this.printicon("admin")} = Person is Admin</br>
            ${this.printicon("vip")} = Person is whitelisted in the room </br>
            ${this.printicon("player")} = Person is a normal user </br>

            </br>
            Icons:
            <hr>
            ${this.printicon("you")} = Person is you </br>
            ${this.printicon("owner")} = Person is your owner </br>
            ${this.printicon("sub")} = Person is your submissive </br>
            ${this.printicon("trial")} = Person is on trial with you </br>
            ${this.printicon("lover")} = Person is your lover </br>
            ${this.printicon("friend")} = Person is a friend </br>
            ${this.printicon("whitelist")} = You have this person whitelisted </br>
            ${this.printicon("blacklist")} = You have this person blacklisted </br>
            ${this.printicon("ghost")} = You have ghosted this person </br>

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
        output += `<td style="height:24px; padding-left: 5px; padding-right-5px; padding-bottom: 1px; padding-top: 0;"><span style="color:${player.LabelColor || '#000000'};
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

    displayroster(args: any): void {
        const SPLITARGS = args.split(" ");
        if (SPLITARGS[0].toLowerCase() == "help") {
            ChatRoomSendLocal(this.showhelp());
            return;
        }

        let me_output_html = ""; // holds data about user who ran script
        let admin_output_html = ""; // holds admins
        let vip_output_html = ""; // holds whitelisted users
        let player_output_html = ""; // holds normal players
        let player; // the person we found in the room
        let admin_count = 0; // number of admins in the room
        let badge = ""; // holds the admin icon if the player is an admin
        let player_icons = ""; // holds the list of player/status icons (string)
        let MemberNumber: number;
        // filter variables, show or not show certain output
        let showme = true; // person who ran the script (you)
        let showadmins = true; // room admins
        let showvip = true; // room whitelists
        let showplayers = true; // normal players


        //get a list of players
        for (let person in ChatRoomData.Character) {
            // find membernumber for current player in list
            MemberNumber = ChatRoomData.Character[person].MemberNumber;

            // Find player
            player = ChatRoomCharacter.find((C) => C.MemberNumber == MemberNumber);

            //bail out and return placeholder if player is not available.
            if (!player) {
                player_output_html +=
                    "❓ <span style='color:#FF0000'>[Unknown Person]</span>\n";
                continue;
            }

            // check if the player is also an admin or vip and add icon with admin given priority
            badge = this.setbadge(player);
            player_icons = this.setIcons(player);

            // if the player is me (person who ran the script)
            if (this.checkIfMe(player)) {
                // mark me with a star icon
                player_icons = this.printicon("you") + " " + player_icons;

                // format my outpupt and store
                me_output_html = this.formatoutput(player, badge, player_icons, true);
            }

            // check if the player is an admin and update the count, also flad the player as admin in the output list.
            if (ChatRoomData.Admin.includes(player.MemberNumber)) {
                admin_count++;
                if (!this.checkIfMe(player, Player)) {
                    // if the player is not me, output admin and skip rest of loop
                    admin_output_html += this.formatoutput(
                        player,
                        badge,
                        player_icons,
                        false
                    );
                    continue;
                }
            } else if (
                ChatRoomData.Whitelist.includes(player.MemberNumber) &&
                !this.checkIfMe(player, Player)
            ) {
                // if the player isn't an admin, is the player is whitelested?
                vip_output_html += this.formatoutput(player, badge, player_icons, false);
                continue;
            } else if (!this.checkIfMe(player)) {
                // player is normal, nonadmin, not whitelist, and not me.
                player_output_html += this.formatoutput(
                    player,
                    badge,
                    player_icons,
                    false
                );
            }
        }

        // if argument is "count", set filter vars and skip loop
        if (SPLITARGS.some((item) => item.toLowerCase() === "count")) {
            console.log("count only");
            showme = false;
            showadmins = false;
            showvip = false;
            showplayers = false;
        }

        // if argument is admins, set filter vars to only show admins and continue
        if (SPLITARGS.some((item) => item.toLowerCase() === "admins")) {
            console.log("admins only");
            showme = false;
            showvip = false;
            showplayers = false;
        }

        // if argument is vips, set filter vars to only show vips (whitelisted) and continue
        if (SPLITARGS.some((item) => item.toLowerCase() === "vips")) {
            console.log("vips only");
            showme = false;
            showadmins = false;
            showplayers = false;
        }

        //output total number of players/admins
        //TODO: include this in the table space and add a header
        ChatRoomSendLocal(
            "<div>There are " +
              admin_count +
              "/" +
              ChatRoomData.Admin.length +
              " admins in the room.</div>"
        );
        ChatRoomSendLocal(
            "There are " +
              ChatRoomCharacter.length +
              "/" +
              ChatRoomData.Limit +
              " total players in the room.</div>"
        );
        let output_html = "";

        // start the tabble and remove the boarders
        output_html += `<table style="border: 0px;">`;

        // if the filter var resolves to true, add the respective output.
        output_html = showme ? output_html + me_output_html : output_html;
        output_html = showadmins ? output_html + admin_output_html : output_html;
        output_html = showvip ? output_html + vip_output_html : output_html;
        output_html = showplayers
            ? output_html + player_output_html
            : output_html;

        // finish the table
        output_html += `</table>`;

        // show the final output
        ChatRoomSendLocal(output_html);
    }
}
