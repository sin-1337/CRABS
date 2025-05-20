import bcModSdk, { ModSDKModAPI, ModSDKModInfo } from "bondage-club-mod-sdk";
import DOMPurify from "dompurify";
import "./templates/base.css";
import wrappertemplate from "./templates/wrapper.html";

export default class CRABS {
  declare crabs: ModSDKModAPI;

  // an dictionary containing all the icons that CRABS uses
  protected readonly IMAGES: Record<string, string> = {
    // logo
    logo: "CRABS_Logo.png",

    // error icon
    error: "error.svg",

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
    keyNull: "keyNull.svg",

    //BC Icons:
    blindNone: "blindNone.svg",
    blindLight: "BlindLight.png",
    blindNormal: "BlindNormal.png",
    blindHeavy: "BlindHeavy.png",
    blindTotal: "BlindHeavy.png",

    deafNone: "deafNone.svg",
    deafLight: "DeafLight.png",
    deafNormal: "DeafNormal.png",
    deafHeavy: "DeafHeavy.png",
    deafTotal: "DeafHeavy.png",

    gagNone: "gagNone.svg",
    gagVeryLight: "GagLight.png",
    gagEasy: "GagLight.png",
    gagLight: "GagLight.png",
    gagNormal: "GagNormal.png",
    gagMedium: "GagNormal.png",
    gagHeavy: "GagHeavy.png",
    gagVeryHeavy: "GagHeavy.png",
    gagTotal: "GagTotal.png",
    gagTotal2: "GagTotal.png",
    gagTotal3: "GagTotal.png",
    gagTotal4: "GagTotal.png",
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
   * Prints HTMLElement objects into the DOM (Chat Window)
   * and scroll to bottom of chat window
   *
   * @param output: (HTMLElement) object to print
   */
  public sendoutput(output: string, elementId?: string): void {
    const OUTPUT = document.createElement("template");

    const CLEAN_HTML = DOMPurify.sanitize(output, {
      USE_PROFILES: { html: true }, // Allow full HTML (but safe)
    });

    OUTPUT.innerHTML = CLEAN_HTML;

    const CHAT = document.getElementById("TextAreaChatLog");
    if (CHAT) {
      if (elementId) {
        const EXISTING = document.getElementById(elementId);
        if (EXISTING) {
          EXISTING.remove();
        }

        const WRAPPER = document.createElement("div");
        WRAPPER.id = elementId;
        WRAPPER.appendChild(OUTPUT.content);

        CHAT.appendChild(WRAPPER);
      } else {
        CHAT.appendChild(OUTPUT);
      }
      ElementScrollToEnd("TextAreaChatLog");
    } else {
      console.log("CRABS ERROR: Could not find chat element!");
    }
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
   *  print icons
   *
   *  @param key - (string) name of the icon you want
   *  @param tooltip - (string [optional] string tool top
   *  @param style - (string) [optional] css style
   *                    to overwrite the default style sheet.
   *  @return - (string) html representing the icon
   */
  protected printimage(
    key: string,
    tooltip: string = "", // optional tooltip
    css_class: string = "CRABS_icon", //optional class overwrite
    css_style: string = "" // optional, css overwrite
  ): string {
    let ICON = this.IMAGES["error"]; // fall back if the icon isn't found
    if (key in this.IMAGES) {
      // test if the key exists
      ICON = this.IMAGES[key];
    }
    const BASEPATH = "https://sin-1337.github.io/CRABS/images/";

    let html = "";
    if (tooltip != "") html += `<div class='CRABS_tooltip-wrapper'>`; // skip the tool tip if string wasn't set
    html += `<img `;
    html += `alt='${key}' `;
    html += `src='${BASEPATH}${ICON}' `;
    html += `class='${css_class}'`;
    if (css_style != "") html += `style="${css_style}"`;
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
    let red = parseInt(hex.slice(0, 2), 16);
    let green = parseInt(hex.slice(2, 4), 16);
    let blue = parseInt(hex.slice(4, 6), 16);

    // Return the rgba value with alpha transparency
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }
}
