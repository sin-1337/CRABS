/**
 * CRABS Base Module
 *
 * Core base class for CRABS modules inside the Bondage Club ecosystem.
 * Handles SDK integration, safe hooking, internationalization, UI injection,
 * keybinding registration, and color/accessibility utilities.
 */

import { ModSDKModAPI } from "bondage-club-mod-sdk";
import DOMPurify from "dompurify";
import "./templates/base.css";
import wrappertemplate from "./templates/wrapper.html";
import baseLocales from "./i18n.json";
export enum PerformanceLevel {
  NORMAL = 0,
  LOW = 1,
  CRITICAL = 2,
}

export type SupportedLocale = "en" | "de" | "fr" | "ru" | "cn" | "tw" | "uk";

export abstract class CRABS_Base {
  declare CRABS: ModSDKModAPI;

  public static debugMode: boolean = false;
  protected static subscreenDef: any = null;
  private static translations: Record<string, Record<string, any>> = {};
  private static userLanguageOverride: string | null = null;
  protected readonly moduleNamespace: string;

  public static currentPerformanceLevel: PerformanceLevel =
    PerformanceLevel.NORMAL;
  private failedHooks: Set<string> = new Set();
  private disabledHooks: Set<string> = new Set();

  /** Shared Static Canvas Resources to prevent multi-instance memory leaks */
  private static colorBrightnessCache = new Map<string, number>();
  private static colorCanvas: HTMLCanvasElement =
    document.createElement("canvas");
  public static canvasContext: CanvasRenderingContext2D | null =
    CRABS_Base.colorCanvas.getContext("2d", { willReadFrequently: true });

  /** External delegate handlers */
  private static onHelpRequested: (() => void) | null = null;
  private static notifyDelegate:
    | ((message: string, title?: string) => void)
    | null = null;
  private static iconRenderer:
    | ((key: string, tooltip: string, cssClass?: string) => string)
    | null = null;

  constructor(
    CRABS: ModSDKModAPI,
    namespace: string = "base",
    bundle: Record<string, any> = {},
  ) {
    this.CRABS = CRABS;
    this.moduleNamespace = namespace;

    // Register base translations if not already loaded
    if (!CRABS_Base.translations["base"]) {
      CRABS_Base.registerTranslations("base", baseLocales);
    }

    // Register module translations
    if (namespace !== "base" && bundle && Object.keys(bundle).length > 0) {
      CRABS_Base.registerTranslations(namespace, bundle);
    }
  }

  public static setHelpHandler(handler: () => void): void {
    CRABS_Base.onHelpRequested = handler;
  }

  public static setNotifyHandler(
    handler: (message: string, title?: string) => void,
  ): void {
    CRABS_Base.notifyDelegate = handler;
  }

  public static setIconRenderer(
    renderer: (key: string, tooltip: string, cssClass?: string) => string,
  ): void {
    CRABS_Base.iconRenderer = renderer;
  }

  /**
   * Checks if location sharing aids and compasses are disabled by room settings or blindness.
   */
  public static isCompassBlocked(): boolean {
    const globalWindow = window as any;
    const roomData = globalWindow.ChatRoomData;

    // 1. Room-level opt-out tag
    if (
      Array.isArray(roomData?.BlockCategory) &&
      roomData.BlockCategory.includes("Location")
    ) {
      return true;
    }

    // 2. Blindness check (Global helper fallback + instance method check)
    const player = globalWindow.Player;
    if (player) {
      if (typeof globalWindow.CharacterGetBlindLevel === "function") {
        if (globalWindow.CharacterGetBlindLevel(player) > 0) return true;
      } else if (
        typeof player.GetBlindLevel === "function" &&
        player.GetBlindLevel() > 0
      ) {
        return true;
      }
    }

    return false;
  }

  /** Instanced proxy for isCompassBlocked */
  public isCompassBlocked(): boolean {
    return CRABS_Base.isCompassBlocked();
  }

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

  public static setLanguageOverride(lang: string | null): void {
    CRABS_Base.userLanguageOverride = !lang || lang === "auto" ? null : lang;
  }

  public static registerTranslations(
    namespace: string,
    bundle: Record<string, any>,
  ): void {
    let rawData =
      bundle && typeof bundle === "object" && "default" in bundle
        ? bundle.default
        : bundle;

    // VERY IMPORTANT: Unwraps double namespaces from the migration script
    if (
      rawData &&
      typeof rawData === "object" &&
      namespace in rawData &&
      Object.keys(rawData).length === 1
    ) {
      rawData = rawData[namespace];
    }

    CRABS_Base.translations[namespace] = {
      ...(CRABS_Base.translations[namespace] || {}),
      ...rawData,
    };
  }

