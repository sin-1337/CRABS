/**
 * CRABS Base Module
 *
 * This is the base class for all CRABS mod modules. It provides:
 * - Core functionality that all modules inherit
 * - Utility methods for chat room interactions
 * - Common helper functions for mod operations
 * - Base initialization and setup procedures
 */

import bcModSdk, { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Assets } from "../assets";
import { Notification } from "../notifications";
import DOMPurify from "dompurify";
import "../templates/base.css";
import wrappertemplate from "../templates/wrapper.html";

import * as Performance from "./performance";
export { PerformanceLevel } from "./performance";

/**
 * Abstract base class for all CRABS modules, providing shared utilities and core functionality.
 */
export abstract class CRABS_Base {
  /** The ModSDK API instance for the CRABS mod. */
  declare CRABS: ModSDKModAPI;

  public static debugMode: boolean = false;

  /** Static reference to the subscreen definition for the game's preference menu. */
  protected static subscreenDef: any = null;

  protected perfTracker = new Performance.PerformanceTracker();

  public get currentPerformanceLevel(): Performance.PerformanceLevel {
    return this.perfTracker.currentLevel;
  }

  /** Tracks hooks that have already failed to prevent log/toast spamming. */
  private failedHooks: Set<string> = new Set();
  private disabledHooks: Set<string> = new Set();

  /**
   * Creates an instance of a CRABS module.
   * @param {ModSDKModAPI} CRABS - The ModSDK API instance.
   */
  constructor(CRABS: ModSDKModAPI) {
    this.CRABS = CRABS;
  }

  /**
   * Safely hooks a base-game function.
   */
  protected safeHook(
    targetFunction: string,
    priority: number,
    callback: (args: any[], next: (args: any[]) => any) => any,
  ): void {
    try {
      (this.CRABS.hookFunction as any)(
        targetFunction,
        priority,
        (args: any[], next: (args: any[]) => any) => {
          if (this.disabledHooks.has(targetFunction)) {
            return next(args);
          }

          let nextWasCalled = false;
          let baseGameCrashed = false;

          const trackedNext = (nextArgs: any[]) => {
            nextWasCalled = true;
            try {
              return next(nextArgs);
            } catch (baseGameError) {
              baseGameCrashed = true;
              throw baseGameError;
            }
          };

          try {
            return callback(args, trackedNext);
          } catch (crabsError) {
            if (baseGameCrashed) {
              throw crabsError;
            }

            this.disabledHooks.add(targetFunction);
            console.error(
              `[CRABS] Internal crash in '${targetFunction}'. Feature disabled to protect the game.`,
              crabsError,
            );

            if (typeof Notification !== "undefined") {
              Notification.send({
                message: `CRABS Feature disabled: ${targetFunction} failed.`,
                title: "Crabs Error",
              });
            }

            if (!nextWasCalled) {
              return next(args);
            }
          }
        },
      );
    } catch (regError) {
      if (!this.failedHooks.has(targetFunction)) {
        this.failedHooks.add(targetFunction);
        console.error(
          `[CRABS ERROR] Failed to register hook: '${targetFunction}'.`,
          regError,
        );
      }
    }
  }

  /**
   * Registers a new keybinding with the global KeyManager.
   */
  public static registerKeybind(
    id: string,
    actionName: string,
    description: string,
    key: string,
    actionCallback: () => boolean,
    modifiers: Set<string> = new Set(["Ctrl", "Alt"]),
  ): void {
    const globalWindow = window as any;

    if (
      !globalWindow.KeyManager ||
      !globalWindow.KeyManager.getContext("always")
    ) {
      setTimeout(
        () =>
          this.registerKeybind(
            id,
            actionName,
            description,
            key,
            actionCallback,
            modifiers,
          ),
        500,
      );
      return;
    }

    if (!globalWindow.KeyManager.getCategory("crabs")) {
      globalWindow.KeyManager.registerCategory({
        id: "crabs",
        name: { EN: "CRABS Mod" },
      });
    }

    Object.defineProperty(actionCallback, "name", {
      value: { EN: actionName },
    });

    globalWindow.KeyManager.registerKeybinding({
      id: id,
      action: actionCallback,
      description: { EN: description },
      contextIds: [],
      categoryId: "crabs",
      readonly: false,
      defaultKeyCombo: {
        key: key,
        modifiers: modifiers,
      },
    });
  }

  /**
   * Fakes a roster command as if the user ran the command themselves.
   */
  public fakePlayerCommand(action: string = "all"): void {
    const globalWindow = window as any;
    const commands = globalWindow.Commands;
    if (!commands) return;

    for (let [_, command] of commands.entries()) {
      if (command.Tag === `crabs`) {
        command.Action(action);
        break;
      }
    }
  }

