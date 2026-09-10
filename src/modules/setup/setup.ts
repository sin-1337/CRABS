import { CRABS_Base } from "base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Drawer } from "drawer";
import { Settings } from "settings";
import { Roster } from "roster";
import { Banner } from "banner";
import { Assets } from "assets";

import locals from "./i18n.json";

export class Setup extends CRABS_Base {
  public static instance: Setup | null = null;
  private crabsLastRoomID: number | null = null;
  private rosterModule: Roster;
  private bannerModule: Banner;
  private bannerTimer: any = null;

  constructor(CRABS: ModSDKModAPI, roster: Roster, banner: Banner) {
    super(CRABS, "profile", locals);
    Setup.instance = this;
    this.rosterModule = roster;
    this.bannerModule = banner;
    this.initHooks();
    this.hookNativeExit();
  }

  // Static helper to redraw banner from anywhere
  public static redrawBanner(): void {
    Setup.instance?.drawbanner(true);
  }

  private initHooks(): void {
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

    // Auto-stow Drawer on Chat
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

    // Hook translation event so that we can react to it
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

    // Render & Position Normalize Button on OnlineProfile
    this.safeHook("OnlineProfileRun", 10, (args, next) => {
      next(args);

      const globalWin = window as any;
      if (!globalWin.InformationSheetSelection) return;

      const input = document.getElementById(
        "DescriptionInput",
      ) as HTMLTextAreaElement | null;
      if (!input) return;

      let btn = document.getElementById(
        "crabs-profile-normalize-btn",
      ) as HTMLButtonElement | null;
      if (!btn) {
        btn = document.createElement("button");
        btn.id = "crabs-profile-normalize-btn";
        btn.type = "button";
        btn.title = this.t("toggle_tooltip");

        const logoSrc = `${(Assets as any).IMAGES.basePath}${(Assets as any).IMAGES.image.logo.file}`;

        btn.innerHTML = `
          <img src="${logoSrc}" class="${(Assets as any).IMAGES.image.logo.class}" alt="CRABS" style="width: 28px; height: 28px; object-fit: contain; pointer-events: none;" />
          <span style="font-weight: bold; font-size: 18px; margin-left: 6px; letter-spacing: 0.5px; pointer-events: none;">Aa</span>
        `;

        Object.assign(btn.style, {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1e1e24",
          color: "#e0e0e0",
          border: "2px solid #444",
          borderRadius: "10px",
          cursor: "pointer",
          zIndex: "98",
          boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
          transition:
            "border-color 0.15s ease, background-color 0.15s ease, transform 0.1s ease",
          userSelect: "none",
          boxSizing: "border-box",
        });

        btn.addEventListener("mouseenter", () => {
          btn!.style.borderColor = "#ff4444";
        });

        btn.addEventListener("mouseleave", () => {
          btn!.style.borderColor = profileIsNormalized ? "#ff4444" : "#444";
        });

        btn.addEventListener("click", () => {
          const targetInput = document.getElementById(
            "DescriptionInput",
          ) as HTMLTextAreaElement | null;
          if (!targetInput) return;

          if (!profileIsNormalized) {
            profileOriginalRawText = targetInput.value;
            const cleaned = this.cleanZalgoAndNormalize(targetInput.value);
            targetInput.value = cleaned;
            profileIsNormalized = true;

            btn!.style.borderColor = "#ff4444";
            btn!.style.backgroundColor = "#2e1a1a";
          } else {
            if (profileOriginalRawText !== null) {
              targetInput.value = profileOriginalRawText;
            }
            profileIsNormalized = false;

            btn!.style.borderColor = "#444";
            btn!.style.backgroundColor = "#1e1e24";
          }

          if (globalWin.OnlineProfileMode === "Description") {
            globalWin.OnlineProfileTextDesc = targetInput.value;
          } else {
            globalWin.OnlineProfileTextOwnersNotes = targetInput.value;
          }
        });

        document.body.appendChild(btn);
      }

      if (typeof globalWin.ElementPositionFix === "function") {
        globalWin.ElementPositionFix(
          "crabs-profile-normalize-btn",
          18,
          200,
          60,
          100,
          90,
        );
      }
    });

    // Clean up DOM element when exiting profile screen
    this.safeHook("OnlineProfileUnload", 10, (args, next) => {
      const btn = document.getElementById("crabs-profile-normalize-btn");
      if (btn) btn.remove();

      profileOriginalRawText = null;
      profileIsNormalized = false;
      return next(args);
    });
  }

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
   * Queues the banner to draw, polling for the chat log DOM to be fully initialized.
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
