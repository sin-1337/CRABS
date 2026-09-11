/**
 * CRABS Roster Module
 *
 * Enhanced player roster drawer and overlay management for the Bondage Club ecosystem.
 * Handles live character rendering hooks, map/spatial tracking indicators, history
 * logging, relationship/effect icons, and map key-management interactions.
 *
 * @module roster
 */

import { CRABS_Base, Drawer } from "../base";
import { Assets } from "../base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Settings } from "../settings/settings";
import DOMPurify from "dompurify";
import "./templates/roster.css";
import rostertemplate from "./templates/roster.html";
import rostercardstemplate from "./templates/roster_cards.html";
import rostercardssingletemplate from "./templates/roster_cards_single.html";

import * as Icons from "./icons";
import * as Compass from "./compass";
import * as Sorting from "./sorting";
import * as History from "./history";
import * as Immersion from "./immersion";
import * as Keys from "./keys";
import locales from "./i18n.json";

/**
 * Enhanced player roster controller.
 *
 * Extends {@link CRABS_Base} to render dynamic roster cards, manage drawer state,
 * hook into the base game's character drawing pipeline for map tracking/glow effects,
 * and provide interactive controls such as map key discard dialogs and sorting modes.
 */
export class Roster extends CRABS_Base {
  /**
   * Member number of the player currently hovered within the chat log, or `null`.
   * Proxied directly to the Compass spatial module.
   */
  public get chatLogHoveredPlayer(): number | null {
    return Compass.chatLogHoveredPlayer;
  }
  public set chatLogHoveredPlayer(val: number | null) {
    Compass.setChatLogHoveredPlayer(val);
  }

  /**
   * Member number of the player currently hovered on the canvas map grid, or `null`.
   * Proxied directly to the Compass spatial module.
   */
  public get hoveredMapPlayer(): number | null {
    return Compass.hoveredMapPlayer;
  }
  public set hoveredMapPlayer(val: number | null) {
    Compass.setHoveredMapPlayer(val);
  }

  /**
   * Member number of the player explicitly locked for direction tracking, or `null`.
   * Proxied directly to the Compass spatial module.
   */
  public get trackedMapPlayer(): number | null {
    return Compass.trackedMapPlayer;
  }
  public set trackedMapPlayer(val: number | null) {
    Compass.setTrackedMapPlayer(val);
  }

  /**
   * Clears any active player tracking target from the spatial compass module.
   *
   * @returns {void}
   */
  public clearTracking(): void {
    Compass.clearTracking();
  }

  /**
   * Automatically advances roster drawer pagination to display the card for a specified player.
   *
   * @param targetId - Member number of the target player.
   * @returns {void}
   */
  public autoPaginateToPlayer(targetId: number): void {
    Compass.autoPaginateToPlayer(targetId);
  }

  /**
   * Indicates whether the roster drawer is currently rendering the historical visitor log
   * rather than the live room occupant view.
   */
  public isShowingHistory: boolean = false;

  /**
   * Indicates whether the roster drawer is currently rendering the dungeon map keys panel.
   */
  public isShowingKeys: boolean = false;

  /**
   * Current CSS layout style applied to roster player cards.
   * Defaults to `"layout-grid"` or the value persisted in local storage.
   */
  public currentLayoutMode: string =
    localStorage.getItem("CRABS_RosterLayout") || "layout-grid";

  /**
   * Gets the active roster card layout class.
   */
  public get layoutMode(): string {
    return this.currentLayoutMode;
  }

  /**
   * Sets the active roster card layout class, saves it to `localStorage`,
   * and flags the module cache as dirty.
   */
  public set layoutMode(val: string) {
    this.currentLayoutMode = val;
    localStorage.setItem("CRABS_RosterLayout", val);
    this.isDirty = true;
  }

  /** Cached count of online friends retrieved from the server, or `"...""` when pending. */
  private onlineFriendsCache: number | string = "...";

  /** Timestamp (epoch ms) marking when an online friend count query was last dispatched. */
  private lastSentTime: number = 0;

  /** Guards against overlapping server query requests for online friends. */
  private isFetching: boolean = false;

  /** Indicates whether roster state has changed and demands an interface refresh. */
  public isDirty: boolean = true;

  /** Persisted sorting strategy identifier applied to the live occupant list. */
  private currentRosterSortMode: string =
    localStorage.getItem("CRABS_SortMode") || "natural";

  /** Persisted sorting strategy identifier applied to the historical visitor list. */
  private currentHistorySortMode: string =
    localStorage.getItem("CRABS_HistorySortMode") || "natural";

  /** Tracks last observed private key states to react instantly to map pickups. */
  private lastKnownKeyState: string = "";

  /**
   * Active sorting strategy ID based on whether history or live view is visible.
   */
  public get activeSortMode(): string {
    return this.isShowingHistory
      ? this.currentHistorySortMode
      : this.currentRosterSortMode;
  }

