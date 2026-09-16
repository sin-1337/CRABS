/**
 * @fileoverview CRABS Orchestrator & Lifecycle Module
 *
 * Coordinates mod bootstrap routines, cross-module UI hooks, room state synchronization,
 * banner injection timers, native screen lifecycle integrations, and the OnlineProfile
 * canvas font normalization controls within the Bondage Club ecosystem.
 *
 * Hardened for zero-crash stability, defensive room transition detection,
 * and vocal error reporting.
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
 * Places the button at X: 210, Y: 60, directly to the left of the mod alert/warning icon slot.
 * @constant
 */
const PROFILE_NORMALIZE_BTN = {
  x: 210,
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
   * @type {any}
   */
  private crabsLastRoomID: any = null;

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
   * Constructs the Orchestrator module instance, initializes base i18n dictionaries under the "profile" namespace,
   * binds submodules, registers engine hooks, and ensures game lifecycle exit points are active.
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
    const globalWin = window as any;

    // Cache object bound to the active character's MemberNumber to prevent cross-profile bleeding
    let profileCache: { memberNumber: number | null; rawText: string | null } =
      {
        memberNumber: null,
        rawText: null,
      };

    // Pre-load the canvas image outside the render loop to prevent asynchronous rendering failures
    let crabsLogoImg: HTMLImageElement | null = new Image();
    crabsLogoImg.crossOrigin = "anonymous";
    crabsLogoImg.onerror = () => {
      crabsLogoImg = null;
    };
    const basePath = (Assets as any)?.IMAGES?.basePath ?? "";
    const logoFile = (Assets as any)?.IMAGES?.image?.logo?.file ?? "";
    if (basePath && logoFile) {
      crabsLogoImg.src = `${basePath}${logoFile}`;
    } else {
      crabsLogoImg = null;
    }

    // Ensure target functions exist on the global scope so ModSDK can hook them without throwing
    const hooksToStub = [
      "ChatRoomExit",
      "ChatRoomRun",
      "ChatRoomSendChat",
      "TranslationLoad",
      "ChatRoomUpdateDisplay",
      "CommonSetScreen",
      "ChatRoomFocusCharacter",
      "DialogLeave",
      "OnlineProfileRun",
      "OnlineProfileClick",
      "OnlineProfileUnload",
      "ChatRoomActivateView",
    ];

    hooksToStub.forEach((name) => {
      if (typeof globalWin[name] !== "function") {
        globalWin[name] = function () {};
      }
    });

    /**
     * Patches ChatRoomExit through safeHook to ensure drawer states update properly
     * and room identifiers reset whenever a player explicitly exits a room.
     */
    this.safeHook("ChatRoomExit", 10, (args, next) => {
      this.crabsLastRoomID = null;
      const result = next(args);

      try {
        Drawer.updateVisibility();
      } catch (err) {
        console.error(
          "[CRABS Orchestrator] Drawer.updateVisibility failed on ChatRoomExit:",
          err,
        );
      }

      return result;
    });

    // Runs at Priority -10000 to guarantee it fires AFTER FUSAM/BCX but BEFORE the Base Game.
    this.safeHook(
      "ChatRoomRun",
      -10000,
      (args: any[], next: (args: any[]) => any) => {
        try {
          const win = window as any;
          const roomData = win.ChatRoomData;

          if (roomData) {
            if (!roomData.Custom) {
              roomData.Custom = { SizeMode: 0 };
            } else if (typeof roomData.Custom.SizeMode === "undefined") {
              roomData.Custom.SizeMode = 0;
            }
          }
        } catch (e) {
          console.error(
            "[CRABS Orchestrator] Error initializing ChatRoomData.Custom:",
            e,
          );
        }

        return next(args);
      },
    );

    // Auto-stow Drawer on Chat message submission unless typing a mod command
    this.safeHook("ChatRoomSendChat", 10, (args, next) => {
      const chatInput = document.getElementById(
        "InputChat",
      ) as HTMLTextAreaElement | null;
      const message = chatInput?.value?.toLowerCase().trim() || "";
      const result = next(args);

      try {
        if (Settings.instance?.data?.closeDrawerOnChat) {
          if (!message.startsWith("/roster") && !message.startsWith("/crabs")) {
            Drawer.close();
          }
        }
      } catch (e) {
        console.error(
          "[CRABS Orchestrator] Error stowing drawer on chat send:",
          e,
        );
      }
      return result;
    });

    // Hook translation event so that we can react to external language switching
    this.safeHook(
      "TranslationLoad",
      10,
      (args: any, next: (args: any[]) => any) => {
        const result = next(args);
        try {
          this.drawbanner(true);
        } catch (e) {
          console.error(
            "[CRABS Orchestrator] Error redrawing banner on TranslationLoad:",
            e,
          );
        }
        return result;
      },
    );

    // Handle Room Joins and UI Recovery
    this.safeHook("ChatRoomUpdateDisplay", 10, (args, next) => {
      const result = next(args);

      try {
        const win = window as any;
        const roomData = win.ChatRoomData;
        const currentScreen = win.CurrentScreen;

        // Resilient room detection: checks ChatRoomData, ServerPlayerIsInChatRoom, or CurrentScreen
        const inChatRoom =
          Boolean(roomData) ||
          (typeof win.ServerPlayerIsInChatRoom === "function" &&
            win.ServerPlayerIsInChatRoom()) ||
          currentScreen === "ChatRoom";

        if (inChatRoom) {
          // No static fallback: Let currentID stay undefined if data isn't ready
          const currentID =
            roomData?.ID ?? roomData?.Name ?? win.Player?.LastChatRoom;

          // Just joined a new room (only fires on true room transitions)
          if (currentID && currentID !== this.crabsLastRoomID) {
            console.log(
              `[CRABS Orchestrator] Room transition: ${this.crabsLastRoomID} -> ${currentID}`,
            );
            this.crabsLastRoomID = currentID;

            Drawer.updateVisibility();
            Settings.instance?.syncGameState();

            const showBanner = Settings.instance?.data?.showBanner ?? true;
            if (showBanner) {
              this.drawbanner();
            }
          }

          // Returned from Wardrobe/Profile
          const isFocused =
            win.CurrentCharacter !== null &&
            typeof win.CurrentCharacter !== "undefined";
          const drawerElement = document.getElementById("crabs-drawer");

          if (
            !isFocused &&
            (!drawerElement || drawerElement.style.display === "none") &&
            Settings.instance?.data?.enableDrawer !== false
          ) {
            Drawer.updateVisibility();
          }
        } else {
          if (this.crabsLastRoomID !== null) {
            this.crabsLastRoomID = null;
            Drawer.updateVisibility();
          }
        }
      } catch (err) {
        console.error(
          "[CRABS Orchestrator] Error in ChatRoomUpdateDisplay handler:",
          err,
        );
      }

      return result;
    });

    // Auto-stow Drawer on Screen Change
    this.safeHook("CommonSetScreen", 0, (args, next) => {
      const nextScreen = args[1];

      if (nextScreen !== "ChatRoom") {
        this.crabsLastRoomID = null;
      }

      const result = next(args);
      try {
        Drawer.updateVisibility();
      } catch (e) {
        console.error(
          "[CRABS Orchestrator] Error in CommonSetScreen visibility update:",
          e,
        );
      }
      return result;
    });

    // Auto-stow Drawer on Character Focus
    this.safeHook("ChatRoomFocusCharacter", 0, (args, next) => {
      const result = next(args);
      try {
        Drawer.updateVisibility();
      } catch (e) {
        console.error(
          "[CRABS Orchestrator] Error in ChatRoomFocusCharacter visibility update:",
          e,
        );
      }
      return result;
    });

    // Recover Drawer on Dialog Leave
    this.safeHook("DialogLeave", 0, (args, next) => {
      const result = next(args);
      try {
        Drawer.updateVisibility();
      } catch (e) {
        console.error(
          "[CRABS Orchestrator] Error in DialogLeave visibility update:",
          e,
        );
      }
      return result;
    });

    // 1. Draw button directly onto HTML5 canvas inside OnlineProfileRun
    this.safeHook("OnlineProfileRun", 10, (args, next) => {
      next(args);

      try {
        const win = window as any;
        const infoSheet = win.InformationSheetSelection;
        if (!infoSheet) return;

        const mainCanvas = win.MainCanvas;
        const ctx: CanvasRenderingContext2D = mainCanvas?.getContext?.("2d");
        if (!ctx) return;

        const targetMemberNumber = infoSheet.MemberNumber ?? null;
        const isCurrentlyNormalized =
          profileCache.memberNumber === targetMemberNumber &&
          profileCache.rawText !== null;

        const { x, y, width, height } = PROFILE_NORMALIZE_BTN;
        const mouseInFunc = win.MouseIn;
        const isHovered =
          typeof mouseInFunc === "function" && mouseInFunc(x, y, width, height);

        ctx.save();

        // Rounded button background & border
        ctx.fillStyle = isCurrentlyNormalized ? "#2e1a1a" : "#1e1e24";
        ctx.strokeStyle =
          isHovered || isCurrentlyNormalized ? "#ff4444" : "#444444";
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
        if (
          crabsLogoImg &&
          crabsLogoImg.complete &&
          crabsLogoImg.naturalWidth > 0
        ) {
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
        const hoverBtnFunc = win.DrawButtonHover;
        if (isHovered && typeof hoverBtnFunc === "function") {
          hoverBtnFunc(x, y, width, height, this.t("profile.toggle_tooltip"));
        }
      } catch (err) {
        console.error(
          "[CRABS Orchestrator] Error drawing normalize button:",
          err,
        );
      }
    });

    // 2. Intercept clicks on canvas button inside OnlineProfileClick
    this.safeHook("OnlineProfileClick", 10, (args, next) => {
      const win = window as any;
      const mouseInFunc = win.MouseIn;

      if (
        typeof mouseInFunc === "function" &&
        mouseInFunc(
          PROFILE_NORMALIZE_BTN.x,
          PROFILE_NORMALIZE_BTN.y,
          PROFILE_NORMALIZE_BTN.width,
          PROFILE_NORMALIZE_BTN.height,
        )
      ) {
        try {
          const input = document.getElementById(
            "DescriptionInput",
          ) as HTMLTextAreaElement | null;
          const wceRichDiv = document.getElementById("bceRichOnlineProfile");
          const targetChar = win.InformationSheetSelection;
          const profileMode = win.OnlineProfileMode;

          // Resolve current text source from input, WCE, or global variables
          let currentText = "";

          if (input && input.style.display !== "none") {
            currentText = input.value;
          } else if (profileMode === "Description") {
            currentText =
              win.OnlineProfileTextDesc ?? targetChar?.Description ?? "";
          } else {
            currentText =
              win.OnlineProfileTextOwnersNotes ??
              targetChar?.Ownership?.Notes ??
              targetChar?.OwnerRules ??
              "";
          }

          const targetMemberNumber = targetChar?.MemberNumber ?? null;
          const isCurrentlyNormalized =
            profileCache.memberNumber === targetMemberNumber &&
            profileCache.rawText !== null;

          // Toggle state based on active character
          if (!isCurrentlyNormalized) {
            profileCache.memberNumber = targetMemberNumber;
            profileCache.rawText = currentText;
            currentText = this.normalizeProfileText(currentText);
          } else {
            if (profileCache.rawText !== null) {
              currentText = profileCache.rawText;
            }
            profileCache.memberNumber = null;
            profileCache.rawText = null;
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
          if (profileMode === "Description") {
            win.OnlineProfileTextDesc = currentText;
            if (targetChar) targetChar.Description = currentText;
          } else {
            win.OnlineProfileTextOwnersNotes = currentText;
            if (targetChar) {
              if (targetChar.Ownership) {
                targetChar.Ownership.Notes = currentText;
              }
              targetChar.OwnerRules = currentText;
            }
          }
        } catch (profileErr) {
          console.error(
            "[CRABS Orchestrator] Error processing profile normalization click:",
            profileErr,
          );
        }

        // Return early to consume the click natively and avoid triggering downstream hooks under our coordinates
        return;
      }

      return next(args);
    });

    // 3. Reset state on profile unload
    this.safeHook("OnlineProfileUnload", 10, (args, next) => {
      profileCache.memberNumber = null;
      profileCache.rawText = null;
      return next(args);
    });

    // Respawn banner when switching between Character view and Map view (if currently open and enabled)
    this.safeHook(
      "ChatRoomActivateView",
      10,
      (args: any[], next: (args: any[]) => any) => {
        const win = window as any;
        const currentActiveView = win.ChatRoomActiveView;
        const targetViewName = args[0] as string;

        const result = next(args);

        try {
          const roomViews = win.ChatRoomViews;
          const targetView = roomViews?.[targetViewName];

          if (targetView && targetView !== currentActiveView) {
            const settings = Settings.instance?.data;
            const canRespawn =
              Boolean(settings?.showBanner) &&
              Boolean(settings?.respawnBannerOnMapView);

            if (canRespawn) {
              this.drawbanner(true);
            }
          }
        } catch (err) {
          console.error(
            "[CRABS Orchestrator] Error respawning banner on view change:",
            err,
          );
        }

        return result;
      },
    );
  }

  /**
   * Compiles current roster counts and dispatches the rendering sequence to the Banner module.
   * Uses resilient checks against Player and Server state so it does not fail early.
   *
   * @public
   * @param {boolean} [onlyIfPresent=false] - If true, aborts redraw if an existing banner element is not mounted.
   * @returns {boolean} True if the banner was processed and dispatched, false otherwise.
   */
  public drawbanner(onlyIfPresent: boolean = false): boolean {
    const win = window as any;

    // Check if player exists and is connected
    if (!win.Player) {
      return false;
    }

    const inChat =
      (typeof win.ServerPlayerIsInChatRoom === "function" &&
        win.ServerPlayerIsInChatRoom()) ||
      Boolean(win.ChatRoomData) ||
      Boolean(win.Player?.LastChatRoom) ||
      win.CurrentScreen === "ChatRoom";

    if (!inChat) {
      return false;
    }

    const existing = document.getElementById("CRABS_Banner");

    if (onlyIfPresent && !existing) {
      return false;
    }

    if (existing) {
      existing.remove();
    }

    try {
      const extraData = {
        RosterCounters: this.rosterModule.buildroster("count", false),
      };
      this.bannerModule.drawBanner(extraData);
      console.log("[CRABS Orchestrator] Banner successfully rendered.");
      return true;
    } catch (bannerErr) {
      console.error("[CRABS Orchestrator] FATAL drawBanner failed:", bannerErr);
      return false;
    }
  }
}
