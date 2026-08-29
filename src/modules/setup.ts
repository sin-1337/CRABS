// setup.ts

import { CRABS_Base } from "./base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Drawer } from "./drawer";
import { Settings } from "./settings";
import { Roster } from "./roster";
import { Banner } from "./banner";

export class Setup extends CRABS_Base {
  private crabsLastRoomID: number | null = null;
  private rosterModule: Roster;
  private bannerModule: Banner;

  constructor(CRABS: ModSDKModAPI, roster: Roster, banner: Banner) {
    super(CRABS);
    this.rosterModule = roster;
    this.bannerModule = banner;
    this.initHooks();
    this.hookNativeExit();
  }

  private initHooks(): void {
    // Runs at Priority -10000 to guarantee it fires AFTER FUSAM/BCX but BEFORE the Base Game.
    // If an older mod strips the Custom object, this reconstructs it right before the render loop.
    this.safeHook(
      "ChatRoomRun",
      -10000,
      (args: any[], next: (args: any[]) => any) => {
        try {
          const globalWindow = window as any;
          const chatRoomData = globalWindow.ChatRoomData;

          if (chatRoomData) {
            if (!chatRoomData.Custom) {
              chatRoomData.Custom = { SizeMode: 0 };
            } else if (typeof chatRoomData.Custom.SizeMode === "undefined") {
              chatRoomData.Custom.SizeMode = 0;
            }
          }
        } catch {} // Failsafe

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

      if (Settings.instance?.data.closeDrawerOnChat) {
        if (!message.startsWith("/roster") && !message.startsWith("/crabs")) {
          Drawer.close();
        }
      }
      return result;
    });

    // Handle Room Joins and UI Recovery
    this.safeHook("ChatRoomUpdateDisplay", 10, (args, next) => {
      const globalWindow = window as any;
      const chatRoomData = globalWindow.ChatRoomData;

      if (!chatRoomData) {
        return next(args);
      }

      const result = next(args);
      const currentScreen = globalWindow.CurrentScreen;
      const inChatRoom =
        currentScreen === undefined || currentScreen === "ChatRoom";

      if (inChatRoom) {
        // Just joined a new room and room metadata is populated
        if (chatRoomData.ID !== this.crabsLastRoomID && chatRoomData.Name) {
          this.crabsLastRoomID = chatRoomData.ID;
          Drawer.updateVisibility();
          Settings.instance?.syncGameState();

          if (Settings.instance?.data.showBanner) {
            this.drawbanner();
          }
        }

        // Returned from Wardrobe/Profile
        const isFocused = globalWindow.CurrentCharacter !== null;
        const drawerElement = document.getElementById("crabs-drawer");

        if (
          !isFocused &&
          drawerElement &&
          drawerElement.style.display === "none" &&
          !Settings.instance?.data.enableDrawer
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
    const globalWindow = window as any;
    const nativeChatRoomExit = globalWindow.ChatRoomExit;

    globalWindow.ChatRoomExit = function () {
      if (typeof nativeChatRoomExit === "function") {
        nativeChatRoomExit();
      }
      Drawer.updateVisibility();
    };
  }

  public drawbanner(): boolean {
    const globalWindow = window as any;
    const player = globalWindow.Player;
    const chatRoomData = globalWindow.ChatRoomData;

    if (
      !player ||
      player.LastChatRoom === null ||
      !chatRoomData ||
      !chatRoomData.Name
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
