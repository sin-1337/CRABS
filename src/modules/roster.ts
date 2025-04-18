import CRABS from "../base";
import WhisperPlus from "./whisperplus";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import "./templates/roster.css";
import rostertemplate from "./templates/roster.html";
window.sendWhisper = WhisperPlus.sendWhisper;

export default class Roster extends CRABS {
  private onlineFriends: number | undefined = undefined;
  private lastSentTime: number = 0; // Timestamp for the last ServerSend call

  constructor(CRABS: ModSDKModAPI) {
    super(CRABS);
    this.loadFriendList();
    // expose showPlayerFocus to the DOM
    window.PlayerFocus = Roster.showPlayerFocus;
  }

  // formats the data for outputting
  private formatoutput(
    player: any,
    badge: string,
    player_icons: string
  ): string {
    let output = `<tr>
                <td style="padding-left: 15px; padding-right-5px; padding-bottom: 1px; padding-top: 0;"><span style="cursor:pointer;" onclick="PlayerFocus(${player.MemberNumber})">${badge}</span></td>`;

    // set up whispering
    output += `<td style="padding-left: 5px; padding-right-5px; padding-bottom: 1px; padding-top: 0; text-align: left;"><span style="color:${
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
    let badge = this.printicon("player", "Guest");
    badge = ChatRoomData.Whitelist.includes(player.MemberNumber)
      ? this.printicon("vip", "VIP")
      : badge;
    badge = ChatRoomData.Admin.includes(player.MemberNumber)
      ? this.printicon("admin", "Admin")
      : badge;
    return badge;
  }

  private setIcons(player: any): string {
    let player_icons = "";
    if (Player.OwnerNumber() == player.MemberNumber) {
      // person owns you
      player_icons += this.printicon("owner", "Your Owner") + " ";
    } else if (Player.IsInFamilyOfMemberNumber(player.MemberNumber)) {
      // if they don't own you but you are in their family, we assume you own them
      if (Player.IsOwnedByPlayer(player.membernumber)) {
        // The person is fully owned if this is true
        player_icons += this.printicon("sub", "Submissive") + " ";
      } else {
        // person is on trial
        player_icons += this.printicon("trial", "Trial") + " ";
      }
    }
    if (Player.GetLoversNumbers().includes(player.MemberNumber)) {
      // person is a lover
      player_icons += this.printicon("lover", "Lover") + " ";
    } else {
      if (this.detectMod("BCTweaks")) {
        // BCTweaks mod is found
        if (
          Player.BCT.bctSettings.bestFriendsList.includes(player.MemberNumber)
        ) {
          //Player is a best friend, skip checking if they are a friend.
          player_icons += this.printicon("bestfriend", "Best Friend") + " ";
        } else if (Player.FriendList.includes(player.MemberNumber)) {
          // Player is not a best friend, but they are a freind
          player_icons += this.printicon("friend", "Friend") + " ";
        }
      } else if (Player.FriendList.includes(player.MemberNumber)) {
        // person is a friend, and the BCTweaks mod is not found
        player_icons += this.printicon("friend", "Friend") + " ";
      }
    }
    if (Player.WhiteList.includes(player.MemberNumber)) {
      // Player is whitelisted
      player_icons += this.printicon("whitelist", "Whitelist") + " ";
    } else if (Player.BlackList.includes(player.MemberNumber)) {
      // Player is blacklisted
      player_icons += this.printicon("blacklist", "Blacklist") + " ";
    }
    if (Player.GhostList.includes(player.MemberNumber)) {
      // Player is ghosted
      player_icons += this.printicon("ghost", "Ghosted") + " ";
    }
    return player_icons;
  }

  // Check if you and target player are the same
  private checkIfMe(player: any): boolean {
    return player.MemberNumber == Player.MemberNumber ? true : false;
  }

  /*
   *  prints the roster
   *
   *  @param - string arguments passed from user
   *  @param - boolean wrappar, should we draw the wrapper
   *  @returms - string html output
   */
  public buildroster(args: string, wrapper: boolean = true): string {
    const SPLITARGS = args.split(" ");

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
    let templatevars: Record<string, string>;
    let output_html: string = "";

    //get a list of players
    for (let person in ChatRoomData.Character) {
      // find member number for current player in list
      MemberNumber = ChatRoomData.Character[person].MemberNumber;

      console.log(`BCTweaks found:  ${this.detectMod("BCTweaks")}`)

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
        player_icons = this.printicon("you", "You") + " " + player_icons;

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
    templatevars = {
        "adminIcon": `${this.printicon("admin", "Admins")}`,
        "adminsInRoom": `${admin_count}`,
        "totalAdmins": `${ChatRoomData.Admin.length}`,
        "playerIcon": `${this.printicon("player", "Players")}`,
        "playersInRoom": `${ChatRoomCharacter.length}`,
        "totalPlayers": `${ChatRoomData.Limit}`,
        "friendIcon": `${this.printicon("friend", "Friends")}`,
        "friendsOnline": this.onlineFriends?.toString() ?? "...",
        "totalFriends": `${Player.FriendNames.size}`,
        "connectedIcon": `${this.printicon("connected", "Online Accounts")}`,
        "onlinePlayers": `${CurrentOnlinePlayers}`,
    }

    // are we on a map?
    if (ChatRoomMapViewIsActive()) {
      let displaykeys = ""; // determines how to show keys (css) in the roster

      // build a dictionary of the keys
      let keys = {
        keyBronze: Player.MapData.PrivateState.HasKeyBronze,
        keySilver: Player.MapData.PrivateState.HasKeySilver,
        keyGold: Player.MapData.PrivateState.HasKeyGold,
      };

      // loop the dictionary and extract the key and name
      for (const [KEY, VALUE] of Object.entries(keys)) {
        
        // if key is found, set icon and tool tip
        if (VALUE) {
          displaykeys += this.printicon(KEY);
        } else {  
          displaykeys += this.printicon("keyNull");
        }
      }

      // replace the template objects for the values we determined above.
        templatevars["collectedKeys"] = `<td>${displaykeys}</td>`
        templatevars["columncount"] = "5"; // if we print keys, set colspan to 5
    } else {
        templatevars["collectedKeys"] = ``;
        templatevars["columncount"] = "4"; // no keys? colspan is 4
    }
   
    // start the tabble and remove the boarders
    //output_html += `<table style="border: 0px;">`;
    let output_rows: string = ""
    // if the filter var resolves to true, add the respective output.
    output_rows = showme ? output_rows + me_output_html : output_rows;
    output_rows = showadmins ? output_rows + admin_output_html : output_rows;
    output_rows = showvip ? output_rows + vip_output_html : output_rows;
    output_rows = showplayers ? output_rows + player_output_html : output_rows;
    templatevars["playerRows"] = output_rows; 

    // run the template and fill it out
    output_html = this.template(rostertemplate, templatevars, wrapper);
    return(output_html);
  }
}
