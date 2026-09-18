/**
 * CRABS Banner Module
 *
 * Implements chat room banner presentation with real-time dynamic stat synchronization.
 * Handles live room occupant counts, administrative privileges, online player metrics,
 * map key state tracking, and permission controls.
 *
 * Hardened for in-place DOM patching to avoid disruptive table rebuilds,
 * preserving chat scroll positions, input focus, and dropdown state.
 *
 * @module banner
 */

import { CRABS_Base, Drawer, Assets } from "../base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import "./templates/banner.css";
import bannertemplate from "./templates/banner.html";
import { Settings } from "../settings/settings";

import * as Permissions from "./permissions";
import * as Keys from "../roster/keys";
import locales from "./i18n.json";

declare const __NAME__: string;
declare const __VERSION__: string;
declare const Player: any;
declare const ChatRoomData: any;
declare const ChatRoomCharacter: any;
declare const CurrentOnlinePlayers: any;
declare const ChatRoomMapViewIsActive: any;

/**
 * Metrics and UI payload for the room banner.
 */
export interface BannerStats {
  roomName: string;
  adminInRoom: number;
  totalAdmins: number;
  playersInRoom: number;
  totalPlayers: number;
  friendsOnline: number | string;
  totalFriends: number;
  onlinePlayers: string;
  isMap: boolean;
  keyState: string;
  keyHtml: string;
}

/**
 * Class representing the room information banner and live HUD.
 *
 * Extends {@link CRABS_Base} to render custom banner markup into the chat window,
 * hook into network sync events and the main chat loop for non-destructive DOM updates,
 * and dispatch interactive drawer events.
 *
 * @extends CRABS_Base
 */
export class Banner extends CRABS_Base {
  /**
   * Indicates whether banner metrics or key states have changed and demand a DOM refresh.
   */
  public isDirty: boolean = true;

  /**
   * Cached count of online friends retrieved from the server.
   * @private
   */
  private onlineFriendsCache: number | string = "...";

  /**
   * Timestamp (epoch ms) marking when an online friend count query was last dispatched.
   * @private
   */
  private lastSentTime: number = 0;

  /**
   * Guards against overlapping server query requests for online friends.
   * @private
   */
  private isFetching: boolean = false;

  /**
   * Serialized snapshot of the last known player key state ("bronze-silver-gold").
   * Used to trigger targeted key icon updates during map gameplay.
   * @private
   */
  private lastKnownKeyState: string = "";

  /**
   * Tracks last observed map active state to react immediately to map view transitions.
   * @private
   */
  private lastKnownMapActive: boolean = false;

  /**
   * Creates an instance of the Banner module and registers state change hooks.
   *
   * @param {ModSDKModAPI} CRABS - Instantiated ModSDK API bridge.
   */
  constructor(CRABS: ModSDKModAPI) {
    super(CRABS, "banner", locales);
    this.loadFriendList();
    this.setupEventHooks();
  }

  /**
   * Hooks account queries and friend list loads to synchronize online friend count.
   *
   * @private
   * @returns {void}
   */
  private loadFriendList(): void {
    this.safeHook(
      "ServerAccountQueryResult",
      0,
      (args: any, next: Function) => {
        const data = args[0];
        if (data?.Query === "OnlineFriends" && Array.isArray(data?.Result)) {
          this.onlineFriendsCache = data.Result.length;
          this.isDirty = true;
          this.isFetching = false;
        }
        return next(args);
      },
    );

    this.safeHook(
      "FriendListLoadFriendList",
      0,
      (args: any, next: Function) => {
        const friendData = args[0];
        if (Array.isArray(friendData)) {
          this.onlineFriendsCache = friendData.length;
          this.isDirty = true;
          this.isFetching = false;
        }
        return next(args);
      },
    );
  }

  /**
   * Queries the game server for online friends if the 60-second cooldown has expired.
   *
   * @returns {void}
   */
  public requestOnlineFriends(): void {
    const now = Date.now();
    if (now - this.lastSentTime >= 1 * 60 * 1000 && !this.isFetching) {
      this.isFetching = true;
      this.lastSentTime = now;

      const serverSend = (window as any).ServerSend;
      if (typeof serverSend === "function") {
        serverSend("AccountQuery", { Query: "OnlineFriends" });
      }

      setTimeout(() => {
        this.isFetching = false;
      }, 3000);
    }
  }