  /**
   * Initializes the Roster module instance, sets up history stores, preloads
   * friends, establishes canvas mouse watchers, attaches runtime hooks, and
   * registers views and state delegates with the Drawer.
   *
   * @param CRABS - Instantiated ModSDK API bridge.
   */
  constructor(CRABS: ModSDKModAPI) {
    super(CRABS, "roster", locales);
    History.loadHistory();
    this.loadFriendList();
    this.setupEventHooks();

    // ─────────────────────────────────────────────────────────────
    // Drawer Inversion of Control Registration
    // ─────────────────────────────────────────────────────────────

    Drawer.registerStateDelegate({
      isDirty: () => this.isDirty,
      clearDirty: () => {
        this.isDirty = false;
      },
      updateUI: (root: HTMLElement) => this.updateRosterUI(root),
      layoutMode: () => this.currentLayoutMode,
      cycleLayout: () => {
        const layouts = [
          "layout-grid",
          "layout-mobile-stack",
          "layout-compact",
        ];
        const currentIndex = layouts.indexOf(this.currentLayoutMode);
        const nextLayout =
          layouts[(currentIndex + 1) % layouts.length] || "layout-grid";
        this.layoutMode = nextLayout;
      },
      getKeyStateString: () => Keys.getKeyState().keyStateString,
      onClearTracking: () => this.clearTracking(),
    });

    Drawer.registerView({
      id: "roster",
      title: () => ChatRoomData?.Name || this.t("title.default"),
      render: () => {
        this.initScrollingOverflow();
        return this.buildroster("all", false);
      },
      onMount: (root: HTMLElement) => {
        this.buildui(undefined, undefined, root);
      },
      showSort: true,
      showLayout: true,
    });

    Drawer.registerView({
      id: "history",
      title: () => this.t("title.history") || "History",
      render: () => {
        this.initScrollingOverflow();
        return this.buildHistory();
      },
      onMount: (root: HTMLElement) => {
        this.buildui(undefined, undefined, root);
      },
      showSort: true,
      showLayout: false,
    });

    Drawer.registerView({
      id: "keys",
      title: () => this.t("title.keys") || "Map Keys",
      render: () => this.buildKeys(),
      onMount: (root: HTMLElement) => {
        this.buildui(undefined, undefined, root);
      },
      showSort: false,
      showLayout: false,
    });

    // ─────────────────────────────────────────────────────────────
    // Window Event Watchers & Hooks
    // ─────────────────────────────────────────────────────────────

    window.addEventListener("mousemove", (e) => {
      const target = e.target as HTMLElement;
      Compass.setIsMouseOverCanvas(!!target && target.id === "MainCanvas");
    });
    window.addEventListener("mouseleave", () => {
      Compass.setIsMouseOverCanvas(false);
    });

    // Hook: Character rendering pass to inject tracking glows and deferred name indicators
    this.safeHook("DrawCharacter", -100, (args: any, next: Function) => {
      const globalWindow = window as any;
      let isTarget = false;

      const character = args[0];
      const drawX = args[1] || 0;
      const drawY = args[2] || 0;
      const zoom = args[3] || 1;

      if (
        globalWindow.CurrentScreen === "ChatRoom" &&
        globalWindow.ChatRoomHideIconState < 3 &&
        globalWindow.Player?.OnlineSettings?.ShowNames !== false
      ) {
        const isMap =
          globalWindow.ChatRoomMapViewIsActive &&
          globalWindow.ChatRoomMapViewIsActive();
        const targetId = Compass.trackedMapPlayer || Compass.hoveredMapPlayer;

        const mouseX = globalWindow.MouseX;
        const mouseY = globalWindow.MouseY;

        if (
          Compass.isMouseOverCanvas &&
          typeof mouseX === "number" &&
          typeof mouseY === "number"
        ) {
          if (
            !isMap &&
            mouseX < 1000 &&
            Compass.hoveredMapPlayer === null &&
            mouseX >= drawX &&
            mouseX <= drawX + 500 * zoom &&
            mouseY >= drawY &&
            mouseY <= drawY + 1000 * zoom
          ) {
            Compass.setCurrentFrameHoveredPlayer(character.MemberNumber);
          }
        }

        if (!isMap && targetId && character.MemberNumber === targetId) {
          isTarget = true;
          Compass.drawFocusGlow(
            character,
            drawX,
            drawY,
            zoom,
            CRABS_Base.currentPerformanceLevel,
          );
        }
      }

      const result = next(args);

      if (isTarget) {
        const centerX = drawX + 250 * zoom;
        const nameY = drawY + 975 * zoom;
        Compass.setDeferredIndicator({ character, x: centerX, y: nameY, zoom });
      }

      return result;
    });

    // Hook: Per-frame room render cycle to calculate map coordinate hovers and canvas compass
    this.safeHook("ChatRoomRun", 10, (args: any, next: Function) => {
      Compass.setCurrentFrameHoveredPlayer(null);
      Compass.setDeferredIndicator(null);

      const result = next(args);

      const indicator = Compass.deferredIndicator;

      if (
        indicator &&
        indicator.x >= 0 &&
        indicator.x <= 1000 &&
        indicator.y >= 0 &&
        indicator.y <= 1000
      ) {
        Compass.drawNameIndicator(
          indicator.character,
          indicator.x,
          indicator.y,
          this.getColorBrightness.bind(this),
        );
        Compass.setDeferredIndicator(null);
      }
      Compass.drawCompass(this.getColorBrightness.bind(this));

      const globalWindow = window as any;

      // Detect immediate map key pickups or drops
      const pState = globalWindow.Player?.MapData?.PrivateState;
      const keySig = pState
        ? `${!!pState.HasKeyBronze}-${!!pState.HasKeySilver}-${!!pState.HasKeyGold}`
        : "";
      if (this.lastKnownKeyState !== keySig) {
        this.lastKnownKeyState = keySig;
        this.isDirty = true;
      }

      const isMap =
        globalWindow.ChatRoomMapViewIsActive &&
        globalWindow.ChatRoomMapViewIsActive();

      if (isMap && Compass.isMouseOverCanvas) {
        const mouseX = globalWindow.MouseX;
        const mouseY = globalWindow.MouseY;
        const range = globalWindow.ChatRoomMapViewPerceptionRange;
        const player = globalWindow.Player;

        if (
          typeof mouseX === "number" &&
          typeof mouseY === "number" &&
          typeof range === "number" &&
          player?.MapData?.Pos
        ) {
          const tileW = 1000 / (range * 2 + 1);
          const hoverGridX = Math.floor(mouseX / tileW);
          const hoverGridY = Math.floor(mouseY / tileW);

          const characters = globalWindow.ChatRoomCharacter || [];
          for (let i = characters.length - 1; i >= 0; i--) {
            const c = characters[i];
            if (c?.MapData?.Pos) {
              const dX = c.MapData.Pos.X - player.MapData.Pos.X;
              const dY = c.MapData.Pos.Y - player.MapData.Pos.Y;

              const charScreenX = dX + range;
              const charScreenY = dY + range;

              const isHoveringCharacter =
                hoverGridX === charScreenX &&
                (hoverGridY === charScreenY || hoverGridY === charScreenY - 1);

              if (isHoveringCharacter) {
                const tileIndex =
                  c.MapData.Pos.X +
                  c.MapData.Pos.Y * globalWindow.ChatRoomMapViewWidth;
                const isVisible =
                  globalWindow.ChatRoomMapViewVisibilityMask &&
                  globalWindow.ChatRoomMapViewVisibilityMask[tileIndex];

                if (isVisible) {
                  Compass.setCurrentFrameHoveredPlayer(c.MemberNumber);
                  break;
                }
              }
            }
          }
        }
      }

      const combinedHover =
        Compass.currentFrameHoveredPlayer || Compass.chatLogHoveredPlayer;

      if (Compass.canvasHoveredPlayer !== combinedHover) {
        Compass.setCanvasHoveredPlayer(combinedHover);
        Compass.syncCanvasHoverToDOM(Compass.canvasHoveredPlayer);
      }

      return result;
    });
  }

