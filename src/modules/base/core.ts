/**
 * CRABS Base Module
 *
 * Core base class for CRABS modules inside the Bondage Club ecosystem.
 * Handles SDK integration, safe hooking, internationalization proxying,
 * UI injection, and DOM event binding.
 *
 * @module base
 */

import { ModSDKModAPI } from "bondage-club-mod-sdk";
import DOMPurify from "dompurify";
import "./templates/base.css";
import wrappertemplate from "./templates/wrapper.html";

import { registerTranslations, translate } from "./localization";
import {
  convertColor,
  getColorBrightness,
  getBrightOutlineColor,
  canvasContext,
} from "./color";
import { isMap, isCompassBlocked, dropMapKey } from "./context";
import { registerKeybind } from "./keybinds";

export enum PerformanceLevel {
  NORMAL = 0,
  LOW = 1,
  CRITICAL = 2,
}

export abstract class CRABS_Base {
  declare CRABS: ModSDKModAPI;

  public static debugMode: boolean = false;
  protected static subscreenDef: any = null;
  protected readonly moduleNamespace: string;

  public static currentPerformanceLevel: PerformanceLevel =
    PerformanceLevel.NORMAL;
  private failedHooks: Set<string> = new Set();
  private disabledHooks: Set<string> = new Set();

  /** Re-export canvas context reference for backward compatibility */
  public static get canvasContext(): CanvasRenderingContext2D | null {
    return canvasContext;
  }

  /**
   * Initializes a CRABS module instance and registers its optional translations bundle.
   *
   * @param CRABS - Instantiated ModSDK bridge.
   * @param namespace - Module namespace string.
   * @param bundle - Optional translation map or bundle.
   */
  constructor(
    CRABS: ModSDKModAPI,
    namespace: string = "base",
    bundle: Record<string, any> = {},
  ) {
    this.CRABS = CRABS;
    this.moduleNamespace = namespace;

    // Register module translations if provided
    if (namespace !== "base" && bundle && Object.keys(bundle).length > 0) {
      registerTranslations(namespace, bundle);
    }
  }

  /**
   * Translates a scoped or cross-module translation key.
   *
   * @param key - Translation token path.
   * @param params - Optional parameter replacements.
   * @returns Localized string.
   */
  public t(key: string, params?: Record<string, string | number>): string {
    const firstToken = key.split(".")[0];
    const fullKey =
      firstToken === this.moduleNamespace
        ? key
        : `${this.moduleNamespace}.${key}`;
    return translate(fullKey, params);
  }

  // ─────────────────────────────────────────────────────────────
  // Proxied Utility Methods (Retains full backward compatibility)
  // ─────────────────────────────────────────────────────────────

  /** Checks if player is on a map view */
  public isMap = isMap;

  /** Checks if compass is blocked by room rules or blindness */
  public isCompassBlocked = isCompassBlocked;
  public static isCompassBlocked = isCompassBlocked;

  /** Drops one or all map keys currently held by the player */
  public dropMapKey = dropMapKey;

  /** Converts a hex string into an RGBA color string */
  protected convertColor = convertColor;

  /** Calculates luminance brightness of a given color string */
  protected getColorBrightness = getColorBrightness;

  /** Computes high-contrast outline color for dark text labels */
  protected getBrightOutlineColor = getBrightOutlineColor;

  /** Static keybinding registrar */
  public static registerKeybind = registerKeybind;

  /**
   * Registers a safe function hook through ModSDK with crash isolation and automated disable guards.
   *
   * @param targetFunction - Name of the global function to hook.
   * @param priority - Execution order priority.
   * @param callback - Hook handler callback receiving `args` and `next`.
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
            if (baseGameCrashed) throw crabsError;

            this.disabledHooks.add(targetFunction);
            console.error(
              `[CRABS] Internal crash in '${targetFunction}'. Feature disabled to protect game stability.`,
              crabsError,
            );

            if (!nextWasCalled) {
              try {
                return next(args);
              } catch {
                // Base game also threw on fallback, prevent unhandled rejection
              }
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
   * Simulates execution of a slash command registered in the game's command array.
   *
   * @param action - Action arguments passed to the command handler.
   * @param tag - Tag name of the command (default: "crabs").
   * @returns True if command was located and dispatched.
   */
  public fakePlayerCommand(
    action: string = "all",
    tag: string = "crabs",
  ): boolean {
    const globalWindow = window as any;
    const list = globalWindow.Commands || (window as any).Commands;

    if (!Array.isArray(list)) return false;

    for (const [_, command] of list.entries()) {
      if (command.Tag === tag && typeof command.Action === "function") {
        command.Action(action);
        return true;
      }
    }
    return false;
  }

