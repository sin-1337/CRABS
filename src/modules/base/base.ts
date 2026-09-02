/**
 * CRABS Base Module
 *
 * This is the base class for all CRABS mod modules. It provides:
 * - Core functionality that all modules inherit
 * - Centralized translation engine (i18n) and dictionary registry
 * - Utility methods for chat room interactions
 * - Common helper functions for mod operations
 * - Base initialization and setup procedures
 */

import bcModSdk, { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Assets } from "../assets";
import { Notification } from "../notifications";
import DOMPurify from "dompurify";
import "./templates/base.css";
import wrappertemplate from "./templates/wrapper.html";

import * as baseLocales from "./i18n";

export enum PerformanceLevel {
  NORMAL = 0, // > 30 FPS
  LOW = 1, // 15 - 30 FPS
  CRITICAL = 2, // < 15 FPS
}

export type SupportedLocale = "en" | "de" | "fr" | "ru" | "cn" | "tw" | "uk";

/**
 * Abstract base class for all CRABS modules, providing shared utilities and core functionality.
 */
export abstract class CRABS_Base {
  /** The ModSDK API instance for the CRABS mod. */
  declare CRABS: ModSDKModAPI;

  public static debugMode: boolean = false;

  /** Static reference to the subscreen definition for the game's preference menu. */
  protected static subscreenDef: any = null;

  /**
   * Central storage dictionary for registered translations.
   * Maps normalized locale codes to namespaced key-value dictionaries.
   * @type {Record<string, Record<string, any>>}
   */
  private static translations: Record<string, Record<string, any>> = {};

  /**
   * Explicit user language override setting.
   * When set to null, the runtime defaults to automatic base-game language detection.
   * @type {string | null}
   */
  private static userLanguageOverride: string | null = null;

  /** The module namespace assigned during super() call. */
  protected readonly moduleNamespace: string;

  public static currentPerformanceLevel: PerformanceLevel =
    PerformanceLevel.NORMAL;
  private failedHooks: Set<string> = new Set();
  private disabledHooks: Set<string> = new Set();

  /**
   * Initializes a CRABS module instance, assigns its unique namespace,
   * unrolls default bundle exports if present, and registers all translation bundles.
   *
   * @param {ModSDKModAPI} CRABS - The ModSDK API instance.
   * @param {string} [namespace="base"] - Unique module identifier used for scoping localization keys.
   * @param {Record<string, any>} [locales={}] - Key-value map of locale codes to translation JSON objects.
   */
  constructor(
    CRABS: ModSDKModAPI,
    namespace: string = "base",
    locales: Record<string, any> = {},
  ) {
    this.CRABS = CRABS;
    this.moduleNamespace = namespace;

    // Ensure base strings are registered once for all available locales
    if (!CRABS_Base.translations["en"]?.["base"]) {
      for (const [lang, bundle] of Object.entries(baseLocales)) {
        this.registerTranslations("base", lang, bundle);
      }
    }

    // Register all translations passed into this module
    for (const [lang, bundle] of Object.entries(locales)) {
      this.registerTranslations(namespace, lang, bundle);
    }
  }

  /**
   * Normalizes arbitrary locale strings and standard Bondage Club language codes
   * into standardized, two-letter lowercase language identifiers.
   *
   * @param {string | undefined | null} lang - The raw language code or descriptor.
   * @returns {SupportedLocale} The normalized language identifier.
   */
  public static normalizeLocale(
    lang: string | undefined | null,
  ): SupportedLocale {
    if (!lang) return "en";
    const normalized = lang.trim().toLowerCase();
    switch (normalized) {
      case "cn":
      case "zh":
      case "zh-cn":
        return "cn";
      case "tw":
      case "zh-tw":
      case "zh-hk":
        return "tw";
      case "de":
        return "de";
      case "fr":
        return "fr";
      case "ru":
        return "ru";
      case "uk":
      case "ua":
        return "uk";
      default:
        return (normalized.slice(0, 2) as SupportedLocale) || "en";
    }
  }

  /**
   * Evaluates the active locale by checking the user override configuration,
   * falling back to the base game's active translation settings, or defaulting to English.
   *
   * @returns {SupportedLocale} The resolved active locale code.
   */
  public static getActiveLocale(): SupportedLocale {
    if (CRABS_Base.userLanguageOverride) {
      return CRABS_Base.normalizeLocale(CRABS_Base.userLanguageOverride);
    }
    const globalWindow = window as any;
    const gameLang =
      globalWindow.TranslationLanguage ||
      localStorage.getItem("BondageClubLanguage") ||
      "en";
    return CRABS_Base.normalizeLocale(gameLang);
  }

  /**
   * Sets or clears an explicit language override for all CRABS operations.
   * Passing null or "auto" restores automatic base-game language synchronization.
   *
   * @param {string | null} lang - Target locale identifier or null to clear.
   * @returns {void}
   */
  public static setLanguageOverride(lang: string | null): void {
    CRABS_Base.userLanguageOverride = !lang || lang === "auto" ? null : lang;
  }