  /**
   * Generates rendered HTML for the keys management view via the Keys delegate.
   *
   * @returns Sanitized HTML representation of the keys view.
   */
  public buildKeys(): string {
    return Keys.buildKeysRoster(this.template.bind(this), this.t.bind(this));
  }

  /**
   * Compiles consolidated metrics and counts for the roster header.
   *
   * Gathers room metadata, occupant counts, administrative privileges, online
   * friend states, and delegates key state formatting to the {@link Keys} module.
   *
   * @private
   * @returns Consolidated counts, states, and key HTML.
   */
  private getHeaderStats() {
    const currentRoomName =
      ChatRoomData?.Name || this.t("header.title_default");

    const adminInRoom =
      ChatRoomData?.Character?.filter((c: any) =>
        ChatRoomData.Admin.includes(c.MemberNumber),
      ).length || 0;

    const totalAdmins = ChatRoomData?.Admin?.length || 0;
    const playersInRoom =
      typeof ChatRoomCharacter !== "undefined" ? ChatRoomCharacter.length : 0;
    const totalPlayers = ChatRoomData?.Limit || 0;

    const playerWindow = (window as any).Player;
    const totalFriends = playerWindow?.FriendList?.length || 0;

    const onlinePlayers =
      typeof CurrentOnlinePlayers !== "undefined" ? CurrentOnlinePlayers : "";
    const isMap =
      typeof ChatRoomMapViewIsActive === "function" &&
      ChatRoomMapViewIsActive();

    const pState = playerWindow?.MapData?.PrivateState;
    const currentKeyState = `${pState?.HasKeyBronze}-${pState?.HasKeySilver}-${pState?.HasKeyGold}`;
    const keyHtml = Keys.renderHeaderKeys(isMap);

    return {
      currentRoomName,
      adminInRoom,
      totalAdmins,
      playersInRoom,
      totalPlayers,
      friendsOnline: this.onlineFriendsCache,
      totalFriends,
      onlinePlayers,
      isMap,
      currentKeyState,
      keyHtml,
    };
  }

