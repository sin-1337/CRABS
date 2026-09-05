import { CRABS_Base } from "../base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Drawer } from "../drawer";
import { Settings } from "../settings";
import { Roster } from "../roster";
import { Banner } from "../banner";

export class Setup extends CRABS_Base {
  private crabsLastRoomID: number | null = null;
  private rosterModule: Roster;
  private bannerModule: Banner;
  private bannerTimer: any = null;

  constructor(CRABS: ModSDKModAPI, roster: Roster, banner: Banner) {
    super(CRABS);
    this.rosterModule = roster;
    this.bannerModule = banner;
    this.initHooks();
    this.hookNativeExit();
  }

  private initHooks(): void {
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
        // Fallback room transition check if ChatRoomSync didn't trigger it
        if (ChatRoomData.ID !== this.crabsLastRoomID) {
          this.crabsLastRoomID = ChatRoomData.ID;
          Drawer.updateVisibility();
          Settings.instance?.syncGameState();

          if (Settings.instance?.data?.showBanner) {
            this.queueBanner(ChatRoomData.ID);
          }
        }

        // Returned from Wardrobe/Profile
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
        this.crabsLastRoomID = null; // Left the room
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
   * This prevents the banner from being wiped by BC's internal log clearing.
   */
  private queueBanner(roomId: number, attempts: number = 0): void {
    if (this.bannerTimer) clearTimeout(this.bannerTimer);

    // Timeout after 15 attempts (~3 seconds) to prevent infinite loops
    if (attempts > 15) return;

    this.bannerTimer = setTimeout(() => {
      // Abort if we left or changed rooms during the timeout
      if (
        typeof ChatRoomData === "undefined" ||
        !ChatRoomData ||
        ChatRoomData.ID !== roomId
      ) {
        return;
      }

      const chat = document.getElementById("TextAreaChatLog");

      // Wait for the DOM element to exist AND contain children.
      // BC inserts welcome messages on join; if it's empty, the game hasn't finished clearing it.
      if (chat && chat.children.length > 0) {
        this.drawbanner();
      } else {
        this.queueBanner(roomId, attempts + 1);
      }
    }, 200);
  }

  public drawbanner(): boolean {
    if (
      typeof ChatRoomData === "undefined" ||
      !ChatRoomData ||
      Object.keys(ChatRoomData).length === 0
    ) {
      return false;
    }

    const extraData = {
      RosterCounters: this.rosterModule.buildroster("count", false),
    };
    this.bannerModule.drawBanner(extraData);
    return true;
  }
}
