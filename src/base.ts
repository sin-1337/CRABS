import bcModSdk, { ModSDKModAPI, ModSDKModInfo } from "bondage-club-mod-sdk";
import "./templates/base.css";
import wrappertemplate from "./templates/wrapper.html";

export default class CRABS {
  declare crabs: ModSDKModAPI;

  // an dictionary containing all the icons that CRABS uses
  protected readonly ICONS: Record<string, string> = {
    // logo
    logo: "https://sin-1337.github.io/CRABS/CRABS_Logo.png",

    // error icon
    error: "https://sin-1337.github.io/CRABS/error.svg",

    // badges
    admin: "https://sin-1337.github.io/CRABS/icons/admin.svg",
    vip: "https://sin-1337.github.io/CRABS/icons/vip.svg",
    player: "https://sin-1337.github.io/CRABS/icons/player.svg",

    // icons
    you: "https://sin-1337.github.io/CRABS/icons/you.svg",
    owner: "https://sin-1337.github.io/CRABS/icons/owner.svg",
    sub: "https://sin-1337.github.io/CRABS/icons/sub.svg",
    trial: "https://sin-1337.github.io/CRABS/icons/trial.svg",
    lover: "https://sin-1337.github.io/CRABS/icons/lover.svg",
    bestfriend: "https://sin-1337.github.io/CRABS/icons/bestfriend.svg",
    friend: "https://sin-1337.github.io/CRABS/icons/friends.svg",
    whitelist: "https://sin-1337.github.io/CRABS/icons/whitelist.svg",
    blacklist: "https://sin-1337.github.io/CRABS/icons/blacklist.svg",
    ghost: "https://sin-1337.github.io/CRABS/icons/ghost.svg",
    thought: "https://sin-1337.github.io/CRABS/icons/thought.svg",

    // globe icon for all BC players
    connected: "https://sin-1337.github.io/CRABS/icons/connected.svg",

    //map keys
    keyGold: "https://sin-1337.github.io/CRABS/icons/keyGold.png",
    keySilver: "https://sin-1337.github.io/CRABS/icons/keySilver.png",
    keyBronze: "https://sin-1337.github.io/CRABS/icons/keyBronze.png",
    keyNull: "https://sin-1337.github.io/CRABS/icons/keyNull.svg",

    //BC Icons:
    blindNone: "https://sin-1337.github.io/CRABS/icons/blindNone.svg",
    blindLight: "https://www.bondageprojects.elementfx.com/R115/BondageClub/Icons/Previews/BlindLight.png",
    blindNormal: "https://www.bondageprojects.elementfx.com/R115/BondageClub/Icons/Previews/BlindNormal.png",
    blindHeavy: "https://www.bondageprojects.elementfx.com/R115/BondageClub/Icons/Previews/BlindHeavy.png",
    blindTotal: "https://www.bondageprojects.elementfx.com/R115/BondageClub/Icons/Previews/BlindHeavy.png",


    deafNone: "https://sin-1337.github.io/CRABS/icons/deafNone.svg",
    deafLight: "https://www.bondageprojects.elementfx.com/R115/BondageClub/Icons/Previews/DeafLight.png",
    deafNormal: "https://www.bondageprojects.elementfx.com/R115/BondageClub/Icons/Previews/DeafNormal.png",
    deafHeavy: "https://www.bondageprojects.elementfx.com/R115/BondageClub/Icons/Previews/DeafHeavy.png",
    deafTotal: "https://www.bondageprojects.elementfx.com/R115/BondageClub/Icons/Previews/DeafHeavy.png",


    gagNone: "https://sin-1337.github.io/CRABS/icons/gagNone.svg",
    gagVeryLight: "https://www.bondageprojects.elementfx.com/R115/BondageClub/Icons/Previews/GagLight.png",
    gagEasy: "https://www.bondageprojects.elementfx.com/R115/BondageClub/Icons/Previews/GagLight.png",
    gagLight: "https://www.bondageprojects.elementfx.com/R115/BondageClub/Icons/Previews/GagLight.png",
    gagNormal: "https://www.bondageprojects.elementfx.com/R115/BondageClub/Icons/Previews/GagNormal.png",
    gagMedium: "https://www.bondageprojects.elementfx.com/R115/BondageClub/Icons/Previews/GagNormal.png",
    gagHeavy: "https://www.bondageprojects.elementfx.com/R115/BondageClub/Icons/Previews/GagHeavy.png",
    gagVeryHeavy: "https://www.bondageprojects.elementfx.com/R115/BondageClub/Icons/Previews/GagHeavy.png",
    gagTotal: "https://www.bondageprojects.elementfx.com/R115/BondageClub/Icons/Previews/GagTotal.png",
    gagTotal2: "https://www.bondageprojects.elementfx.com/R115/BondageClub/Icons/Previews/GagTotal.png",
    gagTotal3: "https://www.bondageprojects.elementfx.com/R115/BondageClub/Icons/Previews/GagTotal.png",
    gagTotal4: "https://www.bondageprojects.elementfx.com/R115/BondageClub/Icons/Previews/GagTotal.png",

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
    let html = "";
    html += `<img `;
    html += `alt='CRABS' `;
    html += `src='${this.ICONS["logo"]}' `;
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
    let ICON = this.ICONS["error"]; // fall back if the icon isn't found
    if (key in this.ICONS) {  // test if the key exists
      ICON = this.ICONS[key];
    }

    let html = "";
    if (tooltip != "") html += `<div class='CRABS_tooltip-wrapper'>`; // skip the tool tip if string wasn't set
    html += `<img `;
    html += `alt='${key}' `;
    html += `src='${ICON}' `;
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