  /**
   * Updates dynamic DOM metrics inside an open roster drawer without full re-rendering.
   *
   * Synchronizes text counters (admins, players, friends, online count), card status
   * indicators, and map key iconography using fine-grained DOM checks to minimize reflows.
   *
   * @param root - Parent root element containing the roster DOM subtree.
   * @returns {void}
   */
  public updateRosterUI(root: HTMLElement): void {
    if (typeof ChatRoomData === "undefined" || ChatRoomData === null) return;

    const table = root.querySelector(".CRABS_roster_center_table");
    if (table) {
      table.classList.remove(
        "layout-grid",
        "layout-mobile-stack",
        "layout-compact",
      );
      table.classList.add(this.currentLayoutMode);
    }

    const updateText = (id: string, text: string) => {
      const el = root.querySelector(id);
      if (el && el.textContent !== text) el.textContent = text;
    };

    const stats = this.getHeaderStats();

    updateText("#drawer-title", `${stats.currentRoomName}`);
    updateText(
      "#CRABS_header_admins",
      `${stats.adminInRoom}/${stats.totalAdmins}`,
    );
    updateText(
      "#CRABS_header_players",
      `${stats.playersInRoom}/${stats.totalPlayers}`,
    );
    updateText(
      "#CRABS_header_friends",
      `${stats.friendsOnline}/${stats.totalFriends}`,
    );
    updateText("#CRABS_header_online", `${stats.onlinePlayers} `);

    const keyContainer = root.querySelector(
      "#CRABS_key_container",
    ) as HTMLElement;
    const keyContent = root.querySelector("#CRABS_key_content") as HTMLElement;

    if (keyContainer && keyContent) {
      const activeStr = stats.isMap ? "true" : "false";

      if (keyContainer.getAttribute("data-map-active") !== activeStr) {
        keyContainer.setAttribute("data-map-active", activeStr);
      }

      if (stats.isMap) {
        if (keyContent.dataset.lastKeys !== stats.currentKeyState) {
          keyContent.innerHTML = stats.keyHtml;
          keyContent.dataset.lastKeys = stats.currentKeyState;
        }
      } else if (keyContent.innerHTML !== "") {
        keyContent.innerHTML = "";
        keyContent.removeAttribute("data-last-keys");
      }
    }

    const container = root.querySelector(".CRABS_card-container");
    const currentCardCount = container?.querySelectorAll(".CRABS_card").length;
    if (currentCardCount !== ChatRoomData.Character.length) {
      if (container) {
        container.innerHTML = DOMPurify.sanitize(
          this.buildroster("all", false, true),
        );
        this.buildui(undefined, undefined, root);
        return;
      }
    }

    ChatRoomData.Character.forEach((charData: any) => {
      const card = root.querySelector(`#CRABS_card_${charData.MemberNumber}`);
      const character =
        typeof ChatRoomCharacter !== "undefined"
          ? ChatRoomCharacter.find(
              (c) => c.MemberNumber === charData.MemberNumber,
            )
          : null;

      if (card && character) {
        const nameContainer = card.querySelector(
          ".CRABS_player-name",
        ) as HTMLElement;
        if (nameContainer) {
          const currentNickname = this.cleanZalgoAndNormalize(
            CharacterNickname(character),
          );
          if (nameContainer.textContent !== currentNickname) {
            nameContainer.textContent = currentNickname;
          }
        }

        const statusContainer = card.querySelector(
          ".CRABS_status-icons",
        ) as HTMLElement;
        if (statusContainer) {
          const currentEffects = CharacterGetEffects(character).join(",");
          if (statusContainer.dataset.lastEffects !== currentEffects) {
            statusContainer.innerHTML = DOMPurify.sanitize(
              Icons.setStatusIcons(character),
            );
            statusContainer.dataset.lastEffects = currentEffects;
          }
        }

        const iconContainer = card.querySelector(
          ".CRABS_player-icons",
        ) as HTMLElement;
        if (iconContainer) {
          const newIconHTML = Icons.setIcons(character);

          if (iconContainer.dataset.lastIcons !== newIconHTML) {
            iconContainer.innerHTML = DOMPurify.sanitize(newIconHTML);
            iconContainer.dataset.lastIcons = newIconHTML;
          }
        }
      }
    });
  }

