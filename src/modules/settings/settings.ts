/**
 * CRABS Settings Controller
 *
 * Configuration state management, multi-account localStorage persistence,
 * server account extension synchronization, import/export encoders,
 * and preference subscreen registration.
 *
 * @module settings
 */

import { CRABS_Base, setLanguageOverride, Drawer } from "../base";
import { Notification } from "../notifications/notifications";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import {
  CheckboxWidget,
  InputWidget,
  ButtonWidget,
  TextLabelWidget,
  TextAreaWidget,
  SelectWidget,
} from "./widgets";
import { LayoutEngine } from "./layout";

import locales from "./i18n.json";

/**
 * Baseline default values for all persisted CRABS mod preferences.
 */
const DEFAULT_SETTINGS: any = {
  languageOverride: "auto",
  showBanner: true,
  checkForUpdates: true,
  rosterOpensDrawer: true,
  showDrawerTab: true,
  immersiveBlind: false,
  immersiveGag: false,
  respectBcxRules: false,
  compactDrawer: true,
  closeDrawerOnWhisper: false,
  closeDrawerOnChat: false,
  enableDrawer: true,
  lockImmersive: false,
  showMapCompass: true,
  mapSuperZoom: false,
  pageFocusHover: true,
  animatedCrabsLogo: true,
  highlightMentions: true,
  customHighlightWords: "",
  highlightColor: "#FFFF00",
  enableFocusHalo: true,
  autoBeepOnLeave: true,
  whisperPlusAlwaysOn: false,
  autoBeepOnRegularWhisper: false,
  autoScrollRoster: true,
  chatLogHover: true,
  colorMatchNames: true,
  capitalizeNames: true,
  browserNotifications: false,
  ignorePhrases: "",
  localOnlyMode: false,
  lastSaved: 0,
  enablePerformanceMode: false,
  normalizeFontOnHover: true,
};

const IMMERSION_SETTINGS: readonly string[] = [
  "lockImmersive",
  "immersiveBlind",
  "immersiveGag",
  "respectBcxRules",
];

/**
 * Settings and configuration controller for CRABS.
 *
 * Manages player-specific configuration dictionaries, handles two-way
 * synchronization between localStorage and Bondage Club account extension settings,
 * enforces cloud payload size budgets, and registers the custom settings GUI
 * into the game's native Preference screen.
 */
export class Settings extends CRABS_Base {
  public static instance: Settings;
  public static onLanguageChanged?: (newLang: string) => void;

  /** Active configuration state dictionary. */
  public data: any;

  /** Maximum allowed byte length for cloud synchronization payloads. */
  private readonly MAX_SERVER_PAYLOAD = 8000;

  /** Layout engine coordinating setting tabs, widgets, and scroll states. */
  private layout: LayoutEngine;

  /** Array of instantiated and categorized settings widgets. */
  private registry: ConfiguredWidget[] = [];

  /** Indicates whether the CRABS preference subscreen is currently open. */
  private isMenuOpen: boolean = false;

  /** Controls display of the modal reset confirmation prompt. */
  private showResetConfirm: boolean = false;

  /** Root key used for localStorage persistence. */
  private readonly STORAGE_KEY = "CRABS_Settings";

  /**
   * Initializes the settings module, loads local settings, triggers cloud
   * synchronization, hooks account login events, registers the canvas GUI,
   * and binds mousewheel scroll listeners.
   *
   * @param CRABS - Instantiated ModSDK API bridge.
   */
  constructor(CRABS: ModSDKModAPI) {
    super(CRABS, "settings", locales);
    Settings.instance = this;

    this.data = this.loadLocal();
    (window as any).CRABS_Settings = this.data;
    setLanguageOverride(this.data.languageOverride);

    this.syncFromServer();

    this.CRABS.hookFunction("LoginResponse", 0, (args, next) => {
      const result = next(args);
      this.data = this.loadLocal();
      (window as any).CRABS_Settings = this.data; // <--- ADD THIS
      setLanguageOverride(this.data.languageOverride);
      this.syncFromServer();
      return result;
    });

    this.buildRegistry();
    this.layout = new LayoutEngine(this.registry);

    this.registerExtension();
    window.addEventListener("wheel", this.handleWheel.bind(this), {
      passive: false,
    });
  }

  /**
   * Generates a storage key scoped to the logged-in player's member number
   * to support multiple accounts on the same browser.
   *
   * @private
   * @returns Scoped localStorage key.
   */
  private getStorageKey(): string {
    const memberNumber = (window as any).Player?.MemberNumber;
    return memberNumber
      ? `${this.STORAGE_KEY}_${memberNumber}`
      : this.STORAGE_KEY;
  }

  /**
   * Loads and sanitizes configuration data from localStorage.
   *
   * @private
   * @returns Cleaned settings object or default values if uninitialized.
   */
  private loadLocal(): any {
    const saved = localStorage.getItem(this.getStorageKey());
    return saved
      ? this.sanitizeData(JSON.parse(saved))
      : { ...DEFAULT_SETTINGS };
  }