  /**
   * Compiles consolidated metrics and counts for the banner.
   *
   * Gathers room metadata, occupant totals, administrative privileges,
   * online player counts, and delegates map key formatting to the {@link Keys} module.
   *
   * @private
   * @returns {BannerStats} Consolidated counts, state signatures, and rendered key HTML.
   */
  private getBannerStats(): BannerStats {
    if (typeof ChatRoomData === "undefined" || !ChatRoomData) {
      return {
        roomName: "",
        adminInRoom: 0,
        totalAdmins: 0,
        playersInRoom: 0,
        totalPlayers: 0,
        friendsOnline: this.onlineFriendsCache,
        totalFriends: 0,
        onlinePlayers: "",
        isMap: false,
        keyState: "",
        keyHtml: "",
      };
    }

    const admins = ChatRoomData.Admin || [];
    const occupants =
      typeof ChatRoomCharacter !== "undefined" && ChatRoomCharacter.length > 0
        ? ChatRoomCharacter
        : ChatRoomData.Character || [];

    const adminInRoom = occupants.filter(
      (c: any) =>
        typeof c?.MemberNumber !== "undefined" &&
        admins.includes(Number(c.MemberNumber)),
    ).length;

    const totalFriends =
      typeof Player !== "undefined" && Array.isArray(Player.FriendList)
        ? Player.FriendList.length
        : 0;

    const isMapActive =
      typeof ChatRoomMapViewIsActive === "function" &&
      ChatRoomMapViewIsActive();

    const pState =
      typeof Player !== "undefined" ? Player?.MapData?.PrivateState : undefined;
    const keyState = `${Boolean(pState?.HasKeyBronze)}-${Boolean(pState?.HasKeySilver)}-${Boolean(pState?.HasKeyGold)}`;

    let keyHtml = "";
    try {
      keyHtml = Keys.renderHeaderKeys(isMapActive);
    } catch {
      keyHtml = "";
    }

    return {
      roomName: ChatRoomData.Name ?? "",
      adminInRoom,
      totalAdmins: admins.length,
      playersInRoom: occupants.length,
      totalPlayers: Number(ChatRoomData.Limit) || 0,
      friendsOnline: this.onlineFriendsCache,
      totalFriends,
      onlinePlayers:
        typeof CurrentOnlinePlayers !== "undefined"
          ? `${CurrentOnlinePlayers}`
          : "",
      isMap: isMapActive,
      keyState,
      keyHtml,
    };
  }

  /**
   * Registers mod hooks on core game network and state events.
   *
   * Flags the banner interface as dirty on member joins, leaves, and character syncs,
   * while listening to the primary room rendering loop to patch the active DOM.
   *
   * @private
   * @returns {void}
   */
  private setupEventHooks(): void {
    const flagDirty = (args: any, next: Function) => {
      const result = next(args);
      this.isDirty = true;
      return result;
    };

    this.safeHook("ChatRoomSync", 10, flagDirty);
    this.safeHook("ChatRoomSyncMemberJoin", 10, flagDirty);
    this.safeHook("ChatRoomSyncMemberLeave", 10, flagDirty);
    this.safeHook("ChatRoomSyncCharacter", 10, flagDirty);

    // Frame-level loop: React to inventory key changes AND map active view transitions
    this.safeHook("ChatRoomRun", 10, (args: any, next: Function) => {
      const result = next(args);

      const isMapActive =
        typeof ChatRoomMapViewIsActive === "function" &&
        ChatRoomMapViewIsActive();

      if (this.lastKnownMapActive !== Boolean(isMapActive)) {
        this.lastKnownMapActive = Boolean(isMapActive);
        this.isDirty = true;
      }

      const pState = (window as any).Player?.MapData?.PrivateState;
      const keySig = pState
        ? `${Boolean(pState.HasKeyBronze)}-${Boolean(pState.HasKeySilver)}-${Boolean(pState.HasKeyGold)}`
        : "";

      if (this.lastKnownKeyState !== keySig) {
        this.lastKnownKeyState = keySig;
        this.isDirty = true;
      }

      if (this.isDirty) {
        const bannerEl = document.getElementById("CRABS_Banner");
        if (bannerEl) {
          this.updateBannerUI(bannerEl);
        }
        this.isDirty = false;
      }

      return result;
    });
  }

  /**
   * Synchronizes dynamic banner DOM nodes in place without re-rendering the outer table.
   *
   * Updates text nodes (room name, admin counts, occupant counts, friend status)
   * and selectively patches the inline map keys tray.
   *
   * @param {HTMLElement} root - The parent banner container element.
   * @returns {void}
   */
  public updateBannerUI(root: HTMLElement): void {
    if (typeof ChatRoomData === "undefined" || !ChatRoomData) return;

    this.requestOnlineFriends();
    const stats = this.getBannerStats();

    const updateText = (selector: string, text: string) => {
      const el = root.querySelector(selector);
      if (el && el.textContent !== text) {
        el.textContent = text;
      }
    };

    updateText("#CRABS_banner_room_name", stats.roomName);
    updateText(
      "#CRABS_banner_admins",
      `${stats.adminInRoom}/${stats.totalAdmins}`,
    );
    updateText(
      "#CRABS_banner_players",
      `${stats.playersInRoom}/${stats.totalPlayers}`,
    );
    updateText(
      "#CRABS_banner_friends",
      `${stats.friendsOnline}/${stats.totalFriends}`,
    );
    updateText("#CRABS_banner_online", `${stats.onlinePlayers}`);

    const keysContainer = root.querySelector(
      "#CRABS_banner_keys",
    ) as HTMLElement;

    if (keysContainer) {
      if (stats.isMap) {
        keysContainer.style.removeProperty("display");

        if (keysContainer.dataset.lastKeys !== stats.keyState) {
          keysContainer.innerHTML = stats.keyHtml;
          keysContainer.dataset.lastKeys = stats.keyState;
        }
      } else {
        keysContainer.style.display = "none";
        keysContainer.innerHTML = "";
        delete keysContainer.dataset.lastKeys;
      }
    }
  }