  /**
   * Registers mod hooks on core game network and state events to invalidate
   * caches and trigger UI refreshes on room joins, departures, and syncs.
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

    this.safeHook("ChatRoomSync", 10, (args: any, next: Function) => {
      const result = next(args);
      const data = args[0];

      if (data?.Name) {
        History.syncRoomContext(data.Name);
      }

      if (Array.isArray(data?.Character)) {
        data.Character.forEach((c: any) => {
          if (c?.MemberNumber) History.removeRejoinedCharacter(c.MemberNumber);
        });
      }

      this.isDirty = true;
      return result;
    });

    this.safeHook("ChatRoomSyncMemberJoin", 10, (args: any, next: Function) => {
      const result = next(args);
      const data = args[0];

      if (data?.Character?.MemberNumber) {
        History.removeRejoinedCharacter(data.Character.MemberNumber);
      }

      this.isDirty = true;
      return result;
    });

    this.safeHook(
      "ChatRoomSyncMemberLeave",
      10,
      (args: any, next: Function) => {
        const data = args[0];
        const targetId =
          typeof data === "number"
            ? data
            : data?.SourceMemberNumber || data?.MemberNumber;

        const globalWindow = window as any;
        const characters = globalWindow.ChatRoomCharacter || [];

        if (targetId) {
          const leavingChar = characters.find(
            (c: any) => c.MemberNumber === targetId,
          );
          if (leavingChar) {
            History.recordHistoryCharacter(leavingChar);
          } else {
            const fallback = globalWindow.ChatRoomData?.Character?.find(
              (c: any) => c.MemberNumber === targetId,
            );
            if (fallback) {
              History.recordHistoryCharacter(fallback);
            }
          }
        }

        const result = next(args);
        this.isDirty = true;
        return result;
      },
    );

    this.safeHook("ChatRoomSyncCharacter", 10, flagDirty);
    this.safeHook("TranslationLoad", 10, flagDirty);

    this.safeHook("ChatRoomMessage", 10, (args: any, next: Function) => {
      const result = next(args);
      const data = args[0];

      if (data && (data.Type === "Action" || data.Type === "Server")) {
        this.isDirty = true;
      }
      return result;
    });

    this.safeHook("ServerSend", 10, (args, next) => {
      const result = next(args);
      const messageType = args[0];

      if (messageType === "AccountUpdate" || messageType === "ChatRoomChat") {
        this.isDirty = true;
      }
      return result;
    });
  }

  /**
   * Generates rendered HTML for the room's historical visitors list via the History delegate.
   *
   * @returns Sanitized HTML representation of the history roster.
   */
  public buildHistory(): string {
    return History.buildHistoryRoster(
      this.template.bind(this),
      this.cleanZalgoAndNormalize.bind(this),
      this.convertColor.bind(this),
      this.getLabelShadow.bind(this),
      this.currentHistorySortMode,
    );
  }

  /**
   * Detects horizontal text clipping in name badges and applies marquee scroll animations.
   *
   * @param containerSelector - CSS selector targeting wrappers to inspect.
   * @returns {void}
   */
  public initScrollingOverflow(
    containerSelector: string = ".CRABS_overflow-wrapper",
  ): void {
    const wrappers = document.querySelectorAll<HTMLElement>(containerSelector);

    wrappers.forEach((wrapper) => {
      const scroller = wrapper.querySelector<HTMLElement>(
        ".CRABS_overflow-scroll",
      );
      if (!scroller) return;

      wrapper.classList.remove("scrolling");
      scroller.style.removeProperty("--scroll-distance");

      requestAnimationFrame(() => {
        const scrollWidth = scroller.scrollWidth;
        const wrapperWidth = wrapper.offsetWidth;

        if (scrollWidth > wrapperWidth) {
          const scrollAmount = scrollWidth - wrapperWidth;
          scroller.style.setProperty("--scroll-distance", `-${scrollAmount}px`);
          wrapper.classList.add("scrolling");
        }
      });
    });
  }