  /**
   * Calculates the JSON-serialized byte length of settings that deviate
   * from default values for cloud storage budget tracking.
   *
   * @private
   * @returns Serialized cloud payload character count.
   */
  private getCloudPayloadSize(): number {
    if (this.data.localOnlyMode) return 0;

    const serverPayload: any = { lastSaved: this.data.lastSaved || Date.now() };

    for (const key of Object.keys(this.data)) {
      if (key === "lastSaved") continue;

      if (this.data[key] !== DEFAULT_SETTINGS[key] && this.data[key] !== "") {
        serverPayload[key] = this.data[key];
      }
    }

    return JSON.stringify(serverPayload).length;
  }

  /**
   * Synchronizes settings from the native player extension storage if cloud
   * data is newer than local timestamps and local-only mode is disabled.
   *
   * @private
   */
  private async syncFromServer(): Promise<void> {
    if (this.data.localOnlyMode) return;

    try {
      const globalWindow = window as any;
      const player = globalWindow.Player;

      if (
        !player ||
        !player.ExtensionSettings ||
        !player.ExtensionSettings.CRABS
      ) {
        return;
      }

      const rawServerData = player.ExtensionSettings.CRABS;
      let serverData = null;

      if (typeof rawServerData === "string") {
        serverData = JSON.parse(rawServerData);
      } else if (typeof rawServerData === "object") {
        serverData = rawServerData;
      }

      if (serverData) {
        const serverTime = serverData.lastSaved || 0;
        const localTime = this.data.lastSaved || 0;

        if (serverTime > localTime) {
          const mergedData = { ...DEFAULT_SETTINGS, ...serverData };
          mergedData.localOnlyMode = this.data.localOnlyMode;

          this.data = this.sanitizeData(mergedData);
          (window as any).CRABS_Settings = this.data;
          setLanguageOverride(this.data.languageOverride);

          localStorage.setItem(this.getStorageKey(), JSON.stringify(this.data));

          if (this.layout) this.layout.updateDOM(this.isMenuOpen);
        }
      }
    } catch (e) {
      console.warn("CRABS: Failed to parse sync settings from server", e);
    }
  }

  /**
   * Splits and validates delimited string lists (e.g. keywords, ignore phrases)
   * against item length constraints.
   *
   * @private
   * @param raw - Delimited raw string input.
   * @param delimiter - Separator character or sequence.
   * @param maxItemLength - Maximum permitted characters per entry.
   * @returns Parsed valid items and an indicator if oversized entries were removed.
   */
  private sanitizeList(
    raw: string,
    delimiter: string,
    maxItemLength: number,
  ): { items: string[]; dropped: boolean } {
    if (!raw) return { items: [], dropped: false };

    const original = raw
      .split(delimiter)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const valid = original.filter((item) => item.length <= maxItemLength);

    return {
      items: valid,
      dropped: original.length > valid.length,
    };
  }

  /**
   * Persists active settings to localStorage and synchronizes non-default
   * settings to the game account server within payload size limits.
   */
  public save(): void {
    this.data.lastSaved = Date.now();
    (window as any).CRABS_Settings = this.data;
    localStorage.setItem(this.getStorageKey(), JSON.stringify(this.data));

    if (this.data.localOnlyMode) return;

    const serverPayload: any = { lastSaved: this.data.lastSaved };

    const wordsData = this.sanitizeList(
      this.data.customHighlightWords,
      ",",
      60,
    );
    const phrasesData = this.sanitizeList(this.data.ignorePhrases, "\n", 250);

    let words = wordsData.items;
    let phrases = phrasesData.items;
    const hadInvalidItems = wordsData.dropped || phrasesData.dropped;

    let hitCapacityLimit = false;

    for (const key of Object.keys(this.data)) {
      if (
        key === "lastSaved" ||
        key === "customHighlightWords" ||
        key === "ignorePhrases"
      )
        continue;
      if (this.data[key] !== DEFAULT_SETTINGS[key] && this.data[key] !== "") {
        serverPayload[key] = this.data[key];
      }
    }

    while (true) {
      const testWords = words.join(",");
      const testPhrases = phrases.join("\n");

      if (testWords && testWords !== DEFAULT_SETTINGS.customHighlightWords) {
        serverPayload.customHighlightWords = testWords;
      } else {
        delete serverPayload.customHighlightWords;
      }

      if (testPhrases && testPhrases !== DEFAULT_SETTINGS.ignorePhrases) {
        serverPayload.ignorePhrases = testPhrases;
      } else {
        delete serverPayload.ignorePhrases;
      }

      const payloadSize = JSON.stringify(serverPayload).length;
      if (payloadSize <= this.MAX_SERVER_PAYLOAD) break;

      hitCapacityLimit = true;

      if (words.length > 0 && phrases.length > 0) {
        if (testWords.length > testPhrases.length) words.pop();
        else phrases.pop();
      } else if (words.length > 0) {
        words.pop();
      } else if (phrases.length > 0) {
        phrases.pop();
      } else {
        break;
      }
    }

    const globalWindow = window as any;
    const player = globalWindow.Player;

    if (player) {
      if (!player.ExtensionSettings) player.ExtensionSettings = {};
      player.ExtensionSettings.CRABS = JSON.stringify(serverPayload);

      if (
        typeof globalWindow.ServerPlayerExtensionSettingsSync === "function"
      ) {
        globalWindow.ServerPlayerExtensionSettingsSync("CRABS");
      }
    }

    if (hitCapacityLimit && hadInvalidItems) {
      Notification.send({
        message: this.t("settings.notifications.cloud_both_limit"),
        title: "CRABS Storage",
      });
    } else if (hitCapacityLimit) {
      Notification.send({
        message: this.t("settings.notifications.cloud_capacity_limit"),
        title: "CRABS Storage",
      });
    } else if (hadInvalidItems) {
      Notification.send({
        message: this.t("settings.notifications.cloud_invalid_items"),
        title: "CRABS Storage",
      });
    }
  }