  /**
   * Initial mount and compilation of the room information banner.
   *
   * Compiles template tokens for icons, initial metrics, dropdown options, and
   * window chrome before delegating to {@link buildui}.
   *
   * @param {Record<string, string>} [extraData] - Optional template overrides.
   * @returns {void}
   */
  public drawBanner(extraData?: Record<string, string>): void {
    if (
      typeof ChatRoomData === "undefined" ||
      !ChatRoomData ||
      Object.keys(ChatRoomData).length === 0
    ) {
      console.log("CRABS: ChatRoomData wasn't populated");
      return;
    }

    this.requestOnlineFriends();
    const stats = this.getBannerStats();

    const templatevars: Record<string, string> = {
      Logo: Assets.printimage({ key: "logo" }),
      LabelColor:
        typeof Player !== "undefined" && Player?.LabelColor
          ? `${Player.LabelColor}`
          : "#ffffff",
      PermissionOptions: Permissions.drawPermissionOptions(),
      RoomName: stats.roomName,
      AdminIcon: Assets.printimage({
        key: "admin",
        tooltip_override: this.t("header.tooltip_admins"),
        css_class_override: "CRABS_stat_icon",
      }),
      AdminsCount: `${stats.adminInRoom}/${stats.totalAdmins}`,
      PlayerIcon: Assets.printimage({
        key: "player",
        tooltip_override: this.t("header.tooltip_players"),
        css_class_override: "CRABS_stat_icon",
      }),
      PlayersCount: `${stats.playersInRoom}/${stats.totalPlayers}`,
      FriendIcon: Assets.printimage({
        key: "friend",
        tooltip_override: this.t("header.tooltip_friends"),
        css_class_override: "CRABS_stat_icon",
      }),
      FriendsCount: `${stats.friendsOnline}/${stats.totalFriends}`,
      OnlineIcon: Assets.printimage({
        key: "connected",
        tooltip_override: this.t("header.tooltip_online"),
        css_class_override: "CRABS_stat_icon",
      }),
      OnlineCount: `${stats.onlinePlayers}`,
      KeyDisplay: stats.isMap ? "inline-flex" : "none",
      KeyDividerDisplay: stats.isMap ? "inline" : "none",
      KeysHtml: stats.keyHtml,
    };

    const wrappervars = {
      Help: Assets.printimage({
        key: "help",
        css_class_override: "CRABS_Help_Icon",
      }),
      Settings: Assets.printimage({
        key: "settings",
        css_class_override: "CRABS_Settings_Icon",
      }),
      TitleBar:
        typeof __NAME__ !== "undefined" && typeof __VERSION__ !== "undefined"
          ? `${__NAME__}:  ${__VERSION__}`
          : `CRABS: ${this.t("header.title_default")}`,
      Close: Assets.printimage({
        key: "close",
        tooltip_override: this.t("controls.close_dialog"),
        data: ["elementid", "CRABS_Banner"],
      }),
    };

    if (extraData) Object.assign(templatevars, extraData);

    this.buildui(
      this.template(bannertemplate, templatevars, true, wrappervars),
      "CRABS_Banner",
    );
  }

  /**
   * Handles the `/roster` link click, respecting the `rosterOpensDrawer` setting.
   *
   * @private
   * @returns {void}
   */
  private handleRosterLink(): void {
    if (Settings.instance.data.rosterOpensDrawer) {
      Drawer.updateVisibility();
      Drawer.toggle();
    } else {
      this.fakePlayerCommand("roster");
    }
  }

  /**
   * Injects the banner HTML markup into the DOM, binds event listeners,
   * and runs an immediate initial UI sync pass.
   *
   * @override
   * @param {string} output - The HTML string to mount.
   * @param {string} [elementId] - Element ID wrapper for the banner.
   * @returns {void}
   */
  public override buildui(output: string, elementId?: string): void {
    super.buildui(output, elementId);

    // Defer DOM queries slightly to ensure the HTML is in the DOM
    setTimeout(() => {
      const bannerEl = document.getElementById(elementId || "CRABS_Banner");
      if (!bannerEl) return;

      // Permission Select Handler
      const select = bannerEl.querySelector(
        "#CRABS_permission_select",
      ) as HTMLSelectElement;
      if (select) {
        select.addEventListener("change", (event: Event) => {
          const target = event.target as HTMLSelectElement;
          if (target) {
            const newLevel = parseInt(target.value, 10);
            Permissions.setPermissionLevel(newLevel);
          }
        });
      }

      // Map keys trigger opens the drawer's keys view
      const keysContainer = bannerEl.querySelector("#CRABS_banner_keys");
      if (keysContainer) {
        keysContainer.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          Drawer.open("keys");
        });
      }

      // Initial synchronization pass
      this.updateBannerUI(bannerEl);
    }, 50);

    this.attachEvent("CRABS_banner_rosterlink", () => this.handleRosterLink());
  }
}