  /**
   * Compiles HTML markup for a single character's roster card.
   *
   * Computes label contrast shadows, attaches relationship and status badges,
   * and conditionally renders spatial compass targeting buttons.
   *
   * @param character - Bondage Club Character object to render.
   * @param badge - Rendered badge markup string.
   * @param playerIcons - Relationship icon markup string.
   * @param isDrawer - Whether the card is intended for the sliding drawer.
   * @returns Fully templated card HTML string.
   * @private
   */
  private buildCard(
    character: any,
    badge: string,
    playerIcons: string,
    isDrawer: boolean = false,
  ): string {
    const labelColor = character.LabelColor || "#FFFFFF";

    let r = 255,
      g = 255,
      b = 255;
    if (Roster.canvasContext) {
      Roster.canvasContext.clearRect(0, 0, 1, 1);
      Roster.canvasContext.fillStyle = labelColor;
      Roster.canvasContext.fillRect(0, 0, 1, 1);
      const data = Roster.canvasContext.getImageData(0, 0, 1, 1).data;
      r = data[0];
      g = data[1];
      b = data[2];
    }

    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const maxChannel = Math.max(r, g, b);

    const needsOutline = brightness < 70 || maxChannel < 140;
    const outlineColor = this.getBrightOutlineColor(labelColor);

    const labelShadow = needsOutline
      ? `text-shadow: -1px -1px 0 ${outlineColor}, 1px -1px 0 ${outlineColor}, -1px 1px 0 ${outlineColor}, 1px 1px 0 ${outlineColor} !important; -webkit-text-stroke: 0px;`
      : "text-shadow: none !important; -webkit-text-stroke: 0px;";

    let compassBlock = "";
    if (
      !this.isCompassBlocked() &&
      Settings.instance.data.showMapCompass &&
      isDrawer
    ) {
      const trackedClass =
        Compass.trackedMapPlayer === character.MemberNumber
          ? "CRABS_compass-active"
          : "";
      const compassIcon = Assets.printimage({
        key: "compass",
        tooltip_override: this.t("tooltips.track_compass"),
        css_class_override: "CRABS_icon",
      });

      compassBlock = `
            <div class="CRABS_track-compass ${trackedClass}" style="margin-left: 8px; cursor: pointer; flex-shrink: 0;" data-player-number="${character.MemberNumber}">
                ${compassIcon}
            </div>`;
    }

    let templatevars: Record<string, string> = {
      PlayerNumber: `${character.MemberNumber}`,
      Badge: badge,
      LabelColorBorder: `${this.convertColor(labelColor, 0.5)}`,
      LabelColor: labelColor,
      LabelShadow: labelShadow,
      PlayerName: this.cleanZalgoAndNormalize(CharacterNickname(character)),
      PlayerIcons: playerIcons,
      StatusIcons: `${Icons.setStatusIcons(character)}`,
      CompassBlock: compassBlock,
    };

    const targetTemplate =
      this.currentLayoutMode === "layout-grid"
        ? rostercardstemplate
        : rostercardssingletemplate;

    return this.template(targetTemplate, templatevars, false);
  }

