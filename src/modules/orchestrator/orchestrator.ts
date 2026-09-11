/**
 * @fileoverview CRABS Orchestrator & Lifecycle Module
 *
 * Coordinates mod bootstrap routines, cross-module UI hooks, room state synchronization,
 * banner injection timers, native screen lifecycle integrations, and the OnlineProfile
 * canvas font normalization controls within the Bondage Club ecosystem.
 *
 * @module Orchestrator
 */

import { CRABS_Base, Drawer } from "../base";
import { Settings } from "../settings";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Roster } from "../roster/roster";
import { Banner } from "../banner/banner";
import { Assets } from "../base";

import locals from "./i18n.json";

/**
 * Coordinate and dimension specifications for the Canvas Normalization button on the OnlineProfile screen.
 * Places the button at X: 1410, Y: 60, directly to the left of the mod alert/warning icon slot.
 * @constant
 */
const PROFILE_NORMALIZE_BTN = {
  x: 1410,
  y: 60,
  width: 95,
  height: 90,
} as const;

/**
 * Core orchestrator controller managing initialization hooks, global navigation event listeners,
 * UI drawer visibility states, banner rendering dispatch, and profile screen augmentations.
 *
 * @extends {CRABS_Base}
 */
export class Orchestrator extends CRABS_Base {
  /**
   * Singleton reference for global delegate calls and banner redraws.
   * @type {Orchestrator | null}
   */
  public static instance: Orchestrator | null = null;

  /**
   * Tracks the last synchronized chat room ID to prevent redundant transitions or premature banner triggers.
   * @private
   * @type {number | null}
   */
  private crabsLastRoomID: number | null = null;

  /**
   * Active reference to the Roster module for counter aggregates.
   * @private
   * @type {Roster}
   */
  private rosterModule: Roster;

  /**
   * Active reference to the Banner module for chat header banner creation.
   * @private
   * @type {Banner}
   */
  private bannerModule: Banner;

  /**
   * Active timeout handler for room banner queuing and chat log DOM readiness polling.
   * @private
   * @type {any}
   */
  private bannerTimer: any = null;

  /**
   * Constructs the Orchestrator module instance, initializes base i18n dictionaries under the "profile" namespace,
   * binds submodules, registers engine hooks, and intercepts native game exit points.
   *
   * @param {ModSDKModAPI} CRABS - The mod SDK API instance.
   * @param {Roster} roster - Active Roster module reference.
   * @param {Banner} banner - Active Banner module reference.
   */
  constructor(CRABS: ModSDKModAPI, roster: Roster, banner: Banner) {
    super(CRABS, "profile", locals);
    Orchestrator.instance = this;
    this.rosterModule = roster;
    this.bannerModule = banner;
    this.initHooks();
    this.hookNativeExit();
  }

  /**
   * Static helper allowing external submodules to trigger an immediate banner redraw.
   *
   * @returns {void}
   */
  public static redrawBanner(): void {
    Orchestrator.instance?.drawbanner(true);
  }