  /**
   * Registers a translation bundle directly to a specific module namespace and locale.
   *
   * @param {string} namespace - Unique module identifier.
   * @param {string} locale - Target locale code.
   * @param {Record<string, any>} bundle - Translation key dictionary.
   * @returns {void}
   */
  public registerTranslations(
    namespace: string,
    locale: string,
    bundle: Record<string, any>,
  ): void {
    const normLocale = CRABS_Base.normalizeLocale(locale);
    if (!CRABS_Base.translations[normLocale]) {
      CRABS_Base.translations[normLocale] = {};
    }

    const rawData =
      bundle && typeof bundle === "object" && "default" in bundle
        ? bundle.default
        : bundle;

    if (
      rawData &&
      typeof rawData === "object" &&
      namespace in rawData &&
      Object.keys(rawData).length === 1
    ) {
      CRABS_Base.translations[normLocale][namespace] = rawData[namespace];
    } else {
      CRABS_Base.translations[normLocale][namespace] = {
        ...(CRABS_Base.translations[normLocale][namespace] || {}),
        ...rawData,
      };
    }
  }

  /**
   * Traverses a nested dictionary structure using a dot-delimited path key.
   *
   * @param {any} obj - The root object or dictionary to traverse.
   * @param {string} key - Dot-delimited path indicating the target property.
   * @returns {string | undefined} The resolved string value, or undefined if not found.
   * @private
   */
  private static resolveKey(obj: any, key: string): string | undefined {
    if (!obj) return undefined;
    const parts = key.split(".");
    let current = obj;
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    return typeof current === "string" ? current : undefined;
  }

  /**
   * Translates a fully qualified key path into localized text using the active locale,
   * gracefully falling back to English and performing dynamic token interpolation.
   *
   * @param {string} key - Fully qualified, dot-delimited path key.
   * @param {Record<string, string | number>} [params] - Optional interpolation tokens.
   * @returns {string} The fully resolved localized text, or the raw key upon resolution failure.
   */
  public static translate(
    key: string,
    params?: Record<string, string | number>,
  ): string {
    const active = CRABS_Base.getActiveLocale();

    let text = CRABS_Base.resolveKey(CRABS_Base.translations[active], key);

    // Fallback: Check Traditional Chinese -> Simplified Chinese before English
    if ((text === undefined || text === "") && active === "tw") {
      text = CRABS_Base.resolveKey(CRABS_Base.translations["cn"], key);
    }

    // Default Fallback: English
    if ((text === undefined || text === "") && active !== "en") {
      text = CRABS_Base.resolveKey(CRABS_Base.translations["en"], key);
    }

    if (text === undefined || text === "") {
      return key;
    }

    if (params) {
      return text.replace(/\{(\w+)\}/g, (_, match) =>
        params[match] !== undefined ? String(params[match]) : `{${match}}`,
      );
    }

    return text;
  }

  /**
   * Translates a localization key relative to the current module's namespace.
   *
   * @param {string} key - Scoped key or fully qualified key path.
   * @param {Record<string, string | number>} [params] - Optional interpolation tokens.
   * @returns {string} The resolved, localized text.
   */
  public t(key: string, params?: Record<string, string | number>): string {
    const fullKey = key.startsWith(`${this.moduleNamespace}.`)
      ? key
      : `${this.moduleNamespace}.${key}`;
    return CRABS_Base.translate(fullKey, params);
  }

  /**
   * Safely hooks a base-game function.
   *
   * @param {string} targetFunction - The name of the global game function to hook.
   * @param {number} priority - ModSDK priority level.
   * @param {(args: any[], next: (args: any[]) => any) => any} callback - Hook execution callback.
   * @returns {void}
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
                message: CRABS_Base.translate(
                  "notifications.errors.feature_disabled",
                  { hook: targetFunction },
                ),
                title: "notifications.errors.error_title",
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
   *
   * @param {string} id - Unique identifier for the keybinding.
   * @param {string} actionName - Display name of the action.
   * @param {string} description - Brief description of the shortcut.
   * @param {string} key - Primary key code (e.g., 'KeyD', 'KeyB').
   * @param {() => boolean} actionCallback - Keybind execution function.
   * @param {Set<string>} [modifiers=new Set(["Ctrl", "Alt"])] - Required modifier key set.
   * @returns {void}
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
        name: {
          EN: CRABS_Base.translate("base.keybinds.category"),
        },
      });
    }

    const actionWrapper = () => actionCallback();

    Object.defineProperty(actionWrapper, "name", {
      value: { EN: actionName },
      configurable: true,
      writable: true,
    });

    globalWindow.KeyManager.registerKeybinding({
      id: id,
      name: { EN: actionName },
      action: () => actionCallback(),
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
   *
   * @param {string} [action="all"] - Command arguments to evaluate.
   * @returns {void}
   */
  public fakePlayerCommand(action: string = "all"): void {
    for (let [_, command] of Commands.entries()) {
      if (command.Tag === `crabs`) {
        command.Action(action);
        break;
      }
    }
  }