  /**
   * Hooks into friend list response routines to cache online friend counts.
   *
   * @private
   * @returns {void}
   */
  private loadFriendList(): void {
    this.safeHook(
      "FriendListLoadFriendList",
      0,
      (args: any, next: Function) => {
        const friendData = args[0];

        if (Array.isArray(friendData)) {
          this.onlineFriendsCache = friendData.length;
          this.isDirty = true;
        }
        this.isFetching = false;

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
      ServerSend("AccountQuery", { Query: "OnlineFriends" });

      setTimeout(() => {
        this.isFetching = false;
      }, 3000);
    }
  }

  /**
   * Retrieves the currently cached online friends count.
   *
   * @returns Cached friend count or pending indicator string.
   */
  public getOnlineFriendsCount(): number | string {
    return this.onlineFriendsCache;
  }

  /**
   * Compiles the full HTML for the roster view, applying role sorting and active filters.
   *
   * @param commandArguments - Space-delimited command filters (`"admins"`, `"vips"`, `"count"`).
   * @param wrapper - Whether to wrap the output in the outer dialog shell.
   * @param forceFullRows - Whether to return raw card HTML without wrapper scaffolding.
   * @returns Rendered HTML string.
   */
  public buildroster(
    commandArguments: string,
    wrapper: boolean = true,
    forceFullRows: boolean = false,
  ): string {
    if (typeof ChatRoomData === "undefined" || ChatRoomData === null) {
      return "";
    }

    this.requestOnlineFriends();

    let rosterStyle = "";
    if (Settings.instance.data.immersiveBlind) {
      const blindLevel = Immersion.getBlindnessLevel();
      if (blindLevel > 0) {
        const blurAmount = blindLevel * 5;
        rosterStyle = `filter: blur(${blurAmount}px); pointer-events: none; user-select: none; transition: filter 0.5s ease;`;
      }
    }

    const splitArguments = commandArguments.split(" ");
    let showme = true,
      showadmins = true,
      showvip = true,
      showplayers = true;

    if (splitArguments.some((item: any) => item.toLowerCase() === "count")) {
      showme = showadmins = showvip = showplayers = false;
    }
    if (splitArguments.some((item: any) => item.toLowerCase() === "admins")) {
      showme = showvip = showplayers = false;
    }
    if (splitArguments.some((item: any) => item.toLowerCase() === "vips")) {
      showme = showadmins = showplayers = false;
    }

    let rosterCards: {
      html: string;
      score: number;
      memberNumber: number;
      isMe: boolean;
      isAdmin: boolean;
      isVIP: boolean;
      isStandard: boolean;
    }[] = [];

    const effectiveSortMode = wrapper ? "role" : this.currentRosterSortMode;

    for (let characterIndex in ChatRoomData.Character) {
      const memberNumber = ChatRoomData.Character[characterIndex].MemberNumber;
      const character =
        typeof ChatRoomCharacter !== "undefined"
          ? ChatRoomCharacter.find((c: any) => c.MemberNumber == memberNumber)
          : null;

      if (!character) {
        rosterCards.push({
          html: `❓ <span style='color:#FF0000'>${this.t("status.unknown_person")}</span>\n`,
          score: 99,
          memberNumber: 9999999,
          isMe: false,
          isAdmin: false,
          isVIP: false,
          isStandard: true,
        });
        continue;
      }

      const isMe = character.IsPlayer();
      const isAdmin = ChatRoomData.Admin.includes(memberNumber);
      const isVIP =
        ChatRoomData.Whitelist.includes(memberNumber) && !isMe && !isAdmin;
      const isStandard = !isMe && !isAdmin && !isVIP;

      const badge = Icons.setbadge(character);
      const playerIcons = Icons.setIcons(character);
      const html = this.buildCard(character, badge, playerIcons, !wrapper);

      const score = Sorting.calculateSortScore(
        character,
        effectiveSortMode,
        parseInt(characterIndex, 10),
      );

      rosterCards.push({
        html,
        score,
        memberNumber,
        isMe,
        isAdmin,
        isVIP,
        isStandard,
      });
    }

    rosterCards.sort(
      (a, b) => a.score - b.score || a.memberNumber - b.memberNumber,
    );

    let output_rows = "";
    for (const card of rosterCards) {
      if (!showme && card.isMe) continue;
      if (!showadmins && card.isAdmin && !card.isMe) continue;
      if (!showvip && card.isVIP) continue;
      if (!showplayers && card.isStandard) continue;
      output_rows += card.html;
    }

    if (forceFullRows) return output_rows;

    const stats = this.getHeaderStats();

    let templatevars: Record<string, string> = {
      RosterStyle: rosterStyle,
      RosterLayoutClass: this.currentLayoutMode,
      adminIcon: `${Assets.printimage({ key: "admin", tooltip_override: this.t("header.tooltip_admins"), css_class_override: "CRABS_header_icons" })}`,
      adminsInRoom: `${stats.adminInRoom}`,
      totalAdmins: `${stats.totalAdmins}`,
      playerIcon: `${Assets.printimage({ key: "player", tooltip_override: this.t("header.tooltip_players"), css_class_override: "CRABS_header_icons" })}`,
      playersInRoom: `${stats.playersInRoom}`,
      totalPlayers: `${stats.totalPlayers}`,
      friendIcon: `${Assets.printimage({ key: "friend", tooltip_override: this.t("header.tooltip_friends"), css_class_override: "CRABS_header_icons" })}`,
      friendsOnline: `${stats.friendsOnline}`,
      totalFriends: `${stats.totalFriends}`,
      connectedIcon: `${Assets.printimage({ key: "connected", tooltip_override: this.t("header.tooltip_online"), css_class_override: "CRABS_header_icons" })}`,
      onlinePlayers: `${stats.onlinePlayers} `,
      playerRows: output_rows,
      MapActive: stats.isMap ? "true" : "false",
      collectedKeys: stats.keyHtml,
    };

    let wrappervars = {
      TitleBar: `${this.t("header.title_default")}`,
      Close: Assets.printimage({
        key: "close",
        tooltip_override: this.t("controls.close_dialog"),
        data: ["elementid", "CRABS_Roster"],
      }),
    };

    return this.template(rostertemplate, templatevars, wrapper, wrappervars);
  }

  /**
   * Computes an accessible CSS `text-shadow` rule if a player's label color
   * is too dark against standard UI backgrounds.
   *
   * @param labelColor - Hex or CSS color string to analyze.
   * @returns Inline CSS `text-shadow` rule or `"text-shadow: none !important;"`.
   */
  public getLabelShadow(labelColor: string): string {
    const brightness = this.getColorBrightness(labelColor);

    if (brightness < 70) {
      const outlineColor = this.getBrightOutlineColor(labelColor);
      return `text-shadow: -1px -1px 0 ${outlineColor}, 1px -1px 0 ${outlineColor}, -1px 1px 0 ${outlineColor}, 1px 1px 0 ${outlineColor} !important; -webkit-text-stroke: 0px;`;
    }

    return "text-shadow: none !important; -webkit-text-stroke: 0px;";
  }

  /**
   * Attaches interactive DOM listeners to roster cards, sort selectors,
   * tracking targets, and key-management triggers.
   *
   * @override
   * @param output - Raw HTML to inject before event attachment.
   * @param elementId - Optional container element ID.
   * @param root - Container root boundary for scoped event attachment.
   * @returns {void}
   */
  public override buildui(
    output?: string,
    elementId?: string,
    root?: HTMLElement,
  ): void {
    super.buildui(output, elementId, root);

    // ─────────────────────────────────────────────────────────────
    // History View Event Routing
    // ─────────────────────────────────────────────────────────────
    this.attachEvent(
      "CRABS_history_badge",
      (num) => History.openWCEProfile(num),
      "playerNumber",
      undefined,
      "click",
      "class",
      root,
    );

    this.attachEvent(
      "CRABS_history_name",
      (num) => History.sendFriendBeep(Number(num)),
      "playerNumber",
      undefined,
      "click",
      "class",
      root,
    );

    // ─────────────────────────────────────────────────────────────
    // Live Roster Event Routing
    // ─────────────────────────────────────────────────────────────

    this.attachEvent(
      "CRABS_player-badge",
      (num) => this.showPlayerFocus(num),
      "playerNumber",
      undefined,
      "click",
      "class",
      root,
    );
    this.attachEvent(
      "CRABS_player-id",
      this.copyToClipboard,
      "playerNumber",
      undefined,
      "click",
      "class",
      root,
    );

    this.attachEvent(
      "CRABS_card",
      Compass.onPlayerHover,
      "playerNumber",
      undefined,
      "mouseenter",
      "class",
      root,
    );
    this.attachEvent(
      "CRABS_card",
      Compass.onPlayerLeave,
      undefined,
      undefined,
      "mouseleave",
      "class",
      root,
    );
    this.attachEvent(
      "CRABS_card",
      Compass.onPlayerCardClick,
      "playerNumber",
      undefined,
      "click",
      "class",
      root,
    );

    this.attachEvent(
      "CRABS_track-compass",
      Compass.onPlayerToggleTrack,
      "playerNumber",
      undefined,
      "click",
      "class",
      root,
    );

    // ─────────────────────────────────────────────────────────────
    // Map Keys Navigation & Discard Routing
    // ─────────────────────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────────
    // Map Keys Navigation & Discard Routing
    // ─────────────────────────────────────────────────────────────

    this.attachEvent(
      "CRABS_key_content",
      () => Drawer.open("keys"),
      undefined,
      undefined,
      "click",
      "id",
      root,
    );

    // Back to Roster button
    this.attachEvent(
      "CRABS_keys_back_btn",
      () => Drawer.open("roster"),
      undefined,
      undefined,
      "click",
      "class",
      root,
    );

    // Drop Key button
    this.attachEvent(
      "CRABS_drop_key_btn",
      (dataVal: any) => {
        const targetKey = String(dataVal || "")
          .toLowerCase()
          .trim() as DropTarget;
        if (targetKey && Keys.dropMapKey(targetKey, this.t.bind(this))) {
          this.isDirty = true;
          Drawer.open("roster");
        }
      },
      "key",
      undefined,
      "click",
      "class",
      root,
    );
    const dropdown = (root || document).querySelector(
      "#CRABS_sort_dropdown",
    ) as HTMLSelectElement;
    if (dropdown) {
      Array.from(dropdown.options).forEach((opt) => {
        const localizedLabel = Sorting.getSortOptionLabel(opt.value);
        if (
          localizedLabel &&
          localizedLabel !== `roster.sort_options.${opt.value}`
        ) {
          opt.textContent = localizedLabel;
        }
      });

      dropdown.value = this.activeSortMode;

      dropdown.onchange = (e) => {
        const selectedMode = (e.target as HTMLSelectElement).value;

        if (this.isShowingHistory) {
          this.currentHistorySortMode = selectedMode;
          localStorage.setItem("CRABS_HistorySortMode", selectedMode);
        } else {
          this.currentRosterSortMode = selectedMode;
          localStorage.setItem("CRABS_SortMode", selectedMode);
        }

        const drawerRosterContainer = document.getElementById(
          "CRABS_Drawer_Roster",
        );
        if (drawerRosterContainer) {
          let updatedHtml = "";
          if (this.isShowingKeys) {
            updatedHtml = this.buildKeys();
          } else if (this.isShowingHistory) {
            updatedHtml = this.buildHistory();
          } else {
            updatedHtml = this.buildroster("all", false);
          }

          drawerRosterContainer.innerHTML = DOMPurify.sanitize(updatedHtml, {
            USE_PROFILES: { html: true },
          });
          this.buildui(undefined, undefined, drawerRosterContainer);
        }
      };
    }
  }
}
