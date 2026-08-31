import { CRABS_Base } from "../base";
import { Assets } from "../assets";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Settings } from "../settings";
import DOMPurify from "dompurify";
import "./templates/roster.css";
import rostertemplate from "./templates/roster.html";
import rostercardstemplate from "./templates/roster_cards.html";
import rostercardssingletemplate from "./templates/roster_cards_single.html";

import * as Icons from "./icons";
import * as Compass from "./compass";
import * as Sorting from "./sorting";
import * as Immersion from "./immersion";
import * as locales from "./i18n";
import { CrossMod } from "../crossmod";

/**
 * Class representing the enhanced player roster and related map features.
 */
export class Roster extends CRABS_Base {
  /** Proxies for external modules that reference these properties */
  public get chatLogHoveredPlayer(): number | null {
    return Compass.chatLogHoveredPlayer;
  }
  public set chatLogHoveredPlayer(val: number | null) {
    Compass.setChatLogHoveredPlayer(val);
  }

  public get hoveredMapPlayer(): number | null {
    return Compass.hoveredMapPlayer;
  }
  public set hoveredMapPlayer(val: number | null) {
    Compass.setHoveredMapPlayer(val);
  }

  public get trackedMapPlayer(): number | null {
    return Compass.trackedMapPlayer;
  }
  public set trackedMapPlayer(val: number | null) {
    Compass.setTrackedMapPlayer(val);
  }

  public clearTracking(): void {
    Compass.clearTracking();
  }

  public autoPaginateToPlayer(targetId: number): void {
    Compass.autoPaginateToPlayer(targetId);
  }

  /** Tracks the user's selected roster layout. Defaults to 2-column grid. */
  public currentLayoutMode: string =
    localStorage.getItem("CRABS_RosterLayout") || "layout-grid";

  public get layoutMode(): string {
    return this.currentLayoutMode;
  }

  public set layoutMode(val: string) {
    this.currentLayoutMode = val;
    localStorage.setItem("CRABS_RosterLayout", val);
    this.isDirty = true;
  }

  private onlineFriendsCache: number | string = "...";
  private lastSentTime: number = 0;
  private isFetching: boolean = false;
  public isDirty: boolean = true;

  private currentSortMode: string =
    localStorage.getItem("CRABS_SortMode") || "natural";

