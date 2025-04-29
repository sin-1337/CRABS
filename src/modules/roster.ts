import CRABS from "../base";
import { TemplateValue } from "../base";
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
  public static printRoster(action: string = "all"): void {
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

    // Effect lists mapping
    const EFFECT_LISTS: { [key: string]: { [key: string]: number } } = {
      Blind: {
        BlindLight: 1,
        BlindNormal: 2,
        BlindHeavy: 3,
        BlindTotal: 4,
      },
      Gag: {
        GagVeryLight: 1,
        GagEasy: 1,
        GagLight: 1,
        GagNormal: 2,
        GagMedium: 2,
        GagHeavy: 3,
        GagVeryHeavy: 3,
        GagTotal: 4,
        GagTotal2: 4,
        GagTotal3: 4,
        GagTotal4: 4,
      },
      Deaf: {
        DeafLight: 1,
        DeafNormal: 2,
        DeafHeavy: 3,
        DeafTotal: 4,
      },
    };

    // Initialize icons as empty strings
    let icons: { [key: string]: string } = {
      Blind: "",
      Gag: "",
      Deaf: "",
    };

    // Helper function to determine the maximum value for each prefix and set the corresponding icon
    const updateIcon = (prefix: string, effect: string): void => {
      const effectName = effect.charAt(0).toLowerCase() + effect.slice(1);
      const effectList = EFFECT_LISTS[prefix];

      if (effect in effectList) {
        const effectValue = effectList[effect];
        if (
          effectValue >
          (icons[prefix] ? parseInt(icons[prefix].split(": ")[1]) : 0)
        ) {
          icons[prefix] = this.printicon(
            effectName,
            `${prefix}: ${effectValue}`
          );
        }
      }
    };

    // Process effects
    for (let effect of EFFECTS) {
      for (let prefix of PREFIXES) {
        if (effect.startsWith(prefix)) {
          updateIcon(prefix, effect);
        }
      }
    }

    // Set default icons if no icon was set
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
  ): HTMLElement {
    let templatevars: Record<string, string | TemplateValue> = {
      PlayerNumber: `${player.MemberNumber}`,
      Badge: badge,
      LabelColorBorder: `${this.convertColor(
        player.LabelColor ?? "#FFFFFF",
        0.5
      )}`,
      LabelColor: `${player.LabelColor || "#FFFFFF"}`,
      PlayerName: this.plaintext(CharacterNickname(player).normalize("NFKC")),
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
    let badge = this.printicon("player", "Guest", "CRABS_badge");
    badge = ChatRoomData.Whitelist.includes(player.MemberNumber)
      ? this.printicon("vip", "VIP", "CRABS_badge")
      : badge;
    badge = ChatRoomData.Admin.includes(player.MemberNumber)
      ? this.printicon("admin", "Admin", "CRABS_badge")
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

  /*
   *  prints the roster
   *
   *  @param args - string arguments passed from user
   *  @param wrapper - boolean wrappar, should we draw the wrapper
   *  @returms - string html output
   */
  public buildroster(args: string, wrapper: boolean = true): HTMLElement {
    const ARG_SET = new Set(args.toLowerCase().split(" "));

    let showme = true;
    let showadmins = true;
    let showvip = true;
    let showplayers = true;

    // Set filters based on arguments
    if (ARG_SET.has("count")) {
      showme = showadmins = showvip = showplayers = false;
    } else {
      if (ARG_SET.has("admins")) {
        showme = showvip = showplayers = false;
      }
      if (ARG_SET.has("vips")) {
        showme = showadmins = showplayers = false;
      }
    }

    const ME_OUTPUT_HTML = document.createElement("div");
    const ADMIN_OUTPUT_HTML = document.createElement("div");
    const VIP_OUTPUT_HTML = document.createElement("div");
    const PLAYER_OUTPUT_HTML = document.createElement("div");

    let adminCount = 0;

    for (const PERSON of ChatRoomData.Character) {
      const MEMBER = PERSON.MemberNumber;
      const PLAYER = ChatRoomCharacter.find((c) => c.MemberNumber === MEMBER);
      if (!PLAYER) {
        PLAYER_OUTPUT_HTML.append(
          "❓ <span style='color:#FF0000'>[Unknown Person]</span>\n"
        );
        continue;
      }

      const BADGE = this.setbadge(PLAYER);
      let playerIcons = this.setIcons(PLAYER);

      if (PLAYER.IsPlayer()) {
        playerIcons = this.printicon("you", "You") + " " + playerIcons;
        ME_OUTPUT_HTML.appendChild(this.buildCard(PLAYER, BADGE, playerIcons));
        continue;
      }

      if (ChatRoomData.Admin.includes(MEMBER)) {
        adminCount++;
        ADMIN_OUTPUT_HTML.appendChild(
          this.buildCard(PLAYER, BADGE, playerIcons)
        );
      } else if (ChatRoomData.Whitelist.includes(MEMBER)) {
        VIP_OUTPUT_HTML.appendChild(this.buildCard(PLAYER, BADGE, playerIcons));
      } else {
        PLAYER_OUTPUT_HTML.appendChild(
          this.buildCard(PLAYER, BADGE, playerIcons)
        );
      }
    }

    const TEMPLATE_VARS: Record<string, string> = {
      adminIcon: this.printicon("admin", "Admins", "CRABS_header_icons"),
      adminsInRoom: `${adminCount}`,
      totalAdmins: `${ChatRoomData.Admin.length}`,
      playerIcon: this.printicon("player", "Players", "CRABS_header_icons"),
      playersInRoom: `${ChatRoomCharacter.length}`,
      totalPlayers: `${ChatRoomData.Limit}`,
      friendIcon: this.printicon("friend", "Friends", "CRABS_header_icons"),
      friendsOnline: this.onlineFriends?.toString() ?? "...",
      totalFriends: `${Player.FriendNames.size}`,
      connectedIcon: this.printicon(
        "connected",
        "Online Accounts",
        "CRABS_header_icons"
      ),
      onlinePlayers: `${CurrentOnlinePlayers}`,
    };

    if (ChatRoomMapViewIsActive()) {
      const KEYS = {
        keyBronze: Player.MapData.PrivateState.HasKeyBronze,
        keySilver: Player.MapData.PrivateState.HasKeySilver,
        keyGold: Player.MapData.PrivateState.HasKeyGold,
      };

      let displayKeys = "";
      for (const [KEY, HAS_KEY] of Object.entries(KEYS)) {
        displayKeys += this.printicon(HAS_KEY ? KEY : "keyNull");
      }

      TEMPLATE_VARS["online_player_border"] = "2px";
      TEMPLATE_VARS[
        "collectedKeys"
      ] = `<td style="border-right: 0px">${displayKeys}</td>`;
      TEMPLATE_VARS["columncount"] = "5";
    } else {
      TEMPLATE_VARS["online_player_border"] = "0px";
      TEMPLATE_VARS["collectedKeys"] = "";
      TEMPLATE_VARS["columncount"] = "4";
    }

    const COMBINED_ROWS = [
      showme ? ME_OUTPUT_HTML.outerHTML : "",
      showadmins ? ADMIN_OUTPUT_HTML.outerHTML : "",
      showvip ? VIP_OUTPUT_HTML.outerHTML : "",
      showplayers ? PLAYER_OUTPUT_HTML.outerHTML : "",
    ].join("");

    TEMPLATE_VARS["playerRows"] = COMBINED_ROWS;

    return this.template(rostertemplate, TEMPLATE_VARS, wrapper);
  }
}
