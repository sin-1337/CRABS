import CRABS from "../base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import "./templates/roster.css";
import rostertemplate from "./templates/roster.html";
import rostercardstemplate from "./templates/roster_cards.html";

export class Roster extends CRABS {
  private onlineFriends: number | undefined = undefined;
  private lastSentTime: number = 0; // Timestamp for the last ServerSend call

  /*
   * Constructor
   *
   * @param CRABS - (ModSDKModAPI) object containing the modsdkapi
   */
  constructor(CRABS: ModSDKModAPI) {
    super(CRABS);
    this.loadFriendList();
  }

  /*
   * Prints the roster as if the user ran the command
   * Meant to be attached to the DOM
   *
   * @param action - (string) that determines what the roster should print
   */
  public static printRoster(action:string = "all"): void {
    for (const [_, COMMAND] of Commands.entries()) {
      if (COMMAND.Tag === `roster`) {
        COMMAND.Action(action);
        break;
      }
    }
  }

  /*
   * detect overflow in cards and scroll the text
   * 
   * @param containerSelector - string, containing the css container we want to target
   */
  public initScrollingOverflow(
    containerSelector: string = ".CRABS_overflow-wrapper"
  ): void {
    const wrappers = document.querySelectorAll<HTMLElement>(containerSelector);

    wrappers.forEach((wrapper) => {
      const scroller = wrapper.querySelector<HTMLElement>(
        ".CRABS_overflow-scroll"
      );
      if (!scroller) return;

      // Remove previous values
      wrapper.classList.remove("scrolling");
      scroller.style.removeProperty("--scroll-distance");

      // Wait for layout
      requestAnimationFrame(() => {
        const scrollWidth = scroller.scrollWidth;
        const wrapperWidth = wrapper.offsetWidth;

        if (scrollWidth > wrapperWidth) {
          const scrollAmount = scrollWidth - wrapperWidth;
          scroller.style.setProperty("--scroll-distance", `-${scrollAmount}px`);
          wrapper.classList.add("scrolling");
        }
      });
    });
  }