  /**
   * Clears mod extension configuration data stored on the game server
   * and switches the active profile into local-only mode.
   *
   * @private
   */
  private deleteServerData(): void {
    const globalWindow = window as any;

    try {
      const player = globalWindow.Player;

      if (player) {
        if (!player.ExtensionSettings) player.ExtensionSettings = {};
        player.ExtensionSettings.CRABS = "";

        if (
          typeof globalWindow.ServerPlayerExtensionSettingsSync === "function"
        ) {
          globalWindow.ServerPlayerExtensionSettingsSync("CRABS");
        } else if (
          typeof globalWindow.ServerAccountUpdate?.QueueData === "function"
        ) {
          globalWindow.ServerAccountUpdate.QueueData(
            {
              ExtensionSettings: player.ExtensionSettings,
            },
            true,
          );
        }
      }

      this.data.localOnlyMode = true;
      localStorage.setItem(this.getStorageKey(), JSON.stringify(this.data));
      this.layout.updateDOM(this.isMenuOpen);

      Notification.send({
        message: this.t("settings.notifications.server_cleared"),
      });
    } catch (e: any) {
      console.error("Failed to delete server data", e);
      const errorMessage = e instanceof Error ? e.message : "Unknown error";
      Notification.send({
        message: this.t("settings.notifications.server_clear_failed", {
          error: errorMessage,
        }),
        title: "CRABS Error",
      });
    }
  }

  /**
   * Filters unrecognized keys and ensures schema conformity against defaults.
   *
   * @private
   * @param loadedData - Raw parsed configuration object.
   * @returns Cleaned settings object containing only registered keys.
   */
  private sanitizeData(loadedData: any): any {
    const cleanData: any = { ...DEFAULT_SETTINGS };

    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (loadedData.hasOwnProperty(key)) {
        cleanData[key] = loadedData[key];
      }
    }

    if (loadedData.lastSaved) {
      cleanData.lastSaved = loadedData.lastSaved;
    }

