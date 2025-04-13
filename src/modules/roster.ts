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
  public displayroster(args: any): void {
    const SPLITARGS = args.split(" ");
    if (SPLITARGS[0].toLowerCase() == "help") {
      ChatRoomSendLocal(this.showhelp());
      return;
    }

    let meRow = "";
    const adminRows: string[] = [];
    const vipRows: string[] = [];
    const playerRows: string[] = [];

    let admin_count = 0;

    for (const player of ChatRoomData.Character) {
      const MemberNumber = player.MemberNumber;
      const found = ChatRoomCharacter.find(
        (c: any) => c.MemberNumber === MemberNumber
      );
      if (!found) continue;

      const badge = this.setbadge(found);
      let icons = this.setIcons(found);

      if (this.checkIfMe(found)) {
        icons = this.printicon("you") + " " + icons;
        meRow = this.formatoutput(found, badge, icons);
        continue;
      }

      if (ChatRoomData.Admin.includes(MemberNumber)) {
        admin_count++;
        adminRows.push(this.formatoutput(found, badge, icons));
      } else if (ChatRoomData.Whitelist.includes(MemberNumber)) {
        vipRows.push(this.formatoutput(found, badge, icons));
      } else {
        playerRows.push(this.formatoutput(found, badge, icons));
      }
    }

    // Handle argument filters
    let showme = true,
      showadmins = true,
      showvip = true,
      showplayers = true;

    if (SPLITARGS.some((arg) => arg.toLowerCase() === "count")) {
      showme = showadmins = showvip = showplayers = false;
    } else if (SPLITARGS.includes("admins")) {
      showme = showvip = showplayers = false;
    } else if (SPLITARGS.includes("vips")) {
      showme = showadmins = showplayers = false;
    }

    // 🧮 Fill in meta counts
    const metaHTML = `
    <div>There are ${admin_count}/${
      ChatRoomData.Admin.length
    } admins in the room.</div>
    <div>There are ${ChatRoomCharacter.length}/${
      ChatRoomData.Limit
    } total players in the room.</div>
    <div>You have ${this.onlineFriends ?? "..."} / ${
      Player.FriendNames.size
    } friends online.</div>
    <div>There are ${CurrentOnlinePlayers} online players</div>
  `;
    ChatRoomSendLocal(metaHTML);

    // 🎯 Assemble user row HTML
    const allRows: string[] = [];
    if (showme && meRow) allRows.push(meRow);
    if (showadmins) allRows.push(...adminRows);
    if (showvip) allRows.push(...vipRows);
    if (showplayers) allRows.push(...playerRows);

    const leftRows: string[] = [];
    const rightRows: string[] = [];

    allRows.forEach((row, i) => {
      (i % 2 === 0 ? leftRows : rightRows).push(row);
    });

    const leftBody = document.getElementById("CRABS_leftUserBody");
    const rightBody = document.getElementById("CRABS_rightUserBody");
    const userTableContainer = document.getElementById(
      "CRABS_userTablesContainer"
    );
    const rightContainer = document.getElementById(
      "CRABS_rightUserTableContainer"
    );
    const playersHeader = document.querySelector(
      ".CRABS_players-header"
    ) as HTMLElement;

    // 🧼 Clear previous content
    if (leftBody) leftBody.innerHTML = "";
    if (rightBody) rightBody.innerHTML = "";

    // 🚀 Populate tables
    if (leftRows.length || rightRows.length) {
      if (leftBody) leftBody.innerHTML = leftRows.join("\n");
      if (rightRows.length && rightBody) {
        rightBody.innerHTML = rightRows.join("\n");
        if (rightContainer) rightContainer.style.display = "block";
      }

      // Show the players section
      if (userTableContainer) userTableContainer.style.display = "flex";
      if (playersHeader) playersHeader.style.display = "block";
    } else {
      // Hide if no data
      if (userTableContainer) userTableContainer.style.display = "none";
      if (playersHeader) playersHeader.style.display = "none";
    }
  }
}
