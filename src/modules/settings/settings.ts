import { CRABS_Base } from "../base";
import { Notification } from "../notifications";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import {
  CheckboxWidget,
  InputWidget,
  ButtonWidget,
  TextLabelWidget,
  TextAreaWidget,
  SelectWidget,
} from "./widgets";
import { LayoutEngine, ConfiguredWidget, ComponentCategory } from "./layout";

import en from "./i18n/en.json";

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
  privacyModeFull: false,
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

export class Settings extends CRABS_Base {
  public static instance: Settings;
  public data: any;
  private readonly MAX_SERVER_PAYLOAD = 8000;

  private layout: LayoutEngine;
  private registry: ConfiguredWidget[] = [];
  private isMenuOpen: boolean = false;
  private showResetConfirm: boolean = false;
  private readonly STORAGE_KEY = "CRABS_Settings";

  constructor(CRABS: ModSDKModAPI) {
    super(CRABS, "settings", { en });
    Settings.instance = this;

    this.data = this.loadLocal();
    CRABS_Base.setLanguageOverride(this.data.languageOverride);

    this.syncFromServer();

    this.CRABS.hookFunction("LoginResponse", 0, (args, next) => {
      const result = next(args);
      this.data = this.loadLocal();
      CRABS_Base.setLanguageOverride(this.data.languageOverride);
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

  private getStorageKey(): string {
    const memberNumber = (window as any).Player?.MemberNumber;
    return memberNumber
      ? `${this.STORAGE_KEY}_${memberNumber}`
      : this.STORAGE_KEY;
  }

  private loadLocal(): any {
    const saved = localStorage.getItem(this.getStorageKey());
    return saved
      ? this.sanitizeData(JSON.parse(saved))
      : { ...DEFAULT_SETTINGS };
  }

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
          CRABS_Base.setLanguageOverride(this.data.languageOverride);

          localStorage.setItem(this.getStorageKey(), JSON.stringify(this.data));

          if (this.layout) this.layout.updateDOM(this.isMenuOpen);
        }
      }
    } catch (e) {
      console.warn("CRABS: Failed to parse sync settings from server", e);
    }
  }

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

  public save(): void {
    this.data.lastSaved = Date.now();
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
        message: this.t("notifications.cloud_both_limit"),
        title: "CRABS Storage",
      });
    } else if (hitCapacityLimit) {
      Notification.send({
        message: this.t("notifications.cloud_capacity_limit"),
        title: "CRABS Storage",
      });
    } else if (hadInvalidItems) {
      Notification.send({
        message: this.t("notifications.cloud_invalid_items"),
        title: "CRABS Storage",
      });
    }
  }

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

      Notification.send({ message: this.t("notifications.server_cleared") });
    } catch (e: any) {
      console.error("Failed to delete server data", e);
      const errorMessage = e instanceof Error ? e.message : "Unknown error";
      Notification.send({
        message: this.t("notifications.server_clear_failed", {
          error: errorMessage,
        }),
        title: "CRABS Error",
      });
    }
  }

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

  private exportConfig(): void {
    try {
      const str = JSON.stringify(this.data);
      const encoded = btoa(str);
      navigator.clipboard.writeText(encoded);

      Notification.send({ message: this.t("notifications.config_exported") });
    } catch (e) {
      console.error("Export failed", e);
      Notification.send({
        message: this.t("notifications.export_failed"),
        title: "CRABS Error",
      });
    }
  }

  private importConfig(): void {
    const globalWindow = window as any;

    try {
      const text = globalWindow.prompt(
        this.t("notifications.import_prompt"),
        "",
      );

      if (!text) return;

      const decoded = atob(text);
      const imported = JSON.parse(decoded);

      if (typeof imported === "object" && "showBanner" in imported) {
        imported.lastSaved = Date.now();
        this.data = this.sanitizeData(imported);
        CRABS_Base.setLanguageOverride(this.data.languageOverride);
        this.save();
        this.layout.updateDOM(this.isMenuOpen);

        Notification.send({ message: this.t("notifications.import_success") });
      } else {
        Notification.send({
          message: this.t("notifications.import_unrecognized"),
          title: "CRABS Error",
        });
      }
    } catch (e) {
      console.error("Import failed", e);
      Notification.send({
        message: this.t("notifications.import_invalid"),
        title: "CRABS Error",
      });
    }
  }

  private isRestricted(): boolean {
    return (window as any).Player?.IsRestrained?.() || false;
  }

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
      labelKey: string,
      hintKey: string,
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

      this.registry.push({
        category: cat,
        indent,
        widget: new CheckboxWidget(
          () => this.t(labelKey),
          () => this.t(hintKey),
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

      if (!bind || !bind.keyCombo) return this.t("general.unbound");

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

      if (!keyText && !mods) return this.t("general.unbound");
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
      "general.language_label",
      "general.language_hint",
      () => [
        { value: "auto", text: this.t("language.auto") },
        { value: "en", text: this.t("language.en") },
        { value: "cn", text: this.t("language.cn") },
        { value: "de", text: this.t("language.de") },
        { value: "fr", text: this.t("language.fr") },
        { value: "ru", text: this.t("language.ru") },
        { value: "es", text: this.t("language.es") },
      ],
      0,
      undefined,
      (val) => {
        CRABS_Base.setLanguageOverride(val);
        this.layout.updateDOM(this.isMenuOpen);
      },
    );
    createCheck(
      "General",
      "checkForUpdates",
      "general.check_updates_label",
      "general.check_updates_hint",
    );
    createCheck(
      "General",
      "enablePerformanceMode",
      "general.perf_mode_label",
      "general.perf_mode_hint",
    );
    createCheck(
      "General",
      "showBanner",
      "general.banner_label",
      "general.banner_hint",
    );
    createCheck(
      "General",
      "privacyModeFull",
      "general.privacy_full_label",
      "general.privacy_full_hint",
    );
    createCheck(
      "General",
      "enableFocusHalo",
      "general.halo_label",
      "general.halo_hint",
    );
    createButton(
      "General",
      "general.edit_keybinds_label",
      "general.edit_keybinds_hint",
      () => this.openNativeKeybindings(),
    );
    createLabel(
      "General",
      () =>
        this.t("general.drawer_toggle_bind", {
          bind: getBindString("crabs_drawer_toggle"),
        }),
      "",
      1,
    );
    createLabel(
      "General",
      () =>
        this.t("general.privacy_toggle_bind", {
          bind: getBindString("crabs_privacy_toggle"),
        }),
      "",
      1,
    );

    // --- DRAWER ---
    createCheck(
      "Drawer",
      "enableDrawer",
      "drawer.enable_label",
      "drawer.enable_hint",
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
      "drawer.roster_cmd_label",
      "drawer.roster_cmd_hint",
      1,
      isDrawerDisabled,
      (enabled) => {
        if (!enabled) this.data.showDrawerTab = true;
      },
    );
    createCheck(
      "Drawer",
      "showDrawerTab",
      "drawer.tab_label",
      "drawer.tab_hint",
      2,
      () => isDrawerDisabled() || !this.data.rosterOpensDrawer,
      (enabled) => {
        if (!enabled) this.data.animatedCrabsLogo = false;
      },
    );
    createCheck(
      "Drawer",
      "animatedCrabsLogo",
      "drawer.animated_logo_label",
      "drawer.animated_logo_hint",
      3,
      () => isDrawerDisabled() || !this.data.showDrawerTab,
    );
    createCheck(
      "Drawer",
      "compactDrawer",
      "drawer.compact_label",
      "drawer.compact_hint",
      1,
      isDrawerDisabled,
    );
    createCheck(
      "Drawer",
      "closeDrawerOnWhisper",
      "drawer.close_whisper_label",
      "drawer.close_whisper_hint",
      1,
      isDrawerDisabled,
    );
    createCheck(
      "Drawer",
      "closeDrawerOnChat",
      "drawer.close_chat_label",
      "drawer.close_chat_hint",
      1,
      isDrawerDisabled,
    );
    createCheck(
      "Drawer",
      "pageFocusHover",
      "drawer.focus_hover_label",
      "drawer.focus_hover_hint",
      1,
      isDrawerDisabled,
    );
    createCheck(
      "Drawer",
      "autoScrollRoster",
      "drawer.auto_scroll_label",
      "drawer.auto_scroll_hint",
      1,
      isDrawerDisabled,
    );

    // --- IMMERSION ---
    createCheck(
      "Immersion",
      "lockImmersive",
      "immersion.lock_label",
      "immersion.lock_hint",
    );
    createCheck(
      "Immersion",
      "immersiveBlind",
      "immersion.blind_label",
      "immersion.blind_hint",
      1,
    );
    createCheck(
      "Immersion",
      "immersiveGag",
      "immersion.gag_label",
      "immersion.gag_hint",
      1,
    );
    createCheck(
      "Immersion",
      "respectBcxRules",
      "immersion.bcx_label",
      "immersion.bcx_hint",
      1,
    );

    // --- MAPS ---
    createCheck(
      "Maps",
      "showMapCompass",
      "maps.compass_label",
      "maps.compass_hint",
    );
    createCheck(
      "Maps",
      "mapSuperZoom",
      "maps.superzoom_label",
      "maps.superzoom_hint",
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
      "chat.mentions_label",
      "chat.mentions_hint",
    );
    createCheck(
      "Chat",
      "browserNotifications",
      "chat.notifications_label",
      "chat.notifications_hint",
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
      "chat.caps_label",
      "chat.caps_hint",
      1,
      () => !this.data.highlightMentions,
    );
    createCheck(
      "Chat",
      "colorMatchNames",
      "chat.color_match_label",
      "chat.color_match_hint",
      1,
      () => !this.data.highlightMentions,
    );
    createInput(
      "Chat",
      "customHighlightWords",
      "chat.custom_words_label",
      "chat.custom_words_hint",
      "text",
      1,
      () => !this.data.highlightMentions,
    );
    createTextArea(
      "Chat",
      "ignorePhrases",
      "chat.ignore_phrases_label",
      "chat.ignore_phrases_hint",
      1,
      () => !this.data.highlightMentions,
    );
    createInput(
      "Chat",
      "highlightColor",
      "chat.highlight_color_label",
      "chat.highlight_color_hint",
      "color",
      1,
      () => !this.data.highlightMentions,
    );
    createCheck(
      "Chat",
      "chatLogHover",
      "chat.hover_links_label",
      "chat.hover_links_hint",
    );
    createCheck(
      "Chat",
      "autoBeepOnLeave",
      "chat.auto_beep_label",
      "chat.auto_beep_hint",
    );
    createCheck(
      "Chat",
      "normalizeFontOnHover",
      "chat.normalize_font_label",
      "chat.normalize_font_hint",
    );

    // --- CONFIG MANAGEMENT ---
    createCheck(
      "Config",
      "localOnlyMode",
      "config.local_only_label",
      "config.local_only_hint",
    );
    createLabel(
      "Config",
      () => {
        if (this.data.localOnlyMode) return this.t("config.cloud_disabled");

        const size = this.getCloudPayloadSize();
        const limit = this.MAX_SERVER_PAYLOAD || 8000;
        const percent = Math.max(
          0,
          Math.min(100, Math.round((size / limit) * 100)),
        );

        let status = "🟢";
        if (size > limit) status = this.t("config.status_truncate");
        else if (percent > 85) status = this.t("config.status_nearing");

        return this.t("config.cloud_status", {
          size,
          limit,
          percent,
          status,
        });
      },
      () => this.t("config.cloud_hint"),
      1,
    );
    createButton(
      "Config",
      "config.delete_server_label",
      "config.delete_server_hint",
      () => this.deleteServerData(),
    );
    createButton("Config", "config.export_label", "config.export_hint", () =>
      this.exportConfig(),
    );
    createButton("Config", "config.import_label", "config.import_hint", () =>
      this.importConfig(),
    );
  }

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
          this.t("nav.confirm_reset_title"),
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
          this.t("nav.confirm"),
          "White",
          "",
        );
        globalWindow.DrawButton(
          1050,
          500,
          200,
          60,
          this.t("nav.cancel"),
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
          this.t("nav.back"),
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
          isInChat ? this.t("nav.chat") : this.t("nav.no_chat"),
        );
        globalWindow.DrawButton(
          1605,
          75,
          90,
          90,
          "",
          "#888888",
          "Icons/Reset.png",
          this.t("nav.restore_defaults"),
        );
      }
    } finally {
      canvasContext.restore();
    }
  }

  public click(): void {
    const globalWindow = window as any;

    if (this.showResetConfirm) {
      if (globalWindow.MouseIn(750, 500, 200, 60)) {
        this.data = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        CRABS_Base.setLanguageOverride(this.data.languageOverride);
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