    return cleanData;
  }

  /**
   * Encodes active configuration into a Base64 string and writes it to the clipboard.
   *
   * @private
   */
  private exportConfig(): void {
    try {
      const str = JSON.stringify(this.data);
      const encoded = btoa(str);
      navigator.clipboard.writeText(encoded);

      Notification.send({
        message: this.t("settings.notifications.config_exported"),
      });
    } catch (e) {
      console.error("Export failed", e);
      Notification.send({
        message: this.t("settings.notifications.export_failed"),
        title: "CRABS Error",
      });
    }
  }

  /**
   * Prompts the user for a Base64 encoded configuration string, decodes it,
   * validates its structure, and updates active settings.
   *
   * @private
   */
  private importConfig(): void {
    const globalWindow = window as any;

    try {
      const text = globalWindow.prompt(
        this.t("settings.notifications.import_prompt"),
        "",
      );

      if (!text) return;

      const decoded = atob(text);
      const imported = JSON.parse(decoded);

      if (typeof imported === "object" && "showBanner" in imported) {
        imported.lastSaved = Date.now();
        this.data = this.sanitizeData(imported);
        setLanguageOverride(this.data.languageOverride);
        this.save();
        this.layout.updateDOM(this.isMenuOpen);

        Notification.send({
          message: this.t("settings.notifications.import_success"),
        });
      } else {
        Notification.send({
          message: this.t("settings.notifications.import_unrecognized"),
          title: "CRABS Error",
        });
      }
    } catch (e) {
      console.error("Import failed", e);
      Notification.send({
        message: this.t("settings.notifications.import_invalid"),
        title: "CRABS Error",
      });
    }
  }

  /**
   * Checks whether the player character is currently bound or restrained.
   *
   * @private
   * @returns True if restrained.
   */
  private isRestricted(): boolean {
    return (window as any).Player?.IsRestrained?.() || false;
  }

  /**
   * Assembles and registers all settings widgets into categorized tab collections.
   *
   * @private
   */
  private buildRegistry(): void {
    const isDrawerDisabled = () => !this.data.enableDrawer;

    const hardcoreLock = (settingName: string) => {
      return (
        this.isRestricted() &&
        this.data.lockImmersive &&
        (settingName === "lockImmersive" || this.data[settingName])
      );
    };

    const createCheck = (
      cat: ComponentCategory,
      setting: string,
      labelKey: string | (() => string),
      hintKey: string | (() => string),
      indent = 0,
      extraDisable?: () => boolean,
      onChange?: (val: boolean) => void,
    ) => {
      const isDisabled = () =>
        (cat === "Immersion" && hardcoreLock(setting)) ||
        (extraDisable ? extraDisable() : false);

      const getVal = () => this.data[setting];
      const setVal = (val: boolean) => {
        this.data[setting] = val;
        if (onChange) onChange(val);
        this.save();
      };

      const getLabel =
        typeof labelKey === "function" ? labelKey : () => this.t(labelKey);
      const getHint =
        typeof hintKey === "function" ? hintKey : () => this.t(hintKey);

      this.registry.push({
        category: cat,
        indent,
        widget: new CheckboxWidget(
          getLabel,
          getHint,
          isDisabled,
          getVal,
          setVal,
        ),
      });
    };

    const createSelect = (
      cat: ComponentCategory,
      setting: string,
      labelKey: string,
      hintKey: string,
      getOptions: () => { value: string; text: string }[],
      indent = 0,
      extraDisable?: () => boolean,
      onChange?: (val: string) => void,
    ) => {
      const isDisabled = () => (extraDisable ? extraDisable() : false);
      const getVal = () => this.data[setting];
      const setVal = (val: string) => {
        this.data[setting] = val;
        if (onChange) onChange(val);
        this.save();
      };

      this.registry.push({
        category: cat,
        indent,
        widget: new SelectWidget(
          () => this.t(labelKey),
          () => this.t(hintKey),
          isDisabled,
          `CRABS_Select_${setting}`,
          getOptions,
          getVal,
          setVal,
        ),
      });
    };

    const createInput = (
      cat: ComponentCategory,
      setting: string,
      labelKey: string,
      hintKey: string,
      inputType: "text" | "color",
      indent = 0,
      extraDisable?: () => boolean,
    ) => {
      const isDisabled = () => (extraDisable ? extraDisable() : false);
      const getVal = () => this.data[setting];
      const setVal = (val: string) => {
        this.data[setting] = val;
        this.save();
      };

      this.registry.push({
        category: cat,
        indent,
        widget: new InputWidget(
          () => this.t(labelKey),
          () => this.t(hintKey),
          isDisabled,
          `CRABS_Input_${setting}`,
          inputType,
          getVal,
          setVal,
        ),
      });
    };

    const createTextArea = (
      cat: ComponentCategory,
      setting: string,
      labelKey: string,
      hintKey: string,
      indent = 0,
      extraDisable?: () => boolean,
    ) => {
      const isDisabled = () => (extraDisable ? extraDisable() : false);
      const getVal = () => this.data[setting];
      const setVal = (val: string) => {
        this.data[setting] = val;
        this.save();
      };

      this.registry.push({
        category: cat,
        indent,
        widget: new TextAreaWidget(
          () => this.t(labelKey),
          () => this.t(hintKey),
          isDisabled,
          `CRABS_Input_${setting}`,
          getVal,
          setVal,
        ),
      });
    };

    const createButton = (
      cat: ComponentCategory,
      labelKey: string,
      hintKey: string,
      onClick: () => void,
      indent = 0,
    ) => {
      this.registry.push({
        category: cat,
        indent,
        widget: new ButtonWidget(
          () => this.t(labelKey),
          () => this.t(hintKey),
          onClick,
        ),
      });
    };

    const getBindString = (bindId: string) => {
      const globalWindow = window as any;
      const bind = globalWindow.KeyManager?.getKeybinding(bindId);

      if (!bind || !bind.keyCombo) return this.t("settings.general.unbound");

      const mods = Array.from(bind.keyCombo.modifiers || []).join("+");
      let keyText = "";

      if (bind.keyCombo.key) {
        if (
          globalWindow.KeybindingManager &&
          globalWindow.KeybindingManager.ASCIIKeyboardMap
        ) {
          keyText =
            globalWindow.KeybindingManager.ASCIIKeyboardMap[bind.keyCombo.key];
        }
        if (!keyText) {
          keyText = bind.keyCombo.key.replace("Key", "").replace("Digit", "");
        }
      } else if (bind.keyCombo.char) {
        keyText = bind.keyCombo.char.toUpperCase();
      }

      if (!keyText && !mods) return this.t("settings.general.unbound");
      return mods && keyText ? `${mods}+${keyText}` : mods || keyText;
    };

    const createLabel = (
      cat: ComponentCategory,
      text: string | (() => string),
      hint: string | (() => string) = "",
      indent = 0,
    ) => {
      this.registry.push({
        category: cat,
        indent,
        widget: new TextLabelWidget(text, hint),
      });
    };

    // --- GENERAL ---
    createSelect(
      "General",
      "languageOverride",
      "settings.general.language_label",
      "settings.general.language_hint",
      () => [
        { value: "auto", text: `🌐 ${this.t("settings.language.auto")}` },
        { value: "en", text: `🇬🇧 ${this.t("settings.language.en")}` },
        { value: "de", text: `🇩🇪 ${this.t("settings.language.de")}` },
        { value: "fr", text: `🇫🇷 ${this.t("settings.language.fr")}` },
        { value: "ru", text: `🇷🇺 ${this.t("settings.language.ru")}` },
        { value: "cn", text: `🇨🇳 ${this.t("settings.language.cn")}` },
        { value: "tw", text: `🇹🇼 ${this.t("settings.language.tw")}` },
        { value: "uk", text: `🇺🇦 ${this.t("settings.language.uk")}` },
      ],
      0,
      undefined,
      (val) => {
        setLanguageOverride(val);
        this.layout.updateDOM(this.isMenuOpen);

        // Redraw banner via subscriber if attached
        Settings.onLanguageChanged?.(val);
      },
    );
    createCheck(
      "General",
      "checkForUpdates",
      "settings.general.check_updates_label",
      "settings.general.check_updates_hint",
    );
    createCheck(
      "General",
      "enablePerformanceMode",
      "settings.general.perf_mode_label",
      "settings.general.perf_mode_hint",
    );
    createCheck(
      "General",
      "showBanner",
      "settings.general.banner_label",
      "settings.general.banner_hint",
    );
    createCheck(
      "General",
      "enableFocusHalo",
      "settings.general.halo_label",
      "settings.general.halo_hint",
    );
    createButton(
      "General",
      "settings.general.edit_keybinds_label",
      "settings.general.edit_keybinds_hint",
      () => this.openNativeKeybindings(),
    );
    createLabel(
      "General",
      () =>
        this.t("settings.general.drawer_toggle_bind", {
          bind: getBindString("crabs_drawer_toggle"),
        }),
      "",
      1,
    );
    createLabel(
      "General",
      () =>
        this.t("settings.general.privacy_half_bind", {
          bind: getBindString("crabs_privacy_half"),
        }),
      "",
      1,
    );
    createLabel(
      "General",
      () =>
        this.t("settings.general.privacy_full_bind", {
          bind: getBindString("crabs_privacy_full"),
        }),
      "",
      1,
    );

    // --- DRAWER ---
    createCheck(
      "Drawer",
      "enableDrawer",
      "settings.drawer.enable_label",
      "settings.drawer.enable_hint",
      0,
      undefined,
      (enabled) => {
        if (!enabled) {
          this.data.rosterOpensDrawer = false;
          this.data.showDrawerTab = false;
        }
      },
    );
    createCheck(
      "Drawer",
      "rosterOpensDrawer",
      "settings.drawer.roster_cmd_label",
      "settings.drawer.roster_cmd_hint",
      1,
      isDrawerDisabled,
      (enabled) => {
        if (!enabled) this.data.showDrawerTab = true;
      },
    );
    createCheck(
      "Drawer",
      "showDrawerTab",
      "settings.drawer.tab_label",
      "settings.drawer.tab_hint",
      2,
      () => isDrawerDisabled() || !this.data.rosterOpensDrawer,
      (enabled) => {
        if (!enabled) this.data.animatedCrabsLogo = false;
      },
    );
    createCheck(
      "Drawer",
      "animatedCrabsLogo",
      "settings.drawer.animated_logo_label",
      "settings.drawer.animated_logo_hint",
      3,
      () => isDrawerDisabled() || !this.data.showDrawerTab,
    );
    createCheck(
      "Drawer",
      "compactDrawer",
      "settings.drawer.compact_label",
      "settings.drawer.compact_hint",
      1,
      isDrawerDisabled,
      () => {
        Drawer.updateVisibility();
      },
    );
    createCheck(
      "Drawer",
      "closeDrawerOnWhisper",
      "settings.drawer.close_whisper_label",
      "settings.drawer.close_whisper_hint",
      1,
      isDrawerDisabled,
    );
    createCheck(
      "Drawer",
      "closeDrawerOnChat",
      "settings.drawer.close_chat_label",
      "settings.drawer.close_chat_hint",
      1,
      isDrawerDisabled,
    );
    createCheck(
      "Drawer",
      "pageFocusHover",
      "settings.drawer.focus_hover_label",
      "settings.drawer.focus_hover_hint",
      1,
      isDrawerDisabled,
    );
    createCheck(
      "Drawer",
      "autoScrollRoster",
      "settings.drawer.auto_scroll_label",
      "settings.drawer.auto_scroll_hint",
      1,
      isDrawerDisabled,
    );

    // --- IMMERSION ---
    createCheck(
      "Immersion",
      "lockImmersive",
      "settings.immersion.lock_label",
      "settings.immersion.lock_hint",
    );
    createCheck(
      "Immersion",
      "immersiveBlind",
      "settings.immersion.blind_label",
      "settings.immersion.blind_hint",
      1,
    );
    createCheck(
      "Immersion",
      "immersiveGag",
      "settings.immersion.gag_label",
      "settings.immersion.gag_hint",
      1,
    );
    createCheck(
      "Immersion",
      "respectBcxRules",
      "settings.immersion.bcx_label",
      "settings.immersion.bcx_hint",
      1,
    );

    // --- MAPS ---
    createCheck(
      "Maps",
      "showMapCompass",
      () => {
        const base = this.t("settings.maps.compass_label");
        return this.isCompassBlocked()
          ? `${base} [Disabled by room admin]`
          : base;
      },
      () => {
        return this.isCompassBlocked()
          ? "Disabled: Room administrator has prohibited location and compass sharing."
          : this.t("settings.maps.compass_hint");
      },
      0,
      () => this.isCompassBlocked(),
    );
    createCheck(
      "Maps",
      "mapSuperZoom",
      "settings.maps.superzoom_label",
      "settings.maps.superzoom_hint",
      0,
      () => {
        const perceptionValue = (window as any)
          .ChatRoomMapViewPerceptionRangeMax;
        return (
          perceptionValue !== undefined &&
          perceptionValue !== 7 &&
          perceptionValue !== 50
        );
      },
      (_enabled) => {
        this.syncGameState();
      },
    );

    // --- CHAT ---
    createCheck(
      "Chat",
      "highlightMentions",
      "settings.chat.mentions_label",
      "settings.chat.mentions_hint",
    );
    createCheck(
      "Chat",
      "browserNotifications",
      "settings.chat.notifications_label",
      "settings.chat.notifications_hint",
      1,
      () => !this.data.highlightMentions,
      (enabled) => {
        if (
          enabled &&
          "Notification" in window &&
          window.Notification.permission !== "granted"
        ) {
          window.Notification.requestPermission().then(
            (permission: NotificationPermission) => {
              if (permission !== "granted") {
                this.data.browserNotifications = false;
                this.save();
              }
            },
          );
        }
      },
    );
    createCheck(
      "Chat",
      "capitalizeNames",
      "settings.chat.caps_label",
      "settings.chat.caps_hint",
      1,
      () => !this.data.highlightMentions,
    );
    createCheck(
      "Chat",
      "colorMatchNames",
      "settings.chat.color_match_label",
      "settings.chat.color_match_hint",
      1,
      () => !this.data.highlightMentions,
    );
    createInput(
      "Chat",
      "customHighlightWords",
      "settings.chat.custom_words_label",
      "settings.chat.custom_words_hint",
      "text",
      1,
      () => !this.data.highlightMentions,
    );
    createTextArea(
      "Chat",
      "ignorePhrases",
      "settings.chat.ignore_phrases_label",
      "settings.chat.ignore_phrases_hint",
      1,
      () => !this.data.highlightMentions,
    );
    createInput(
      "Chat",
      "highlightColor",
      "settings.chat.highlight_color_label",
      "settings.chat.highlight_color_hint",
      "color",
      1,
      () => !this.data.highlightMentions,
    );
    createCheck(
      "Chat",
      "autoBeepOnLeave",
      "settings.chat.auto_beep_label",
      "settings.chat.auto_beep_hint",
    );
    createCheck(
      "Chat",
      "whisperPlusAlwaysOn",
      "settings.chat.whisper_plus_always_on_label",
      "settings.chat.whisper_plus_always_on_hint",
      0,
      undefined,
      (enabled) => {
        if (enabled && this.data.autoBeepOnRegularWhisper) {
          this.data.autoBeepOnRegularWhisper = false;
        }
        this.layout.updateDOM(this.isMenuOpen);
      },
    );
    createCheck(
      "Chat",
      "autoBeepOnRegularWhisper",
      "settings.chat.auto_beep_regular_whisper_label",
      "settings.chat.auto_beep_regular_whisper_hint",
      0,
      () => this.data.whisperPlusAlwaysOn,
      (enabled) => {
        if (enabled && this.data.whisperPlusAlwaysOn) {
          this.data.whisperPlusAlwaysOn = false;
        }
        this.layout.updateDOM(this.isMenuOpen);
      },
    );
    createCheck(
      "Chat",
      "chatLogHover",
      "settings.chat.hover_links_label",
      "settings.chat.hover_links_hint",
    );
    createCheck(
      "Chat",
      "normalizeFontOnHover",
      "settings.chat.normalize_font_label",
      "settings.chat.normalize_font_hint",
    );

    // --- CONFIG MANAGEMENT ---
    createCheck(
      "Config",
      "localOnlyMode",
      "settings.config.local_only_label",
      "settings.config.local_only_hint",
    );
    createLabel(
      "Config",
      () => {
        if (this.data.localOnlyMode)
          return this.t("settings.config.cloud_disabled");

        const size = this.getCloudPayloadSize();
        const limit = this.MAX_SERVER_PAYLOAD || 8000;
        const percent = Math.max(
          0,
          Math.min(100, Math.round((size / limit) * 100)),
        );

        let status = "🟢";
        if (size > limit) status = this.t("settings.config.status_truncate");
        else if (percent > 85)
          status = this.t("settings.config.status_nearing");

        return this.t("settings.config.cloud_status", {
          size,
          limit,
          percent,
          status,
        });
      },
      () => this.t("settings.config.cloud_hint"),
      1,
    );
    createButton(
      "Config",
      "settings.config.delete_server_label",
      "settings.config.delete_server_hint",
      () => this.deleteServerData(),
    );
    createButton(
      "Config",
      "settings.config.export_label",
      "settings.config.export_hint",
      () => this.exportConfig(),
    );
    createButton(
      "Config",
      "settings.config.import_label",
      "settings.config.import_hint",
      () => this.importConfig(),
    );
  }

  /**
   * Handles mousewheel scrolling over the settings widget list viewport.
   *
   * @private
   * @param event - DOM mousewheel event.
   */
  private handleWheel(event: WheelEvent): void {
    if (!this.isMenuOpen) return;

    const target = event.target as HTMLElement;
    if (!target || target.id !== "MainCanvas") return;

    const globalWindow = window as any;
    if (
      globalWindow.MouseX >= 500 &&
      globalWindow.MouseX <= 1780 &&
      globalWindow.MouseY >= 180 &&
      globalWindow.MouseY <= 900
    ) {
      if (event.cancelable) event.preventDefault();
      if (event.deltaY > 0)
        this.layout.scrollOffset = Math.min(
          this.layout.maxScroll,
          this.layout.scrollOffset + 100,
        );
      else if (event.deltaY < 0)
        this.layout.scrollOffset = Math.max(0, this.layout.scrollOffset - 100);
      this.layout.updateDOM(this.isMenuOpen);
    }
  }

  /**
   * Draws the active settings subscreen canvas UI and handles the reset confirmation dialog.
   */
  public draw(): void {
    const canvasContext = (
      document.getElementById("MainCanvas") as HTMLCanvasElement
    )?.getContext("2d");
    if (!canvasContext) return;
    const globalWindow = window as any;

    canvasContext.save();
    try {
      this.layout.draw(canvasContext, this.showResetConfirm);

      if (this.showResetConfirm) {
        globalWindow.DrawRect(0, 0, 2000, 1000, "#000000AA");
        globalWindow.DrawRect(700, 350, 600, 300, "#222222");
        globalWindow.DrawEmptyRect(700, 350, 600, 300, "White");
        canvasContext.textAlign = "center";
        globalWindow.DrawText(
          this.t("settings.nav.confirm_reset_title"),
          1000,
          430,
          "White",
          "",
        );
        globalWindow.DrawButton(
          750,
          500,
          200,
          60,
          this.t("settings.nav.confirm"),
          "White",
          "",
        );
        globalWindow.DrawButton(
          1050,
          500,
          200,
          60,
          this.t("settings.nav.cancel"),
          "White",
          "",
        );
        globalWindow.DrawButton(
          1815,
          75,
          90,
          90,
          "",
          "White",
          "Icons/Exit.png",
          this.t("settings.nav.back"),
        );

        const isInChat =
          typeof ChatRoomData !== "undefined" && ChatRoomData !== null;
        globalWindow.DrawButton(
          1710,
          75,
          90,
          90,
          "",
          isInChat ? "White" : "#888888",
          "Icons/Chat.png",
          isInChat
            ? this.t("settings.nav.chat")
            : this.t("settings.nav.no_chat"),
        );
        globalWindow.DrawButton(
          1605,
          75,
          90,
          90,
          "",
          "#888888",
          "Icons/Reset.png",
          this.t("settings.nav.restore_defaults"),
        );
      }
    } finally {
      canvasContext.restore();
    }
  }

  /**
   * Handles canvas click interactions within the settings subscreen,
   * routing clicks to layout tabs, reset dialog buttons, and navigation exits.
   */
  public click(): void {
    const globalWindow = window as any;

    if (this.showResetConfirm) {
      if (globalWindow.MouseIn(750, 500, 200, 60)) {
        const isLocked =
          this.isRestricted() && Boolean(this.data.lockImmersive);

        if (isLocked) {
          // Preserve current immersion configuration
          const preservedImmersion: Record<string, any> = {};
          for (const key of IMMERSION_SETTINGS) {
            preservedImmersion[key] = this.data[key];
          }

          this.data = {
            ...JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
            ...preservedImmersion,
          };
        } else {
          this.data = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        }

        setLanguageOverride(this.data.languageOverride);
        this.save();
        this.syncGameState();

        for (const key of Object.keys(this.data)) {
          const domElement = document.getElementById(
            `CRABS_Input_${key}`,
          ) as HTMLInputElement;
          if (domElement) domElement.value = this.data[key];

          const selectEl = document.getElementById(
            `CRABS_Select_${key}`,
          ) as HTMLSelectElement;
          if (selectEl) selectEl.value = this.data[key];
        }

        this.showResetConfirm = false;
        this.layout.updateDOM(this.isMenuOpen);
      } else if (globalWindow.MouseIn(1050, 500, 200, 60)) {
        this.showResetConfirm = false;
        this.layout.updateDOM(this.isMenuOpen);
      } else if (globalWindow.MouseIn(1815, 75, 90, 90)) {
        this.showResetConfirm = false;
        this.isMenuOpen = false;
        this.layout.updateDOM(false);

        for (const key of Object.keys(this.data)) {
          globalWindow.ElementRemove?.(`CRABS_Input_${key}`);
          globalWindow.ElementRemove?.(`CRABS_Select_${key}`);
        }

        globalWindow.PreferenceMessage = "";
        globalWindow.PreferenceSubscreenExtensionsClear?.();
        globalWindow.PreferenceOpenSubscreen?.("Extensions");
      } else if (
        globalWindow.MouseIn(1710, 75, 90, 90) &&
        typeof ChatRoomData !== "undefined" &&
        ChatRoomData !== null
      ) {
        this.showResetConfirm = false;
        this.isMenuOpen = false;
        this.layout.updateDOM(false);

        for (const key of Object.keys(this.data)) {
          globalWindow.ElementRemove?.(`CRABS_Input_${key}`);
          globalWindow.ElementRemove?.(`CRABS_Select_${key}`);
        }

        globalWindow.CommonSetScreen("Online", "ChatRoom");
        globalWindow.PreferenceMessage = "";
        globalWindow.PreferenceSubscreenExtensionsClear?.();
      }
      return;
    }

    const clickedExit = globalWindow.MouseIn(1815, 75, 90, 90);
    const clickedChat =
      globalWindow.MouseIn(1710, 75, 90, 90) &&
      typeof ChatRoomData !== "undefined" &&
      ChatRoomData !== null;
    const clickedReset = globalWindow.MouseIn(1605, 75, 90, 90);

    if (clickedReset) {
      this.showResetConfirm = true;
      this.layout.updateDOM(false);
      return;
    }

    if (clickedExit || clickedChat) {
      this.isMenuOpen = false;
      this.layout.updateDOM(false);

      if (clickedChat) {
        globalWindow.CommonSetScreen("Online", "ChatRoom");
      }

      globalWindow.PreferenceSubscreenExtensionsClear?.();
      return;
    }

    if (this.layout.click(globalWindow.MouseX, globalWindow.MouseY)) {
      this.layout.updateDOM(this.isMenuOpen);
    }
  }

  /**
   * Synchronizes runtime game engine variables (e.g. map super-zoom range limits)
   * with active settings values.
   */
  public syncGameState(): void {
    const perceptionValue = (window as any).ChatRoomMapViewPerceptionRangeMax;
    if (
      perceptionValue !== undefined &&
      perceptionValue !== 7 &&
      perceptionValue !== 50
    )
      return;
    (window as any).ChatRoomMapViewPerceptionRangeMax = this.data.mapSuperZoom
      ? 50
      : 7;
  }

  /**
   * Registers CRABS into the game's preference subscreen extension registry.
   *
   * @private
   */
  private registerExtension(): void {
    const globalWindow = window as any;

    CRABS_Base.subscreenDef = {
      Identifier: "CRABS",
      ButtonText: "CRABS",
      Image: "https://sin-1337.github.io/CRABS/images/CRABS_Logo.png",
      click: () => this.click(),
      run: () => this.draw(),
      load: () => {
        this.isMenuOpen = true;
        this.showResetConfirm = false;
        this.layout.updateDOM(true);

        document
          .getElementById("preference-subscreen-hgroup")
          ?.style.setProperty("display", "none", "important");
      },
      exit: () => {
        this.isMenuOpen = false;
        this.layout.updateDOM(false);

        for (const key of Object.keys(this.data)) {
          globalWindow.ElementRemove?.(`CRABS_Input_${key}`);
          globalWindow.ElementRemove?.(`CRABS_Select_${key}`);
        }

        globalWindow.PreferenceMessage = "";
        globalWindow.PreferenceSubscreenExtensionsClear?.();
        globalWindow.PreferenceOpenSubscreen?.("Extensions");
        return false;
      },
    };

    const registerHook = () => {
      if (globalWindow.PreferenceRegisterExtensionSetting) {
        globalWindow.PreferenceRegisterExtensionSetting(
          CRABS_Base.subscreenDef,
        );
      } else {
        setTimeout(registerHook, 1000);
      }
    };
    registerHook();
  }

  /**
   * Cleans up settings subscreen DOM inputs and navigates the user directly
   * to the native Bondage Club Keybindings preference menu.
   */
  public openNativeKeybindings(): void {
    const globalWindow = window as any;

    this.isMenuOpen = false;
    this.layout.updateDOM(false);
    for (const key of Object.keys(this.data)) {
      globalWindow.ElementRemove?.(`CRABS_Input_${key}`);
      globalWindow.ElementRemove?.(`CRABS_Select_${key}`);
    }

    globalWindow.ElementRemove?.("InputSearch");
    globalWindow.PreferenceMessage = "";
    if (typeof globalWindow.PreferenceSubscreenExtensionsClear === "function") {
      globalWindow.PreferenceSubscreenExtensionsClear();
    }

    if (typeof globalWindow.PreferenceOpenSubscreen === "function") {
      globalWindow.PreferenceOpenSubscreen("Keybindings");
    } else {
      globalWindow.PreferenceSubscreen = "Keybindings";
      if (
        typeof globalWindow.PreferenceSubscreenKeybindingsLoad === "function"
      ) {
        globalWindow.PreferenceSubscreenKeybindingsLoad();
      }
    }
  }
}