  /**
   * Strips combining diacritical marks (Zalgo text) and normalizes stylized Unicode fonts.
   *
   * @param {string} text - The raw input string.
   * @returns {string} The sanitized, normalized plain text string.
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
   * Determines if the drawer should render in mobile mode based on screen width and UA.
   *
   * @returns {boolean} True if the viewport is mobile-sized.
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
   * Opens a target character's focus screen or outputs a local missing message.
   *
   * @param {number} MemberNumber - Target character's member number.
   * @returns {void}
   */
  public showPlayerFocus(MemberNumber: number): void {
    const character = ChatRoomCharacter.find(
      (characterItem) => characterItem.MemberNumber == MemberNumber,
    );
    if (character) {
      ChatRoomStatusUpdate("Preference");
      ChatRoomFocusCharacter(character);
    } else {
      ChatRoomSendLocal(CRABS_Base.translate("base.chat.person_not_found"));
    }
  }

  /**
   * Checks if an external mod SDK is active.
   *
   * @param {string} targetmod - Name of the mod.
   * @returns {boolean} True if detected.
   */
  protected detectMod(targetmod: string): boolean {
    let modlist = bcModSdk.getModsInfo();
    return modlist.filter((modInfo) => modInfo.name == targetmod).length > 0;
  }

  /**
   * Copies string data to the clipboard and sends a localized confirmation toast.
   *
   * @param {string} data - String data to copy.
   * @returns {Promise<void>}
   */
  public async copyToClipboard(data: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(data);
      Notification.send({
        message: CRABS_Base.translate("notifications.clipboard.copied", {
          data,
        }),
      });
      return;
    } catch (error) {
      console.error("Copy to clipboard failed", error);
      return;
    }
  }

  /**
   * Removes an element from the DOM by its ID.
   *
   * @param {string} elementId - ID of the HTML element to remove.
   * @returns {void}
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
   * Navigates to the CRABS settings page directly, bypassing the Extensions list.
   *
   * @returns {Promise<void>}
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
      if (cache?.loadedPromise) {
        await cache.loadedPromise;
      }
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
   * Attaches an event listener to elements matching the supplied class or ID.
   *
   * @param {string} selectorName - Target class or ID.
   * @param {(val?: any) => void} callback - Event listener callback.
   * @param {string} [data] - Optional dataset key to pass to callback.
   * @param {any} [callbackArgument] - Direct argument to pass to callback.
   * @param {string} [event="click"] - DOM event type.
   * @param {"class" | "id"} [findBy="class"] - Search selector strategy.
   * @param {HTMLElement} [root] - Container search root.
   * @returns {void}
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
   * Renders HTML strings into the chat DOM and scrolls to the bottom.
   *
   * @param {string} [output] - HTML string to render.
   * @param {string} [elementId] - Target wrapper ID.
   * @param {HTMLElement} [root] - Container root for events.
   * @returns {void}
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
        ElementScrollToEnd("TextAreaChatLog");
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
   * Processes a template string by replacing variables, wrapper contents, and {{t:key}} tokens.
   *
   * @param {string} template - The HTML template string.
   * @param {Record<string, string>} templateArguments - Direct substitution variables.
   * @param {boolean} [wrapper=true] - Whether to apply the base container wrapper.
   * @param {Record<string, string>} [wrapperArgs] - Custom variables for the wrapper.
   * @returns {string} The processed HTML string.
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

    template = template.replace(/\{\{t:([a-zA-Z0-9_.]+)\}\}/g, (_, key) => {
      return this.t(key);
    });

    if (wrapper) {
      template = wrappertemplate
        .replace(
          "{{Help}}",
          Assets.printimage({
            key: "help",
            tooltip_override: CRABS_Base.translate("base.tooltips.help"),
          }),
        )
        .replace(
          "{{Settings}}",
          Assets.printimage({
            key: "settings",
            tooltip_override: CRABS_Base.translate("base.tooltips.settings"),
          }),
        )
        .replace("{{content}}", template);

      if (wrapperArgs) {
        for (const [key, value] of Object.entries(wrapperArgs)) {
          regularExpression = new RegExp(`{{${key}}}`, "g");
          template = template.replace(regularExpression, value);
        }
      }

      template = template.replace(/\{\{t:([a-zA-Z0-9_.]+)\}\}/g, (_, key) => {
        return this.t(key);
      });
    }

    return template;
  }

  /**
   * Converts a hex color string to an RGBA string with alpha transparency.
   *
   * @param {string} hex - The hex color code.
   * @param {number} [alpha=0] - The opacity channel value (-1 to 1).
   * @returns {string} Formatted rgba() string.
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
   *
   * @param {string} color - The color string to analyze.
   * @returns {number} Value from 0 (darkest) to 255 (brightest).
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
    } catch (error) {
      this.colorBrightnessCache.set(color, 255);
      return 255;
    }
  }

  /**
   * Generates a brightly saturated version of a color for text outlines.
   *
   * @param {string} color - Base color string.
   * @returns {string} RGBA outline string.
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
    } catch (error) {
      return "rgba(255,255,255,0.8)";
    }
  }
}