  public registerTranslations(
    namespace: string,
    bundle: Record<string, any>,
  ): void {
    CRABS_Base.registerTranslations(namespace, bundle);
  }

  private static resolveKey(
    obj: any,
    keyPath: string[],
  ): Record<string, string> | undefined {
    let current = obj;
    for (const part of keyPath) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    return typeof current === "object" && current !== null
      ? current
      : undefined;
  }

  public static translate(
    key: string,
    params?: Record<string, string | number>,
  ): string {
    const active = CRABS_Base.getActiveLocale();
    const parts = key.split(".");

    // Determine namespace (first token) and path within namespace
    const namespace = parts[0];
    const subPath = parts.slice(1);

    // Look in namespace first, or check the root if unnamespaced
    let entry = CRABS_Base.translations[namespace]
      ? CRABS_Base.resolveKey(CRABS_Base.translations[namespace], subPath)
      : undefined;

    // Fallback: if not found, check if it was registered under 'base'
    if (!entry && namespace !== "base" && CRABS_Base.translations["base"]) {
      entry = CRABS_Base.resolveKey(CRABS_Base.translations["base"], parts);
    }

    // 🔴 DEBUG CHECK
    if (!entry) {
      console.warn(
        `[CRABS i18n MISS] Key: "${key}", Namespace: "${namespace}", subPath:`,
        subPath,
        "Available in namespace:",
        Object.keys(CRABS_Base.translations[namespace] || {}),
      );
    }

    let text: string | undefined = undefined;

    if (entry) {
      text = entry[active];
      if ((text === undefined || text === "") && active === "tw") {
        text = entry["cn"];
      }
      if ((text === undefined || text === "") && active !== "en") {
        text = entry["en"];
      }
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

  public t(key: string, params?: Record<string, string | number>): string {
    // Check if the key already starts with a known, registered namespace
    const namespace = key.split(".")[0];
    const isCrossModule = namespace && CRABS_Base.translations[namespace];

    const fullKey = isCrossModule ? key : `${this.moduleNamespace}.${key}`;
    return CRABS_Base.translate(fullKey, params);
  }

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

            if (CRABS_Base.notifyDelegate) {
              CRABS_Base.notifyDelegate(
                CRABS_Base.translate("notifications.errors.feature_disabled", {
                  hook: targetFunction,
                }),
                CRABS_Base.translate("notifications.errors.error_title"),
              );
            }

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
        name: { EN: CRABS_Base.translate("base.keybinds.category") },
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
      defaultKeyCombo: { key: key, modifiers: modifiers },
    });
  }

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

  protected isMobileView(): boolean {
    if (window.innerWidth <= 768) return true;
    const nav = navigator as any;
    if (nav.userAgentData && nav.userAgentData.mobile) return true;
    const ua = navigator.userAgent || (window as any).opera;
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      ua.toLowerCase(),
    );
  }

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
        globalWindow.ChatRoomSendLocal(
          CRABS_Base.translate("base.chat.person_not_found"),
        );
      }
    }
  }

  public async copyToClipboard(data: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(data);
      if (CRABS_Base.notifyDelegate) {
        CRABS_Base.notifyDelegate(
          CRABS_Base.translate("notifications.clipboard.copied", { data }),
        );
      }
    } catch (error) {
      console.error("Copy to clipboard failed", error);
    }
  }

  public closeElement(elementId: string): void {
    if (elementId) {
      const existing = document.getElementById(elementId);
      if (existing) existing.remove();
    }
  }

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
      () => {
        if (CRABS_Base.onHelpRequested) {
          CRABS_Base.onHelpRequested();
        } else {
          this.fakePlayerCommand("help");
        }
      },
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
      const helpIconHtml = CRABS_Base.iconRenderer
        ? CRABS_Base.iconRenderer(
            "help",
            CRABS_Base.translate("base.tooltips.help"),
          )
        : "";
      const settingsIconHtml = CRABS_Base.iconRenderer
        ? CRABS_Base.iconRenderer(
            "settings",
            CRABS_Base.translate("base.tooltips.settings"),
          )
        : "";

      template = wrappertemplate
        .replace("{{Help}}", helpIconHtml)
        .replace("{{Settings}}", settingsIconHtml)
        .replace("{{content}}", template);

      if (wrapperArgs) {
        for (const [key, value] of Object.entries(wrapperArgs)) {
          regularExpression = new RegExp(`{{${key}}}`, "g");
          template = template.replace(regularExpression, value);
        }
      }

      template = template.replace(/\{\{t:([a-zA-Z0-9_.]+)\}\}/g, (_, key) =>
        this.t(key),
      );
    }

    return template;
  }

  /**
   * Check if player is on a map view
   *
   * @returns {boolean} True if player is on a map
   */
  public isMap(): boolean {
    const globalWindow = window as any;
    const isMap =
      typeof globalWindow.ChatRoomMapViewIsActive === "function" &&
      globalWindow.ChatRoomMapViewIsActive();
    if (isMap) return true;
    return false;
  }

  /**
   * Drops one or all keys currently held by the player in map mode.
   *
   * @param {"bronze" | "silver" | "gold" | "all"} target - The key to drop or "all".
   * @returns {boolean} True if at least one key was dropped.
   */
  public dropMapKey(target: "bronze" | "silver" | "gold" | "all"): boolean {
    const globalWindow = window as any;
    const player = globalWindow.Player;

    if (!this.isMap()) {
      if (typeof globalWindow.ChatRoomSendLocal === "function") {
        globalWindow.ChatRoomSendLocal(this.t("dropkeys_not_map"));
      }
      return false;
    }

    const pState = player?.MapData?.PrivateState;
    if (!pState) return false;

    let droppedAny = false;

    const tryDrop = (
      keyProp: "HasKeyBronze" | "HasKeySilver" | "HasKeyGold",
      colorKey: string,
    ) => {
      if (pState[keyProp]) {
        pState[keyProp] = false;
        droppedAny = true;
        if (typeof globalWindow.ChatRoomSendLocal === "function") {
          globalWindow.ChatRoomSendLocal(
            this.t("dropkeys_dropped", { color: this.t(`keys.${colorKey}`) }),
          );
        }
      }
    };

    if (target === "bronze" || target === "all")
      tryDrop("HasKeyBronze", "bronze");
    if (target === "silver" || target === "all")
      tryDrop("HasKeySilver", "silver");
    if (target === "gold" || target === "all") tryDrop("HasKeyGold", "gold");

    return droppedAny;
  }

  protected convertColor(hex: string, alpha: number = 0): string {
    hex = hex.replace(/^#/, "");
    const red = parseInt(hex.slice(0, 2), 16);
    const green = parseInt(hex.slice(2, 4), 16);
    const blue = parseInt(hex.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  protected getColorBrightness(color: string): number {
    if (!color) return 255;
    if (CRABS_Base.colorBrightnessCache.has(color))
      return CRABS_Base.colorBrightnessCache.get(color)!;
    if (!CRABS_Base.canvasContext) return 255;

    try {
      let validColor = color.trim();
      if (/^[0-9A-F]{6}$/i.test(validColor)) {
        validColor = `#${validColor}`;
      }

      CRABS_Base.colorCanvas.width = 1;
      CRABS_Base.colorCanvas.height = 1;
      CRABS_Base.canvasContext.clearRect(0, 0, 1, 1);
      CRABS_Base.canvasContext.fillStyle = validColor;
      CRABS_Base.canvasContext.fillRect(0, 0, 1, 1);

      const data = CRABS_Base.canvasContext.getImageData(0, 0, 1, 1).data;
      const brightness = (data[0] * 299 + data[1] * 587 + data[2] * 114) / 1000;
      CRABS_Base.colorBrightnessCache.set(color, brightness);
      return brightness;
    } catch {
      CRABS_Base.colorBrightnessCache.set(color, 255);
      return 255;
    }
  }

  protected getBrightOutlineColor(color: string): string {
    if (!CRABS_Base.canvasContext) return "rgba(255,255,255,0.8)";

    try {
      let validColor = color.trim();
      if (/^[0-9A-F]{6}$/i.test(validColor)) {
        validColor = `#${validColor}`;
      }

      CRABS_Base.colorCanvas.width = 1;
      CRABS_Base.colorCanvas.height = 1;
      CRABS_Base.canvasContext.clearRect(0, 0, 1, 1);
      CRABS_Base.canvasContext.fillStyle = validColor;
      CRABS_Base.canvasContext.fillRect(0, 0, 1, 1);

      const data = CRABS_Base.canvasContext.getImageData(0, 0, 1, 1).data;
      let r = data[0],
        g = data[1],
        b = data[2];

      if (r < 30 && g < 30 && b < 30) {
        return "rgba(200, 200, 200, 0.9)";
      }

      const max = Math.max(r, g, b) || 1;
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
}