  /**
   * Creates an instance of the Roster module and initializes map and state hooks.
   *
   * @param {ModSDKModAPI} CRABS - The ModSDK API instance.
   */
  constructor(CRABS: ModSDKModAPI) {
    super(CRABS, "roster", locales);
    this.loadFriendList();
    this.setupEventHooks();

    window.addEventListener("mousemove", (e) => {
      const target = e.target as HTMLElement;
      Compass.setIsMouseOverCanvas(!!target && target.id === "MainCanvas");
    });
    window.addEventListener("mouseleave", () => {
      Compass.setIsMouseOverCanvas(false);
    });

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
            this.currentPerformanceLevel,
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

    this.safeHook("ChatRoomRun", 10, (args: any, next: Function) => {
      this.updatePerformanceState();
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

  /* ====================================================================
   * HELPER METHODS FOR CONSOLIDATION
   * ==================================================================== */

  /**
   * Generates the consolidated header stats to avoid duplicating logic.
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

    let keyHtml = "";
    if (isMap) {
      const KEYS = {
        keyBronze: pState?.HasKeyBronze,
        keySilver: pState?.HasKeySilver,
        keyGold: pState?.HasKeyGold,
      };
      for (const [key, value] of Object.entries(KEYS)) {
        keyHtml += Assets.printimage({ key: value ? (key as any) : "keyNull" });
      }
    }

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
   * Generates the compiled icons string for a character including cross-mod data.
   */
  private generatePlayerIcons(character: any): string {
    let iconsHTML = Icons.setIcons(character);

    // CROSS-MOD: AFC Lovers dynamic DOM update
    if (
      typeof character.MemberNumber === "number" &&
      CrossMod.isAFCLover(character.MemberNumber)
    ) {
      const afcRoom = CrossMod.getAFCLoverRoom(character.MemberNumber);
      const tooltip = afcRoom ? `AFC Lover (Room: ${afcRoom})` : "AFC Lover";

      iconsHTML += Assets.printimage({
        key: "lover",
        tooltip_override: tooltip,
        css_class_override: "CRABS_icon",
      });
    }

    return iconsHTML;
  }

  /* ==================================================================== */

  /**
   * Updates the DOM elements within the roster without a full redraw.
   *
   * @param {HTMLElement} root - The parent container element for the roster.
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

    // Use Helper
    const stats = this.getHeaderStats();

    updateText("#drawer-title", `CRABS: ${stats.currentRoomName}`);
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
          // Use Helper
          const newIconHTML = this.generatePlayerIcons(character);

          if (iconContainer.dataset.lastIcons !== newIconHTML) {
            iconContainer.innerHTML = DOMPurify.sanitize(newIconHTML);
            iconContainer.dataset.lastIcons = newIconHTML;
          }
        }
      }
    });
  }

  /**
   * Hooks into base-game functions that represent state changes.
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

      // AccountUpdate covers AFC's saveSharedSettings() triggers natively!
      if (messageType === "AccountUpdate") {
        this.isDirty = true;
      }
      return result;
    });
  }

  /**
   * Detects overflow in card wrappers and applies scrolling animation if necessary.
   *
   * @param {string} [containerSelector=".CRABS_overflow-wrapper"] - CSS selector for the containers to check.
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
   * Builds the HTML card for a single player in the roster.
   *
   * @param {any} character - Character object to render.
   * @param {string} badge - Rendered badge HTML string.
   * @param {string} playerIcons - Rendered relationship icons HTML string.
   * @param {boolean} [isDrawer=false] - Whether the card is inside the drawer view.
   * @returns {string} The processed HTML string for the player card.
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
    if (this.canvasContext) {
      this.canvasContext.clearRect(0, 0, 1, 1);
      this.canvasContext.fillStyle = labelColor;
      this.canvasContext.fillRect(0, 0, 1, 1);
      const data = this.canvasContext.getImageData(0, 0, 1, 1).data;
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
      !character.IsPlayer() &&
      Settings.instance.data.showMapCompass &&
      typeof ChatRoomMapViewIsActive === "function" &&
      ChatRoomMapViewIsActive() &&
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
   * Hooks into the friend list loading to capture the online friend count.
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
   * Requests the online friend count from the server if cooldown passed.
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
   * Returns the currently cached online friends count for dirty-checking.
   *
   * @returns {number | string} Cached online friends number or placeholder string.
   */
  public getOnlineFriendsCount(): number | string {
    return this.onlineFriendsCache;
  }

  /**
   * Generates the HTML for the player roster based on provided arguments.
   *
   * @param {string} commandArguments - Space-delimited command filters (e.g., "admins", "vips", "count").
   * @param {boolean} [wrapper=true] - Whether to surround the output with the main mod window wrapper.
   * @param {boolean} [forceFullRows=false] - When true, returns raw card HTML without template variables.
   * @returns {string} The compiled HTML string.
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

    const effectiveSortMode = wrapper ? "role" : this.currentSortMode;

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

      // Use Helper
      const playerIcons = this.generatePlayerIcons(character);

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

    // Use Helper
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
      TitleBar: `CRABS: ${this.t("header.title_default")}`,
      Close: Assets.printimage({
        key: "close",
        tooltip_override: this.t("controls.close_dialog"),
        data: ["elementid", "CRABS_Roster"],
      }),
    };

    return this.template(rostertemplate, templatevars, wrapper, wrappervars);
  }

  /**
   * Builds the user interface for the roster and attaches necessary events.
   *
   * @param {string} [output] - Optional HTML string to render.
   * @param {string} [elementId] - Optional ID for the root wrapper element.
   * @param {HTMLElement} [root] - Optional container element for attaching events.
   * @returns {void}
   */
  public override buildui(
    output?: string,
    elementId?: string,
    root?: HTMLElement,
  ): void {
    super.buildui(output, elementId, root);

    this.attachEvent(
      "CRABS_player-badge",
      this.showPlayerFocus,
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

      dropdown.value = this.currentSortMode;

      dropdown.onchange = (e) => {
        this.currentSortMode = (e.target as HTMLSelectElement).value;
        localStorage.setItem("CRABS_SortMode", this.currentSortMode);

        const drawerRosterContainer = document.getElementById(
          "CRABS_Drawer_Roster",
        );
        if (drawerRosterContainer) {
          const updatedHtml = this.buildroster("all", false);
          drawerRosterContainer.innerHTML = DOMPurify.sanitize(updatedHtml, {
            USE_PROFILES: { html: true },
          });
          this.buildui(undefined, undefined, drawerRosterContainer);
        }
      };
    }
  }
}
