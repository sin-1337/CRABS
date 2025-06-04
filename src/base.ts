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

    // options:
    close: "close.svg",
    help: "help.svg",
    settings: "settings.svg",

    // badges
    admin: "admin.svg",
    vip: "vip.svg",
    player: "player.svg",

    // icons
    you: "you.svg",
    owner: "owner.svg",
    sub: "sub.svg",
    trial: "trial.svg",
    lover: "lover.svg",
    bestfriend: "bestfriend.svg",
    friend: "friends.svg",
    whitelist: "whitelist.svg",
    blacklist: "blacklist.svg",
    ghost: "ghost.svg",
    thought: "thought.svg",

    // globe icon for all BC players
    connected: "connected.svg",

    //map keys
    keyGold: "keyGold.png",
    keySilver: "keySilver.png",
    keyBronze: "keyBronze.png",
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

  /**
   * Takes a member number and opens that player's  "focus" screen.
   * This function is setup up to be exposed to the global DOM.
   *
   * @param {number} MemberNumber - The member number for the player in question.
   * @returns {void}
   */
  public showPlayerFocus(MemberNumber: number): void {
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

  /** Takes a string target mod name and returns a true if found.
   *  @param {string} targetmod - String name of the mod.
   *  @returns {boolean} True if found, false if not.
   */
  protected detectMod(targetmod: string): boolean {
    let modlist = bcModSdk.getModsInfo();
    return modlist.filter((x) => x.name == targetmod).length > 0;
  }

  /**
   * Removes an element from the DOM by id
   *
   * @param {string} elementId - ID of HTML element to remove
   * @returns {void}
   */
  public closeElement(elementId: string): void {
    if (elementId) {
      const EXISTING = document.getElementById(elementId);
      if (EXISTING) {
        EXISTING.remove();
      }
    }
  }

  /**
   * Attaches an event listener to any object matching the supplied class.
   *
   * @param {string} classname - Name of the class you are looking for.
   * @param {string} action - Name of the function you want to call when the event is triggered.
   * @param {string} [data] - [optional] Arguments to the function, MUST be camelcase... ex: playerNumber.
   * @param {string} [arg] - [optional] Direct argument to pass, mutually exclusive with data, if passed, data ignored.
   * @param {string} [event] - [default = click] Type of event you wish this to trigger on.
   * @returns {void}
   */
  public attachEvent(
    classname: string,
    action: string,
    data?: string,
    arg?: string,
    event: string = "click"
  ): void {
    const CHAT = document.getElementById("TextAreaChatLog");

    if (!CHAT) return; // if chat is not found, bail
    // Select all roster links
    const ELEMENTS = CHAT.getElementsByClassName(
      classname
    ) as HTMLCollectionOf<HTMLElement>;

    // Attach event listeners to all roster links
    for (const ELEMENT of ELEMENTS) {
      ELEMENT.addEventListener(event, (e) => {
        // add listener
        const TARGET = e.currentTarget as HTMLElement; // capture target
        if (arg) {
          (window as any)[action](arg);
          return;
        }
        if (data) {
          const DATA = TARGET.dataset[data]; // parse data
          (window as any)[action](DATA);
          return;
        } else {
          (window as any)[action]();
          return;
        }
      });
    }
  }

  public attachEventWithCallback(
    classname: string,
    callback: (e: Event) => void,
    event: string = "click"
  ): void {
    const CHAT = document.getElementById("TextAreaChatLog");
    if (!CHAT) return;

    const ELEMENTS = CHAT.getElementsByClassName(
      classname
    ) as HTMLCollectionOf<HTMLElement>;
    for (const ELEMENT of ELEMENTS) {
      ELEMENT.addEventListener(event, callback);
    }
  }

  /**
   * Prints HTMLElement objects into the DOM (Chat Window) and scroll to bottom of chat window.
   *
   * @param {HTMLElement} output - Object to print
   * @param {string} elementId - Name of the element
   * @returns {void}
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
        this.closeElement(elementId);

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
    this.attachEvent("CRABS_Help_Icon", "crabsHelp");
    // this.attachEventWithCallback("CRABS_Help_Icon", (e) => window.crabsHelp(e));
    this.attachEvent("CRABS_close", "crabsCloseItem", "elementid");
    // this.attachEventWithCallback("CRABS_close", (e) => window.crabsCloseItem(e));
  }

  /**
   * Takes a template name and outputs the filled out template string
   *
   * @param {string} template_name - Name of the HTML file, no extension or path
   * @param {Record<string, string>} args - A dictionary where the key is a variable name to replace the template
   * @param {boolean} wrapper -  A boolean that determines if we draw the wrapper or not
   * @param {Record<string, string>} [wrapperArgs] - [optional] A dictionary of key/values that populate the wrapper
   * @returns {string } HTML string
   */
  protected template(
    template: string,
    args: Record<string, string>,
    wrapper: boolean = true,
    wrapperArgs?: Record<string, string> // ignored when wrapper == false
  ): string {
    let regex: RegExp;

    for (const [KEY, VALUE] of Object.entries(args)) {
      regex = new RegExp(`{{${KEY}}}`, "g");
      template = template.replace(regex, VALUE);
    }

    if (wrapper) {
      template = wrappertemplate
        .replace("{{Help}}", this.printimage("help", "Help", "CRABS_Help_Icon"))
        .replace("{{content}}", template);
      if (wrapperArgs) {
        for (const [KEY, VALUE] of Object.entries(wrapperArgs)) {
          regex = new RegExp(`{{${KEY}}}`, "g");
          template = template.replace(regex, VALUE);
        }
      }
    }

    return template;
  }

  /**
   * print icons
   *
   * @param {string} key - Name of the icon you want
   * @param {string} [tooltip] - [optional] String tooltip
   * @param {string} [style] - [optional] CSS styles to overwrite the default style sheet.
   * @param {[string, string]} [data] - [optional] Dictionary of strings to provide data to event listeners.
   * @returns {sring} HTML representing the icon
   */
  protected printimage(
    key: string,
    tooltip: string = "", // optional tooltip
    css_class: string = "CRABS_icon", //optional class overwrite
    css_style: string = "", // optional, css overwrite
    data?: [string, string] // optional, facilitates special data for event listeners
  ): string {
    let icon = this.IMAGES["error"]; // fall back if the icon isn't found
    if (key in this.IMAGES) {
      // test if the key exists
      icon = this.IMAGES[key];
    }
    const BASEPATH = "https://sin-1337.github.io/CRABS/images/";

    let html = "";
    if (tooltip != "") html += `<div class='CRABS_tooltip-wrapper'>`; // skip the tool tip if string wasn't set
    html += `<img `;
    if (data) html += `data-${data[0]}=${data[1]} `;
    html += `alt='${key}' `;
    html += `src='${BASEPATH}${icon}' `;
    html += `class='${css_class}'`;
    if (css_style != "") html += `style="${css_style}"`;
    html += `>`;
    if (tooltip != "") html += `<div class='CRABS_tooltip'>${tooltip}</div>`;
    if (tooltip != "") html += `</div>`;
    return html;
  }

  /**
   * Function to convert hex color to rgba and add transparency
   *
   * @param {string} hex - value of the color
   * @param {number} [alpha] - for transparencey, bigger is more opaque. Optional, default 0
   *  Alpha range: The alpha value ranges from -1 to 1:
   *  alpha = 0: means fully opaque (no transparency).
   *  alpha = -1: means fully transparent (completely invisible).
   * @returns {string} RGBA value with alpha
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