  /**
   * Determines if the drawer should render in mobile mode.
   */
  protected isMobileView(): boolean {
    if (window.innerWidth <= 768) {
      return true;
    }

    const nav = navigator as any;
    if (nav.userAgentData && nav.userAgentData.mobile) {
      return true;
    }

    const ua = navigator.userAgent || (window as any).opera;
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      ua.toLowerCase(),
    );
  }

  /**
   * Takes a member number and opens that player's "focus" screen.
   */
  public showPlayerFocus(MemberNumber: number): void {
    const globalWindow = window as any;
    const characters = globalWindow.ChatRoomCharacter || [];
    const character = characters.find(
      (characterItem: any) => characterItem.MemberNumber == MemberNumber,
    );

    if (character) {
      if (typeof globalWindow.ChatRoomStatusUpdate === "function")
        globalWindow.ChatRoomStatusUpdate("Preference");
      if (typeof globalWindow.ChatRoomFocusCharacter === "function")
        globalWindow.ChatRoomFocusCharacter(character);
    } else {
      if (typeof globalWindow.ChatRoomSendLocal === "function")
        globalWindow.ChatRoomSendLocal("This person is no longer in the room.");
    }
  }

  /**
   * Checks if a target mod name is present.
   */
  protected detectMod(targetmod: string): boolean {
    let modlist = bcModSdk.getModsInfo();
    return modlist.filter((modInfo) => modInfo.name == targetmod).length > 0;
  }

  /**
   * Copies data to clipboard.
   */
  public async copyToClipboard(data: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(data);
      Notification.send({ message: `"${data}" copied to clipboard.` });
    } catch (error) {
      console.error("Copy to clipboard failed", error);
    }
  }

  /**
   * Removes an element from the DOM by its ID.
   */
  public closeElement(elementId: string): void {
    if (elementId) {
      const existing = document.getElementById(elementId);
      if (existing) {
        existing.remove();
      }
    }
  }

  /**
   * Navigates to the CRABS settings page directly.
   */
  public async openSettings(): Promise<void> {
    const screen = window as any;

    if (
      screen.CurrentModule !== "Character" ||
      screen.CurrentScreen !== "Preference"
    ) {
      if (typeof screen.InformationSheetLoadCharacter === "function")
        screen.InformationSheetLoadCharacter(screen.Player);
      if (typeof screen.CommonSetScreen === "function")
        await screen.CommonSetScreen("Character", "Preference");
    }

    if (typeof screen.PreferenceSubscreenUnload === "function") {
      screen.PreferenceSubscreenUnload();
    }

    if (CRABS_Base.subscreenDef) {
      screen.PreferenceSubscreen = CRABS_Base.subscreenDef;
      screen.PreferencePageCurrent = 1;
      screen.PreferenceMessage = "";

      if (typeof screen.PreferenceSubscreenCreateSubscreen === "function") {
        screen.PreferenceSubscreenCreateSubscreen("");
      }

      if (typeof CRABS_Base.subscreenDef.load === "function")
        CRABS_Base.subscreenDef.load();
      if (typeof screen.PreferenceResize === "function")
        screen.PreferenceResize(true);
    }
  }

  /**
   * Attaches an event listener to any object matching the supplied class or ID.
   */
  public attachEvent(
    selectorName: string,
    callback: (val?: any) => void,
    data?: string,
    callbackArgument?: any,
    event: string = "click",
    findBy: "class" | "id" = "class",
    root?: HTMLElement,
  ): void {
    const searchRoot = root || document.getElementById("TextAreaChatLog");
    if (!searchRoot) return;

    const elements: HTMLElement[] = [];

    if (findBy === "id") {
      const element = root
        ? root.querySelector(`#${selectorName}`)
        : document.getElementById(selectorName);
      if (element) elements.push(element as HTMLElement);
    } else {
      const classElements = searchRoot.getElementsByClassName(selectorName);
      elements.push(
        ...Array.from(classElements as HTMLCollectionOf<HTMLElement>),
      );
    }

    for (let element of elements) {
      element.addEventListener(event, (eventObject: Event) => {
        if (event === "contextmenu") eventObject.preventDefault();

        const target = eventObject.currentTarget as HTMLElement;

        if (callbackArgument !== undefined) callback(callbackArgument);
        else if (data) callback(target.dataset[data]);
        else callback(eventObject);
      });
    }
  }

  /**
   * Renders HTMLElement objects into the DOM (Chat Window) and scrolls to the bottom.
   */
  public buildui(
    output?: string,
    elementId?: string,
    root?: HTMLElement,
  ): void {
    if (output) {
      const template = document.createElement("template");
      const cleanHtml = DOMPurify.sanitize(output, {
        USE_PROFILES: { html: true },
      });
      template.innerHTML = cleanHtml;

      let chat = document.getElementById("TextAreaChatLog");
      if (chat) {
        if (elementId) {
          this.closeElement(elementId);
          let wrapper = document.createElement("div");
          wrapper.id = elementId;
          wrapper.appendChild(template.content);
          chat.appendChild(wrapper);
        } else {
          chat.appendChild(template);
        }
        const globalWindow = window as any;
        if (typeof globalWindow.ElementScrollToEnd === "function") {
          globalWindow.ElementScrollToEnd("TextAreaChatLog");
        }
      }
    }
    this.attachEvent(
      "CRABS_Help_Icon",
      this.fakePlayerCommand,
      undefined,
      "help",
      "click",
      "class",
      root,
    );
    this.attachEvent(
      "CRABS_Settings_Icon",
      () => this.openSettings(),
      undefined,
      undefined,
      "click",
      "class",
      root,
    );
    this.attachEvent(
      "CRABS_close",
      this.closeElement,
      "elementid",
      undefined,
      "click",
      "class",
      root,
    );
  }

  /**
   * Processes a template by replacing variables with provided arguments.
   */
  protected template(
    template: string,
    templateArguments: Record<string, string>,
    wrapper: boolean = true,
    wrapperArgs?: Record<string, string>,
  ): string {
    let regularExpression: RegExp;

    for (const [key, value] of Object.entries(templateArguments)) {
      regularExpression = new RegExp(`{{${key}}}`, "g");
      template = template.replace(regularExpression, value);
    }

    if (wrapper) {
      template = wrappertemplate
        .replace("{{Help}}", Assets.printimage({ key: "help" }))
        .replace("{{Settings}}", Assets.printimage({ key: "settings" }))
        .replace("{{content}}", template);
      if (wrapperArgs) {
        for (const [key, value] of Object.entries(wrapperArgs)) {
          regularExpression = new RegExp(`{{${key}}}`, "g");
          template = template.replace(regularExpression, value);
        }
      }
    }

    return template;
  }

  /**
   * Converts a hex color string to an RGBA string with the specified transparency.
   */
  protected convertColor(hex: string, alpha: number = 0): string {
    hex = hex.replace(/^#/, "");
    const red = parseInt(hex.slice(0, 2), 16);
    const green = parseInt(hex.slice(2, 4), 16);
    const blue = parseInt(hex.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  /** Cache for storing raw brightness values (0-255). */
  protected colorBrightnessCache = new Map<string, number>();
  /** Canvas element used for color calculations. */
  protected colorCanvas = document.createElement("canvas");
  /** Canvas 2D context for color calculations. */
  protected canvasContext = this.colorCanvas.getContext("2d", {
    willReadFrequently: true,
  });

  /**
   * Calculates the perceived brightness of a color.
   */
  protected getColorBrightness(color: string): number {
    if (!color) return 255;

    if (this.colorBrightnessCache.has(color))
      return this.colorBrightnessCache.get(color)!;
    if (!this.canvasContext) return 255;

    try {
      this.colorCanvas.width = 1;
      this.colorCanvas.height = 1;
      this.canvasContext.clearRect(0, 0, 1, 1);
      this.canvasContext.fillStyle = color;
      this.canvasContext.fillRect(0, 0, 1, 1);

      const data = this.canvasContext.getImageData(0, 0, 1, 1).data;
      const brightness = (data[0] * 299 + data[1] * 587 + data[2] * 114) / 1000;

      this.colorBrightnessCache.set(color, brightness);
      return brightness;
    } catch {
      this.colorBrightnessCache.set(color, 255);
      return 255;
    }
  }

  /**
   * Generates a brightly saturated version of a color for the text outline.
   */
  protected getBrightOutlineColor(color: string): string {
    if (!this.canvasContext) return "rgba(255,255,255,0.8)";

    try {
      this.colorCanvas.width = 1;
      this.colorCanvas.height = 1;
      this.canvasContext.clearRect(0, 0, 1, 1);
      this.canvasContext.fillStyle = color;
      this.canvasContext.fillRect(0, 0, 1, 1);

      const data = this.canvasContext.getImageData(0, 0, 1, 1).data;
      let r = data[0],
        g = data[1],
        b = data[2];

      if (r < 30 && g < 30 && b < 30) {
        return "rgba(200, 200, 200, 0.9)";
      }

      const max = Math.max(r, g, b);
      const multiplier = 255 / max;

      const brightR = Math.min(255, r * multiplier);
      const brightG = Math.min(255, g * multiplier);
      const brightB = Math.min(255, b * multiplier);

      r = Math.round((brightR + 255) / 2);
      g = Math.round((brightG + 255) / 2);
      b = Math.round((brightB + 255) / 2);

      return `rgba(${r}, ${g}, ${b}, 0.9)`;
    } catch {
      return "rgba(255,255,255,0.8)";
    }
  }

  /**
   * Checks game performance and toggles a low-quality mode if FPS stays low.
   */
  protected updatePerformanceState(): void {
    this.perfTracker.update(CRABS_Base.debugMode);
  }
}
