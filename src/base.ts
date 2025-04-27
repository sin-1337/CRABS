import bcModSdk, { ModSDKModAPI, ModSDKModInfo } from "bondage-club-mod-sdk";
import "./templates/base.css";
import wrappertemplate from "./templates/wrapper.html";

export default class CRABS {
  declare crabs: ModSDKModAPI;

  // an dictionary containing all the icons that CRABS uses
  protected readonly ICONS: Record<string, string> = {
    // logo
    logo: "CRABS_Logo.png",

    // badges
    admin: "icons/admin.svg",
    vip: "icons/vip.svg",
    player: "icons/player.svg",

    // icons
    you: "icons/you.svg",
    owner: "icons/owner.svg",
    sub: "icons/sub.svg",
    trial: "icons/trial.svg",
    lover: "icons/lover.svg",
    bestfriend: "icons/bestfriend.svg",
    friend: "icons/friends.svg",
    whitelist: "icons/whitelist.svg",
    blacklist: "icons/blacklist.svg",
    ghost: "icons/ghost.svg",
    thought: "icons/thought.svg",

    // globe icon for all BC players
    connected: "icons/connected.svg",

    //map keys
    keyGold: "icons/keyGold.png",
    keySilver: "icons/keySilver.png",
    keyBronze: "icons/keyBronze.png",
    keyNull: "icons/keyNull.svg",
  };

  constructor(CRABS: ModSDKModAPI) {
    this.crabs = CRABS;
  }
  
  /*
   * Takes a member number and opens that player's  "focus" screen.
   * This functions is setup up to be exposed to the global DOM
   *
   * @param MemberNumber - A number for the player in question
   * @return void
   */
  public static showPlayerFocus(MemberNumber: number): void {
    // Check if the person is still in the room
    const PLAYER = ChatRoomCharacter.find(
      (C) => C.MemberNumber == MemberNumber
    );
    if (PLAYER) {
      ChatRoomStatusUpdate("Preference");
      ChatRoomFocusCharacter(PLAYER);
    } else {
      ChatRoomSendLocal("This person is no longer in the room.");
    }
  }

  /*
   * Takes a string target mod name and returns a true if found
   *
   * @param targetmod - string name of the mod
   * @return boolean true if found, false if not
   */
  protected detectMod(targetmod: string): boolean {
    let modlist = bcModSdk.getModsInfo();
    console.log(modlist);
    return modlist.filter((x) => x.name == targetmod).length > 0;
  }

  /*
   * Takes a template name and outputs the filled out template string
   * 
   * @param template_name - Name of the HTML file, no extension or path
   * @param args - A dictionary where the key is a variable name to replace the template
   * @param wrapper -  A boolean that determines if we draw the wrapper or not
   * @return A promise that resolves to the final html string
   */
  protected template(
    template: string,
    args: Record<string, string>,
    wrapper: boolean = true
  ): string {
    let regex: RegExp;

    for (const [key, value] of Object.entries(args)) {
      regex = new RegExp(`{{${key}}}`, "g");
      template = template.replace(regex, value);
    }

    if (wrapper) {
      template = wrappertemplate.replace("{{content}}", template);
    }

    return template;
  }

  /*
   * print the crabs logo
   * @return html string for the logo
   */
  protected printlogo(): string {
    let absolutepath = "https://sin-1337.github.io/CRABS/"; // absolute path of the crabs project
    let html = "";
    html += `<img `;
    html += `alt='CRABS' `;
    html += `src='${absolutepath}${this.ICONS["logo"]}' `;
    html += `height="100px" width="100px"`;
    html += `>`;
    return html;
  }

  /*
   *  print icons
   *
   *  @param key - string name of the icon you want
   *  @param tooltip - string tool top 
   *  @return - string html representing the icon
   */
  protected printicon(key: string, tooltip: string = ""): string {
    let ICON = "./icons/error.svg"; // fall back if the icon isn't found
    if (key in this.ICONS) {  // test if the key exists
      ICON = this.ICONS[key];
    }

    let absolutepath = "https://sin-1337.github.io/CRABS/"; // absolute path of the crabs project
    let html = "";
    if (tooltip != "") html += `<div class='CRABS_tooltip-wrapper'>`; // skip the tool tip if string wasn't set
    html += `<img `;
    html += `alt='${key}' `;
    html += `src='${absolutepath}${ICON}' `;
    html += `class='CRABS_tooltip-image'`;
    html += `>`;
    if (tooltip != "") html += `<div class='CRABS_tooltip'>${tooltip}</div>`;
    if (tooltip != "") html += `</div>`;
    return html;
  }

    /*
     *  TypeScript: Function to convert hex color to rgba and add transparency
     *
     * @param: string hex value of the color
     * @param: number for transparencey, bigger is more opaque. Optional, default 0
     *  Alpha range: The alpha value ranges from -1 to 1:
     *  alpha = 0 means fully opaque (no transparency).
     *  alpha = -1 means fully transparent (completely invisible).
     *
     *  @return: string rgba value with alpha
     */
    protected convertColor(hex: string, alpha: number = 0): string {
        // Remove the hash if it's there
        hex = hex.replace(/^#/, "");

        // Parse the red, green, and blue components
        let red = parseInt(hex.substr(0, 2), 16);
        let green = parseInt(hex.substr(2, 2), 16);
        let blue = parseInt(hex.substr(4, 2), 16);

        // Return the rgba value with alpha transparency
        return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }
}