  /*
   * setStatusIcons determines if a player is Deaf, Blind, or Gagged 
   * and sets icons accordingly
   *
   * @param player - PlayerCharater, the player object
   * @return - string list of icons
   */
  private setStatusIcons(player: PlayerCharacter): string {
      const PREFIXES = ["Blind", "Gag", "Deaf"];
      const EFFECTS = CharacterGetEffects(player); 
      const ITEMS = EFFECTS.filter(item => PREFIXES.some(prefix => item.startsWith(prefix)));

        // Initialize icons as empty strings
      let icons: { [key: string]: string } = {
        Blind: "",
        Gag: "",
        Deaf: ""
      };

      const GAGEFFECTLIST: { [key: string]: number } = {
          	"GagVeryLight": 1,
            "GagEasy": 1,
            "GagLight": 1,
            "GagNormal": 2,
            "GagMedium": 2,
            "GagHeavy": 3,
            "GagVeryHeavy": 3,
            "GagTotal": 4,
            "GagTotal2": 4,
            "GagTotal3": 4,
            "GagTotal4": 4,
      }
      const BLINDEFFECTLIST: { [key: string]: number } = {
            "BlindLight": 1, 
            "BlindNormal": 2, 
            "BlindHeavy": 3,
            "BlindTotal": 4,
      }
      const DEAFEFFECTLIST: { [key: string]: number } = {
            "DeafLight": 1,
            "DeafNormal": 2,
            "DeafHeavy": 3,
            "DeafTotal": 4
      }
      let gagValue = 0;
      let blindValue = 0;
      let deafValue =0;

      for (let effect of EFFECTS) {
          const EFFECT_NAME = effect.charAt(0).toLowerCase() + effect.slice(1);
          if (effect in BLINDEFFECTLIST) { 
              if (blindValue < BLINDEFFECTLIST[effect]) { 
                  blindValue = BLINDEFFECTLIST[effect];
                  icons.Blind = this.printicon(EFFECT_NAME, `Blind: ${blindValue}`);
              }
          }
          if (effect in GAGEFFECTLIST) { 
              if (gagValue < GAGEFFECTLIST[effect]) { 
                  gagValue = GAGEFFECTLIST[effect];
                  icons.Gag = this.printicon(EFFECT_NAME, `Gagged: ${gagValue}`);
              }
          }
          if (effect in DEAFEFFECTLIST) { 
              if (deafValue < DEAFEFFECTLIST[effect]) { 
                  deafValue = DEAFEFFECTLIST[effect];
                  icons.Deaf = this.printicon(EFFECT_NAME, `Deaf: ${deafValue}`);
              }
          }
      }
      // If any icon is empty, set default "None" icon
      icons.Blind = icons.Blind || this.printicon("blindNone");
      icons.Gag = icons.Gag || this.printicon("gagNone");
      icons.Deaf = icons.Deaf || this.printicon("deafNone");

      return `${icons.Gag} ${icons.Blind} ${icons.Deaf}`;
  }
  /*
   * builds the cards that get injected into the roster
   *
   * @param player -  PlayerCharacter that we are working with
   * @param badge - string for the badge showing if the player is admin
   * @param player_icons - string for the different icons relevant to the player
   * @return - string containing the output html from the template.
   */
  private buildCard(
    player: PlayerCharacter,
    badge: string,
    player_icons: string
  ): string {
    let templatevars: Record<string, string> = {
      PlayerNumber: `${player.MemberNumber}`,
      Badge: badge,
      LabelColorBorder: `${this.convertColor(player.LabelColor ?? "#FFFFFF", 0.5)}`,
      LabelColor: `${player.LabelColor || "#FFFFFF"}`,
      PlayerName: CharacterNickname(player).normalize("NFKC"),
      PlayerIcons: player_icons,
      StatusIcons: `${this.setStatusIcons(player)}`,
    };

    return this.template(rostercardstemplate, templatevars, false);
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
  private setbadge(player: PlayerCharacter): string {
    let badge = this.printicon("player", "Guest");
    badge = ChatRoomData.Whitelist.includes(player.MemberNumber)
      ? this.printicon("vip", "VIP")
      : badge;
    badge = ChatRoomData.Admin.includes(player.MemberNumber)
      ? this.printicon("admin", "Admin")
      : badge;
    return badge;
  }

  /*
   * Sets the icons relevant to the player
   *
   * @param player - PlayerCharacter object
   * @return - string, html string containing the icons.
   */
  private setIcons(player: PlayerCharacter): string {
    let player_icons = "";
    if (Player.OwnerNumber() == player.MemberNumber) {
      // person owns you
      player_icons += this.printicon("owner", "Your Owner") + " ";
    } else if (Player.IsInFamilyOfMemberNumber(player.MemberNumber ?? -1)) {
      // if they don't own you but you are in their family, we assume you own them
      if (Player.IsOwnedByPlayer(player.MemberNumber ?? -1)) {
        // The person is fully owned if this is true
        player_icons += this.printicon("sub", "Submissive") + " ";
      } else {
        // person is on trial
        player_icons += this.printicon("trial", "Trial") + " ";
      }
    }
    if (Player.GetLoversNumbers().includes(player.MemberNumber ?? -1)) {
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
          // Player is not a best friend, but they are a friend
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
  private checkIfMe(player: PlayerCharacter): boolean {
    return player.MemberNumber == Player.MemberNumber ? true : false;
  }

  /*
   *  prints the roster
   *
   *  @param args - string arguments passed from user
   *  @param wrapper - boolean wrappar, should we draw the wrapper
   *  @returms - string html output
   */
  public buildroster(args: string, wrapper: boolean = true): string {
    const SPLITARGS = args.split(" ");

    let me_output_html = ""; // holds data about user who ran script
    let admin_output_html = ""; // holds admins
    let vip_output_html = ""; // holds whitelisted users
    let player_output_html = ""; // holds normal players
    let player: PlayerCharacter; // the person we found in the room
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

      console.log(`BCTweaks found:  ${this.detectMod("BCTweaks")}`);

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
        me_output_html = this.buildCard(player, badge, player_icons);
      }

      // check if the player is an admin and update the count, also flag the player as admin in the output list.
      if (ChatRoomData.Admin.includes(player.MemberNumber)) {
        admin_count++;
        if (!this.checkIfMe(player)) {
          // if the player is not me, output admin and skip rest of loop
          admin_output_html += this.buildCard(player, badge, player_icons);
          continue;
        }
      } else if (
        ChatRoomData.Whitelist.includes(player.MemberNumber) &&
        !this.checkIfMe(player)
      ) {
        // if the player isn't an admin, is the player is white listed?
        vip_output_html += this.buildCard(player, badge, player_icons);
        continue;
      } else if (!this.checkIfMe(player)) {
        // player is normal, nonadmin, not whitelist, and not me.
        player_output_html += this.buildCard(player, badge, player_icons);
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
      adminIcon: `${this.printicon("admin", "Admins")}`,
      adminsInRoom: `${admin_count}`,
      totalAdmins: `${ChatRoomData.Admin.length}`,
      playerIcon: `${this.printicon("player", "Players")}`,
      playersInRoom: `${ChatRoomCharacter.length}`,
      totalPlayers: `${ChatRoomData.Limit}`,
      friendIcon: `${this.printicon("friend", "Friends")}`,
      friendsOnline: this.onlineFriends?.toString() ?? "...",
      totalFriends: `${Player.FriendNames.size}`,
      connectedIcon: `${this.printicon("connected", "Online Accounts")}`,
      onlinePlayers: `${CurrentOnlinePlayers}`,
    };

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
      templatevars[
        "collectedKeys"
      ] = `<td style="border-right: 0px">${displaykeys}</td>`;
      templatevars["columncount"] = "5"; // if we print keys, set colspan to 5
    } else {
      templatevars["collectedKeys"] = ``;
      templatevars["columncount"] = "4"; // no keys? colspan is 4
    }

    // start the tabble and remove the boarders
    //output_html += `<table style="border: 0px;">`;
    let output_rows: string = "";
    // if the filter var resolves to true, add the respective output.
    output_rows = showme ? output_rows + me_output_html : output_rows;
    output_rows = showadmins ? output_rows + admin_output_html : output_rows;
    output_rows = showvip ? output_rows + vip_output_html : output_rows;
    output_rows = showplayers ? output_rows + player_output_html : output_rows;
    templatevars["playerRows"] = output_rows;

    // run the template and fill it out
    output_html = this.template(rostertemplate, templatevars, wrapper);
    return output_html;
  }
}