  /**
   * Strips zalgo unicode combining marks and normalizes text representation.
   *
   * @param text - Raw string to normalize.
   * @returns Cleaned text string.
   */
  public cleanZalgoAndNormalize(text: string): string {
    if (!text) return "";
    return text
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/g,
        "",
      )
      .normalize("NFKC");
  }

  /**
   * Detects whether the current viewport represents a mobile client.
   *
   * @returns True if viewport or user agent indicates mobile.
   */
  protected isMobileView(): boolean {
    if (window.innerWidth <= 768) return true;
    const nav = navigator as any;
    if (nav.userAgentData && nav.userAgentData.mobile) return true;
    const ua = navigator.userAgent || (window as any).opera;
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      ua.toLowerCase(),
    );
  }

  /**
   * Navigates the game UI to focus a specific character's sheet.
   *
   * @param MemberNumber - Member number of character to inspect.
   */
  public showPlayerFocus(MemberNumber: number | string): void {
    const globalWindow = window as any;
    const targetId = Number(MemberNumber);
    const character = globalWindow.ChatRoomCharacter?.find(
      (c: any) => c.MemberNumber === targetId,
    );

    if (character) {
      globalWindow.ChatRoomStatusUpdate("Preference");
      globalWindow.ChatRoomFocusCharacter(character);
    } else {
      if (typeof globalWindow.ChatRoomSendLocal === "function") {
        globalWindow.ChatRoomSendLocal(translate("base.chat.person_not_found"));
      }
    }
  }

  /**
   * Copies specified text data to the system clipboard.
   *
   * @param data - String data to copy.
   */
  public async copyToClipboard(data: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(data);
    } catch (error) {
      console.error("Copy to clipboard failed", error);
    }
  }

  /**
   * Removes a DOM element by its ID if present.
   *
   * @param elementId - ID string of target element.
   */
  public closeElement(elementId: string): void {
    if (elementId) {
      const existing = document.getElementById(elementId);
      if (existing) existing.remove();
    }
  }

  /**
   * Opens Bondage Club's Preferences screen and prepares the CRABS subscreen view.
   */
  public async openSettings(): Promise<void> {
    const screen = window as any;

    if (
      typeof screen.TextPrefetchFile === "function" &&
      typeof screen.ScreenFileGetTranslation === "function"
    ) {
      const cache = screen.TextPrefetchFile(
        screen.ScreenFileGetTranslation("Character", "Preference"),
      );
      if (cache?.loadedPromise) await cache.loadedPromise;
    }

    if (
      screen.CurrentModule !== "Character" ||
      screen.CurrentScreen !== "Preference"
    ) {
      screen.InformationSheetLoadCharacter(screen.Player);
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
   * Attaches event listeners to DOM elements matching a class or ID selector.
   *
   * @param selectorName - Class name or ID string.
   * @param callback - Event handler function.
   * @param data - Optional dataset key to extract and forward to callback.
   * @param callbackArgument - Fixed argument passed to callback.
   * @param event - DOM event name (default: "click").
   * @param findBy - Search mode: "class" or "id" (default: "class").
   * @param root - Scoped root container element.
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

    for (const element of elements) {
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
   * Injects rendered HTML output into the game chat log or custom container.
   *
   * @param output - Raw HTML string to sanitize and inject.
   * @param elementId - Optional wrapper container element ID.
   * @param root - Optional root scope for event binding.
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

      const chat = document.getElementById("TextAreaChatLog");
      if (chat) {
        if (elementId) {
          this.closeElement(elementId);
          const wrapper = document.createElement("div");
          wrapper.id = elementId;
          wrapper.appendChild(template.content);
          chat.appendChild(wrapper);
        } else {
          chat.appendChild(template.content);
        }

        const globalWindow = window as any;
        if (typeof globalWindow.ElementScrollToEnd === "function") {
          globalWindow.ElementScrollToEnd("TextAreaChatLog");
        } else {
          chat.scrollTop = chat.scrollHeight;
        }
      }
    }

    this.attachEvent(
      "CRABS_Help_Icon",
      () => this.fakePlayerCommand("help"),
      undefined,
      undefined,
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
   * Interpolates template tokens with values and localization mappings.
   *
   * @param template - Raw HTML template containing `{{Key}}` placeholders.
   * @param templateArguments - Key-value replacements.
   * @param wrapper - Whether to enclose template in outer wrapper shell.
   * @param wrapperArgs - Variables applied to outer shell.
   * @returns Rendered HTML string.
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

    template = template.replace(/\{\{t:([a-zA-Z0-9_.]+)\}\}/g, (_, key) =>
      this.t(key),
    );

    if (wrapper) {
      template = wrappertemplate.replace("{{content}}", template);

      if (wrapperArgs) {
        for (const [key, value] of Object.entries(wrapperArgs)) {
          regularExpression = new RegExp(`{{${key}}}`, "g");
          template = template.replace(regularExpression, value);
        }
      }

      // Clear any unused wrapper placeholders so raw {{Tags}} don't leak
      template = template.replace("{{Help}}", "").replace("{{Settings}}", "");

      template = template.replace(/\{\{t:([a-zA-Z0-9_.]+)\}\}/g, (_, key) =>
        this.t(key),
      );
    }

    return template;
  }
}
