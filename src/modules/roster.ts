import WhisperPlus from "./whisperplus";
import CRABS from "../base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
window.sendWhisper = WhisperPlus.sendWhisper;

export default class Roster extends CRABS {
  private onlineFriends: number | undefined = undefined;
  private lastSentTime: number = 0; // Timestamp for the last ServerSend call

  constructor(icon_height: number, icon_width: number, CRABS: ModSDKModAPI) {
    super(icon_height, icon_width, CRABS);
    this.loadFriendList();
    // expose showPlayerFocus to the DOM
    window.PlayerFocus = Roster.showPlayerFocus;
  }

  // show help
  private showhelp(): string {
    let output = `<table style="width: 100%"><tr><td>
            <span style=" text-shadow: 0px 0px 3px #000000; white-space: normal;">
            <hr>
            CRABS help sheet</br>
            /roster</br>
            This command lists the number of admins and players
            in a room and gives you some informatoin about them </br>
            
            /players is deprecated, but still works currently.

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
            ${this.printicon("lover")} = Person is your lover </br>`;

    //prints only if the BCTweaks module is detected.
    if (this.detectMod("BCTweaks")) {
      output += `${this.printicon(
        "bestfriend"
      )} = Person is a best friend </br>`;
    }

    output += `${this.printicon("friend")} = Person is a friend </br>
            ${this.printicon(
              "whitelist"
            )} = You have this person whitelisted </br>
            ${this.printicon(
              "blacklist"
            )} = You have this person blacklisted </br>
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
    return output;
  }

  // formats the data for outputting
  private formatoutput(
    player: any,
    badge: string,
    player_icons: string
  ): string {
    let output = `<tr>
                <td style="padding-left: 5px; padding-right-5px; padding-bottom: 1px; padding-top: 0;"><span style="cursor:pointer;" onclick="PlayerFocus(${player.MemberNumber})">${badge}</span></td>`;

    // set up whispering
    output += `<td style="padding-left: 5px; padding-right-5px; padding-bottom: 1px; padding-top: 0;"><span style="color:${
      player.LabelColor || "#000000"
    }; cursor:pointer;
                font-family: Arial, sans-serif;
                text-shadow: 2px 2px 2px rgba(0, 0, 0, 0.7); white-space: nowrap;"
                onclick="sendWhisper(${player.MemberNumber})"
                onmouseover="this.style.textDecoration='underline';"
                onmouseout="this.style.textDecoration='none';">
                  ${CharacterNickname(player).normalize("NFKC")}[${
      player.MemberNumber
    }]
              </span>${player_icons}</td>
          </tr>`;

    return output;
  }

  //query the server for friendslist
  private loadFriendList(): void {
    this.crabs.hookFunction("FriendListLoadFriendList", 0, (args, next) => {
      const [DATA]: Array<Record<string, any>> = args;
      this.onlineFriends = DATA.length;
      this.lastSentTime = Date.now();
      // console.log(`Number of online friends: ${this.onlineFriends}`);
      return next(args);
    });
  }

  // Debounce function to control the timing of ServerSend
  private canSendServerRequest(): boolean {
    const now = Date.now();
    if (now - this.lastSentTime >= 10 * 60 * 1000) {
      // 10 minutes in milliseconds
      this.lastSentTime = now; // Update the lastSentTime to the current time
      return true;
    }
    return false;
  }

  // Function to get the online friend count
  public async getOnlineFriendCount(): Promise<number> {
    // Check if it's okay to send the server request
    if (this.canSendServerRequest()) {
      // Send server request if it's been more than 2 minutes
      await ServerSend("AccountQuery", { Query: "OnlineFriends" });
    }

    // Wait for the hook function to finish (assuming `next` ensures it completes)
    return new Promise<number>((resolve) => {
      const CHECKONLINEFRIENDS = () => {
        if (this.onlineFriends !== undefined) {
          resolve(this.onlineFriends); // Return the online friends count
        } else {
          setTimeout(CHECKONLINEFRIENDS, 100); // Check again after 100ms
        }
      };

      CHECKONLINEFRIENDS(); // Start the checking process
    });
  }

  // determine if player is admin or whitelisted in the room and set their badge icon
  private setbadge(player: any): string {
    let badge = this.printicon("player");
    badge = ChatRoomData.Whitelist.includes(player.MemberNumber)
      ? this.printicon("vip")
      : badge;
    badge = ChatRoomData.Admin.includes(player.MemberNumber)
      ? this.printicon("admin")
      : badge;
    return badge;
  }

  private setIcons(player: any): string {
    let player_icons = "";
    if (Player.OwnerNumber() == player.MemberNumber) {
      // person owns you
      player_icons += this.printicon("owner") + " ";
    } else if (Player.IsInFamilyOfMemberNumber(player.MemberNumber)) {
      // if they don't own you but you are in their family, we assume you own them
      if (Player.IsOwnedByPlayer(player.membernumber)) {
        // The person is fully owned if this is true
        player_icons += this.printicon("sub") + " ";
      } else {
        // person is on trial
        player_icons += this.printicon("trial") + " ";
      }
    }
    if (Player.GetLoversNumbers().includes(player.MemberNumber)) {
      // person is a lover
      player_icons += this.printicon("lover") + " ";
    } else {
      if (this.detectMod("BCTweaks")) {
        // BCTweaks mod is found
        if (
          Player.BCT.bctSettings.bestFriendsList.includes(player.MemberNumber)
        ) {
          //Player is a best friend, skip checking if they are a friend.
          player_icons += this.printicon("bestfriend") + " ";
        } else if (Player.FriendList.includes(player.MemberNumber)) {
          // Player is not a best friend, but they are a freind
          player_icons += this.printicon("friend") + " ";
        }
      } else if (Player.FriendList.includes(player.MemberNumber)) {
        // person is a friend, and the BCTweaks mod is not found
        player_icons += this.printicon("friend") + " ";
      }
    }
    if (Player.WhiteList.includes(player.MemberNumber)) {
      // Player is whitelisted
      player_icons += this.printicon("whitelist") + " ";
    } else if (Player.BlackList.includes(player.MemberNumber)) {
      // Player is blacklisted
      player_icons += this.printicon("blacklist") + " ";
    }
    if (Player.GhostList.includes(player.MemberNumber)) {
      // Player is ghosted
      player_icons += this.printicon("ghost") + " ";
    }
    return player_icons;
  }

  // Check if you and target player are the same
  private checkIfMe(player: any): boolean {
    return player.MemberNumber == Player.MemberNumber ? true : false;
  }

  // prints the roster
  public displayroster(args: any): void {
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
      // find member number for current player in list
      MemberNumber = ChatRoomData.Character[person].MemberNumber;

      // Find player
      player = ChatRoomCharacter.find(
        (C: any) => C.MemberNumber == MemberNumber
      );

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

        // format my output and store
        me_output_html = this.formatoutput(player, badge, player_icons);
      }

      // check if the player is an admin and update the count, also flag the player as admin in the output list.
      if (ChatRoomData.Admin.includes(player.MemberNumber)) {
        admin_count++;
        if (!this.checkIfMe(player)) {
          // if the player is not me, output admin and skip rest of loop
          admin_output_html += this.formatoutput(player, badge, player_icons);
          continue;
        }
      } else if (
        ChatRoomData.Whitelist.includes(player.MemberNumber) &&
        !this.checkIfMe(player)
      ) {
        // if the player isn't an admin, is the player is white listed?
        vip_output_html += this.formatoutput(player, badge, player_icons);
        continue;
      } else if (!this.checkIfMe(player)) {
        // player is normal, nonadmin, not whitelist, and not me.
        player_output_html += this.formatoutput(player, badge, player_icons);
      }
    }

    // if argument is "count", set filter vars and skip loop
    if (SPLITARGS.some((item: any) => item.toLowerCase() === "count")) {
      showme = false;
      showadmins = false;
      showvip = false;
      showplayers = false;
    }

    // if argument is admins, set filter vars to only show admins and continue
    if (SPLITARGS.some((item: any) => item.toLowerCase() === "admins")) {
      showme = false;
      showvip = false;
      showplayers = false;
    }

    // if argument is vips, set filter vars to only show vips (white listed) and continue
    if (SPLITARGS.some((item: any) => item.toLowerCase() === "vips")) {
      showme = false;
      showadmins = false;
      showplayers = false;
    }

    //output total number of players/admins
    ChatRoomSendLocal(
      `<div>There are ${admin_count}/${ChatRoomData.Admin.length} admins in the room.`
    );
    ChatRoomSendLocal(
      `There are ${ChatRoomCharacter.length}/${ChatRoomData.Limit} total players in the room.`
    );
    if (this.onlineFriends !== undefined) {
      ChatRoomSendLocal(
        `You have ${this.onlineFriends}/${Player.FriendNames.size} friends online.`
      );
    } else {
      ChatRoomSendLocal(
        `You have .../${Player.FriendNames.size} friends online. <- Polling ...`
      );
    }
    ChatRoomSendLocal(`There are ${CurrentOnlinePlayers} online players</div>`);
    let output_html = "";

    // start the tabble and remove the boarders
    output_html += `<table style="border: 0px;">`;

    // if the filter var resolves to true, add the respective output.
    output_html = showme ? output_html + me_output_html : output_html;
    output_html = showadmins ? output_html + admin_output_html : output_html;
    output_html = showvip ? output_html + vip_output_html : output_html;
    output_html = showplayers ? output_html + player_output_html : output_html;

    // finish the table
    output_html += `</table>`;

    // show the final output
    ChatRoomSendLocal(output_html);
  }
}
