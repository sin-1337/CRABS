/**
 * @fileoverview CRABS Orchestrator & Lifecycle Module
 *
 * Coordinates mod bootstrap routines, cross-module UI hooks, room state synchronization,
 * banner injection timers, native screen lifecycle integrations, and the OnlineProfile
 * canvas font normalization controls within the Bondage Club ecosystem.
 *
 * @module Orchestrator
 */

import { CRABS_Base, Drawer } from "@/modules/base";
import { Settings } from "@/modules/settings";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Roster } from "@/modules/roster";
import { Banner } from "@/modules/banner";
import { Assets } from "@/modules/base";
import { Notification } from "@/modules/notifications";

import locals from "./i18n.json";

// BC Globals (Declared for strict TypeScript if needed, though they exist at runtime)
declare const ChatRoomData: any;
declare const CurrentScreen: any;
declare const Player: any;

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
   * Tracks whether the map was strictly the active view to reliably detect map <-> normal transitions.
   * @private
   * @type {boolean | null}
   */
  private crabsLastViewIsMap: boolean | null = null;

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

  /** is the compass feature blocked by admins **/
  private crabsLastLocationBlocked: boolean | null = null;

  /**
   * Constructs the Orchestrator module instance, initializes base i18n dictionaries under the "profile" namespace,
   * binds submodules, and registers engine hooks.
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
   * Detects whether WCE's personal player notes view is actively open.
   * @private
   * @returns {boolean} True if WCE notes are active.
   */
  private isWceNotesActive(): boolean {
    const noteInput = document.getElementById("bceNoteInput");
    return Boolean(noteInput && !noteInput.classList?.contains("bce-hidden"));
  }

  private checkMapLocationBlockNotice(isMapView?: boolean): void {
    const globalWin = window as any;
    const onMap =
      isMapView ??
      (typeof globalWin.ChatRoomMapViewIsActive === "function"
        ? globalWin.ChatRoomMapViewIsActive()
        : typeof globalWin.ChatRoomIsViewActive === "function"
          ? globalWin.ChatRoomIsViewActive("Map")
          : false);

    if (!onMap) {
      this.crabsLastLocationBlocked = null;
      return;
    }

    const roomData = globalWin.ChatRoomData;
    const isBlocked = Boolean(
      Array.isArray(roomData?.BlockCategory) &&
      roomData.BlockCategory.includes("Location"),
    );

    if (isBlocked && this.crabsLastLocationBlocked !== true) {
      Notification.send({
        title: "Compass Disabled",
        message: "Location share blocked by admin, compass disabled",
        type: "Warning",
        duration: 5000,
      });
    }

    this.crabsLastLocationBlocked = isBlocked;
  }

  /**
   * Registers all core game engine hooks via ModSDK's safeHook API.
   *
   * @private
   * @returns {void}
   */
  private initHooks(): void {
    // Cache object bound to the active character's MemberNumber to prevent cross-profile text bleeding
    let profileCache: { memberNumber: number | null; rawText: string | null } =
      {
        memberNumber: null,
        rawText: null,
      };

    // Pre-load canvas image outside the render loop to prevent asynchronous rendering failures
    let crabsLogoImg: HTMLImageElement | null = new Image();
    crabsLogoImg.crossOrigin = "anonymous";
    crabsLogoImg.onerror = () => {
      crabsLogoImg = null;
    };
    try {
      crabsLogoImg.src = `${(Assets as any).IMAGES.basePath}${(Assets as any).IMAGES.image.logo.file}`;
    } catch (e) {
      crabsLogoImg = null;
    }

    // --- SafeHook for ChatRoomExit ---
    const globalWin = window as any;
    if (typeof globalWin.ChatRoomExit !== "function") {
      globalWin.ChatRoomExit = function () {};
    }

    this.safeHook("ChatRoomExit", 10, (args, next) => {
      // Clear room and view state on exit so the next room entry will trigger the banner
      this.crabsLastRoomID = null;
      this.crabsLastViewIsMap = null;
      this.crabsLastLocationBlocked = null;
      const result = next(args);
      Drawer.updateVisibility();
      return result;
    });

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

    // Hook translation event (do not respawn the banner here)
    this.safeHook(
      "TranslationLoad",
      10,
      (args: any, next: (args: any[]) => any) => {
        return next(args);
      },
    );

    this.safeHook("ChatRoomSync", 10, (args, next) => {
      const result = next(args);

      const globalWin = window as any;
      let isMapView = false;
      if (typeof globalWin.ChatRoomIsViewActive === "function") {
        isMapView = globalWin.ChatRoomIsViewActive("Map");
      } else if (globalWin.ChatRoomViews && globalWin.ChatRoomActiveView) {
        isMapView =
          globalWin.ChatRoomActiveView === globalWin.ChatRoomViews["Map"];
      }

      this.checkMapLocationBlockNotice(isMapView);
      return result;
    });

    // Handle Room Joins, UI Recovery, and View Transitions globally
    this.safeHook("ChatRoomUpdateDisplay", 10, (args, next) => {
      const result = next(args);

      const inChatRoom =
        typeof ChatRoomData !== "undefined" &&
        ChatRoomData !== null &&
        (typeof CurrentScreen === "undefined" || CurrentScreen === "ChatRoom");

      if (inChatRoom) {
        const currentID = ChatRoomData.ID ?? ChatRoomData.Name;
        const globalWin = window as any;

        // Reliably determine if the map is the active view object via BC's native data structures
        let isMapView = false;
        if (typeof globalWin.ChatRoomIsViewActive === "function") {
          isMapView = globalWin.ChatRoomIsViewActive("Map");
        } else if (globalWin.ChatRoomViews && globalWin.ChatRoomActiveView) {
          isMapView =
            globalWin.ChatRoomActiveView === globalWin.ChatRoomViews["Map"];
        }

        // 1. Initial Room Join Logic
        if (currentID && this.crabsLastRoomID === null) {
          this.crabsLastRoomID = currentID;
          this.crabsLastViewIsMap = isMapView;
          Drawer.updateVisibility();
          Settings.instance?.syncGameState();

          if (Settings.instance?.data?.showBanner) {
            this.drawbanner();
          }

          // Check if room was joined directly in map view
          this.checkMapLocationBlockNotice(isMapView);
        }
        // 2. Mid-Session View Transition Logic (No longer re-creates banner; Banner.ts updates in-place)
        else if (
          this.crabsLastViewIsMap !== null &&
          this.crabsLastViewIsMap !== isMapView
        ) {
          this.crabsLastViewIsMap = isMapView;
          this.checkMapLocationBlockNotice(isMapView);
        }

        // Returned from Wardrobe/Profile checks
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
        // Reset state completely if we exit a chat room context
        this.crabsLastViewIsMap = null;
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

      // Hide the button if WCE Personal Notes screen is open
      if (this.isWceNotesActive()) return;

      const globalWin = window as any;
      const targetChar = globalWin.InformationSheetSelection;
      if (!targetChar) return;

      const ctx: CanvasRenderingContext2D =
        globalWin.MainCanvas?.getContext?.("2d");
      if (!ctx) return;

      const targetMemberNumber = targetChar.MemberNumber ?? null;
      const profileIsNormalized =
        profileCache.memberNumber === targetMemberNumber &&
        profileCache.rawText !== null;

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

      // Ignore clicks if WCE Personal Notes screen is open
      if (this.isWceNotesActive()) {
        return next(args);
      }

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

        const targetMemberNumber = targetChar?.MemberNumber ?? null;
        const isCurrentlyNormalized =
          profileCache.memberNumber === targetMemberNumber &&
          profileCache.rawText !== null;

        // Toggle state bound to character member number
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
      profileCache.memberNumber = null;
      profileCache.rawText = null;
      return next(args);
    });
  }

  /**
   * Dispatches banner mounting to the Banner module.
   *
   * @public
   * @param {boolean} [onlyIfPresent=false] - If true, aborts redraw if an existing banner element is not mounted.
   * @returns {boolean} True if the banner was processed and dispatched, false otherwise.
   */
  public drawbanner(onlyIfPresent: boolean = false): boolean {
    if (typeof Player === "undefined" || Player.LastChatRoom === null) {
      return false;
    }

    const existing = document.getElementById("CRABS_Banner");

    if (onlyIfPresent && !existing) {
      return false;
    }

    if (existing) {
      existing.remove();
    }

    this.bannerModule.drawBanner();
    return true;
  }
}