  /**
   * Normalizes Unicode text by converting Math Alphanumerics, Fullwidth symbols,
   * and stripping stacked Zalgo diacritical marks.
   *
   * @private
   * @param {string} text - Raw input string.
   * @returns {string} Cleaned plain text.
   */
  private normalizeProfileText(text: string): string {
    if (!text) return "";
    let cleaned = text.normalize("NFKD");
    cleaned = cleaned.replace(/\p{M}/gu, "");
    cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, "");
    return cleaned;
  }

  /**
   * Registers all core game engine hooks via ModSDK's safeHook API.
   *
   * @private
   * @returns {void}
   */
  private initHooks(): void {
    let crabsLogoImg: HTMLImageElement | null = null;
    let profileOriginalRawText: string | null = null;
    let profileIsNormalized = false;

    // Runs at Priority -10000 to guarantee it fires AFTER FUSAM/BCX but BEFORE the Base Game.
    this.safeHook(
      "ChatRoomRun",
      -10000,
      (args: any[], next: (args: any[]) => any) => {
        try {
          if (typeof ChatRoomData !== "undefined" && ChatRoomData) {
            if (!ChatRoomData.Custom) {
              ChatRoomData.Custom = { SizeMode: 0 };
            } else if (typeof ChatRoomData.Custom.SizeMode === "undefined") {
              ChatRoomData.Custom.SizeMode = 0;
            }
          }
        } catch (e) {}

        return next(args);
      },
    );

    // Auto-stow Drawer on Chat message submission unless typing a mod command
    this.safeHook("ChatRoomSendChat", 10, (args, next) => {
      const chatInput = document.getElementById(
        "InputChat",
      ) as HTMLTextAreaElement;
      const message = chatInput?.value?.toLowerCase().trim() || "";
      const result = next(args);

      if (Settings.instance?.data?.closeDrawerOnChat) {
        if (!message.startsWith("/roster") && !message.startsWith("/crabs")) {
          Drawer.close();
        }
      }
      return result;
    });

    // Hook translation event so that we can react to external language switching
    this.safeHook(
      "TranslationLoad",
      10,
      (args: any, next: (args: any[]) => any) => {
        const result = next(args);
        this.drawbanner(true);
        return result;
      },
    );

    // Authoritative room entry hook
    this.safeHook("ChatRoomSync", 10, (args, next) => {
      const result = next(args);

      if (typeof ChatRoomData !== "undefined" && ChatRoomData) {
        if (ChatRoomData.ID !== this.crabsLastRoomID) {
          this.crabsLastRoomID = ChatRoomData.ID;
          Drawer.updateVisibility();
          Settings.instance?.syncGameState();

          if (Settings.instance?.data?.showBanner) {
            this.queueBanner(ChatRoomData.ID);
          }
        }
      }
      return result;
    });

    // Handle UI Recovery when returning to ChatRoom screen
    this.safeHook("ChatRoomUpdateDisplay", 10, (args, next) => {
      const result = next(args);

      const inChatRoom =
        typeof ChatRoomData !== "undefined" &&
        ChatRoomData !== null &&
        (typeof CurrentScreen === "undefined" || CurrentScreen === "ChatRoom");

      if (inChatRoom) {
        if (ChatRoomData.ID !== this.crabsLastRoomID) {
          this.crabsLastRoomID = ChatRoomData.ID;
          Drawer.updateVisibility();
          Settings.instance?.syncGameState();

          if (Settings.instance?.data?.showBanner) {
            this.queueBanner(ChatRoomData.ID);
          }
        }

        const isFocused = (window as any).CurrentCharacter !== null;
        const drawerElement = document.getElementById("crabs-drawer");

        if (
          !isFocused &&
          drawerElement &&
          drawerElement.style.display === "none" &&
          !Settings.instance?.data?.enableDrawer
        ) {
          Drawer.updateVisibility();
        }
      } else {
        this.crabsLastRoomID = null;
      }

      return result;
    });

    // Auto-stow Drawer on Screen Change
    this.safeHook("CommonSetScreen", 0, (args, next) => {
      const result = next(args);
      Drawer.updateVisibility();
      return result;
    });

    // Auto-stow Drawer on Character Focus
    this.safeHook("ChatRoomFocusCharacter", 0, (args, next) => {
      const result = next(args);
      Drawer.updateVisibility();
      return result;
    });

    // Recover Drawer on Dialog Leave
    this.safeHook("DialogLeave", 0, (args, next) => {
      const result = next(args);
      Drawer.updateVisibility();
      return result;
    });

    // 1. Draw button directly onto HTML5 canvas inside OnlineProfileRun
    this.safeHook("OnlineProfileRun", 10, (args, next) => {
      next(args);

      const globalWin = window as any;
      if (!globalWin.InformationSheetSelection) return;

      const ctx: CanvasRenderingContext2D =
        globalWin.MainCanvas?.getContext?.("2d");
      if (!ctx) return;

      // Ensure CRABS logo is cached
      if (!crabsLogoImg) {
        crabsLogoImg = new Image();
        crabsLogoImg.crossOrigin = "anonymous";
        crabsLogoImg.src = `${(Assets as any).IMAGES.basePath}${(Assets as any).IMAGES.image.logo.file}`;
      }

      const { x, y, width, height } = PROFILE_NORMALIZE_BTN;
      const isHovered =
        typeof globalWin.MouseIn === "function" &&
        globalWin.MouseIn(x, y, width, height);

      ctx.save();

      // Rounded button background & border
      ctx.fillStyle = profileIsNormalized ? "#2e1a1a" : "#1e1e24";
      ctx.strokeStyle =
        isHovered || profileIsNormalized ? "#ff4444" : "#444444";
      ctx.lineWidth = 2;

      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 10);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
      }

      // Draw CRABS logo
      if (crabsLogoImg.complete && crabsLogoImg.naturalWidth > 0) {
        ctx.drawImage(crabsLogoImg, x + 10, y + (height - 30) / 2, 30, 30);
      }

      // Draw Aa label
      ctx.font = "bold 22px sans-serif";
      ctx.fillStyle = "#e0e0e0";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("Aa", x + 48, y + height / 2);

      ctx.restore();

      // Show native BC tooltip on hover (rendered in canvas draw order)
      if (isHovered && typeof globalWin.DrawButtonHover === "function") {
        globalWin.DrawButtonHover(
          x,
          y,
          width,
          height,
          this.t("profile.toggle_tooltip"),
        );
      }
    });

    // 2. Intercept clicks on canvas button inside OnlineProfileClick
    this.safeHook("OnlineProfileClick", 10, (args, next) => {
      const globalWin = window as any;

      if (
        typeof globalWin.MouseIn === "function" &&
        globalWin.MouseIn(
          PROFILE_NORMALIZE_BTN.x,
          PROFILE_NORMALIZE_BTN.y,
          PROFILE_NORMALIZE_BTN.width,
          PROFILE_NORMALIZE_BTN.height,
        )
      ) {
        const input = document.getElementById(
          "DescriptionInput",
        ) as HTMLTextAreaElement | null;
        const wceRichDiv = document.getElementById("bceRichOnlineProfile");
        const targetChar = globalWin.InformationSheetSelection;

        // Resolve current text source from input, WCE, or global variables
        let currentText = "";

        if (input && input.style.display !== "none") {
          currentText = input.value;
        } else if (globalWin.OnlineProfileMode === "Description") {
          currentText =
            globalWin.OnlineProfileTextDesc || (targetChar?.Description ?? "");
        } else {
          currentText =
            globalWin.OnlineProfileTextOwnersNotes ||
            (targetChar?.Ownership?.Notes ?? targetChar?.OwnerRules ?? "");
        }

        // Toggle state
        if (!profileIsNormalized) {
          profileOriginalRawText = currentText;
          currentText = this.normalizeProfileText(currentText);
          profileIsNormalized = true;
        } else {
          if (profileOriginalRawText !== null) {
            currentText = profileOriginalRawText;
          }
          profileIsNormalized = false;
        }

        // Apply to native textarea
        if (input) {
          const isReadOnly = input.hasAttribute("readonly");
          if (isReadOnly) input.removeAttribute("readonly");

          input.value = currentText;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));

          if (isReadOnly) input.setAttribute("readonly", "readonly");
        }

        // Apply to WCE's rich text preview div if active
        if (wceRichDiv) {
          wceRichDiv.textContent = currentText;
        }

        // Sync global buffers & target character sheet directly
        if (globalWin.OnlineProfileMode === "Description") {
          globalWin.OnlineProfileTextDesc = currentText;
          if (targetChar) targetChar.Description = currentText;
        } else {
          globalWin.OnlineProfileTextOwnersNotes = currentText;
          if (targetChar) {
            if (targetChar.Ownership) {
              targetChar.Ownership.Notes = currentText;
            }
            targetChar.OwnerRules = currentText;
          }
        }

        return;
      }

      return next(args);
    });

    // 3. Reset state on profile unload
    this.safeHook("OnlineProfileUnload", 10, (args, next) => {
      profileOriginalRawText = null;
      profileIsNormalized = false;
      return next(args);
    });
  }

  /**
   * Patches the global ChatRoomExit routine to ensure drawer states update properly
   * whenever a player explicitly exits or disconnects from a room.
   *
   * @private
   * @returns {void}
   */
  private hookNativeExit(): void {
    const nativeChatRoomExit = (window as any).ChatRoomExit;
    (window as any).ChatRoomExit = function () {
      if (typeof nativeChatRoomExit === "function") {
        nativeChatRoomExit();
      }
      Drawer.updateVisibility();
    };
  }

  /**
   * Queues the room banner to render, polling until the chat log DOM exists and contains
   * game-generated elements. Prevents premature injection during internal log clearing cycles.
   *
   * @private
   * @param {number} roomId - Target room ID to validate against upon timeout execution.
   * @param {number} [attempts=0] - Recursion limiter tracking retry attempts.
   * @returns {void}
   */
  private queueBanner(roomId: number, attempts: number = 0): void {
    if (this.bannerTimer) clearTimeout(this.bannerTimer);

    if (attempts > 15) return;

    this.bannerTimer = setTimeout(() => {
      if (
        typeof ChatRoomData === "undefined" ||
        !ChatRoomData ||
        ChatRoomData.ID !== roomId
      ) {
        return;
      }

      const chat = document.getElementById("TextAreaChatLog");

      if (chat && chat.children.length > 0) {
        this.drawbanner();
      } else {
        this.queueBanner(roomId, attempts + 1);
      }
    }, 200);
  }

  /**
   * Compiles current roster counts and dispatches the rendering sequence to the Banner module.
   *
   * @public
   * @param {boolean} [onlyIfPresent=false] - If true, aborts redraw if an existing banner element is not mounted.
   * @returns {boolean} True if the banner was processed and dispatched, false otherwise.
   */
  public drawbanner(onlyIfPresent: boolean = false): boolean {
    if (
      typeof ChatRoomData === "undefined" ||
      !ChatRoomData ||
      Object.keys(ChatRoomData).length === 0
    ) {
      return false;
    }

    const existing = document.getElementById("CRABS_Banner");

    if (onlyIfPresent && !existing) {
      return false;
    }

    if (existing) {
      existing.remove();
    }

    const extraData = {
      RosterCounters: this.rosterModule.buildroster("count", false),
    };
    this.bannerModule.drawBanner(extraData);
    return true;
  }
}
