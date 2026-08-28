/**
 * CRABS Roster Module
 *
 * This module implements the enhanced roster functionality for the CRABS mod.
 * It provides:
 * - Custom roster display with enhanced features
 * - Roster template rendering system
 * - CSS styling for roster elements
 * - Online friends tracking
 * - Event-driven data synchronization
 *
 */

// CRABS components
import { CRABS_Base } from "../base";
import { Assets } from "../assets";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Settings } from "../settings";
import DOMPurify from "dompurify";
import "../templates/roster.css";
import rostertemplate from "../templates/roster.html";
import rostercardstemplate from "../templates/roster_cards.html";

// module components
import * as Compass from "./compass";
import * as Icons from "./icons";
import * as Immersion from "./immersion";
import * as Sorting from "./sorting";

/**
 * Class representing the enhanced player roster and related map features.
 */
export class Roster extends CRABS_Base {
  /**
   * The player currently hovered over in the chat log.
   * Proxies directly to the internal Compass module state.
   */
  public get chatLogHoveredPlayer(): number | null {
    return Compass.chatLogHoveredPlayer;
  }
  public set chatLogHoveredPlayer(val: number | null) {
    Compass.setChatLogHoveredPlayer(val);
  }

  /**
   * The member number of the player currently hovered on the room map or canvas.
   * Proxies directly to the internal Compass module state.
   */
  public get hoveredMapPlayer(): number | null {
    return Compass.hoveredMapPlayer;
  }
  public set hoveredMapPlayer(val: number | null) {
    Compass.setHoveredMapPlayer(val);
  }

  /**
   * The member number of the player currently locked via tap/click tracking.
   * Proxies directly to the internal Compass module state.
   */
  public get trackedMapPlayer(): number | null {
    return Compass.trackedMapPlayer;
  }
  public set trackedMapPlayer(val: number | null) {
    Compass.setTrackedMapPlayer(val);
  }

  /**
   * Clears the currently tracked map player and removes active styling from compass icons.
   * Delegated to `Compass.clearTracking()`.
   */
  public clearTracking(): void {
    Compass.clearTracking();
  }

  /**
   * Reverse Compass: Switches the base game's ChatRoom pagination to the page containing the targeted player.
   * Delegated to `Compass.autoPaginateToPlayer()`.
   * @param {number} targetId - The MemberNumber of the player to locate and navigate to.
   */
  public autoPaginateToPlayer(targetId: number): void {
    Compass.autoPaginateToPlayer(targetId);
  }

  /** Cached count of online friends. */
  private onlineFriendsCache: number | string = "...";

  /** Timestamp for the last server request to prevent spamming. */
  private lastSentTime: number = 0;

  /** Prevents multiple requests from firing at the same time. */
  private isFetching: boolean = false;

  /** Flag indicating the roster data has changed and needs a redraw. */
  public isDirty: boolean = true;

  /** Tracks the user's selected sort order in the drawer. */
  private currentSortMode: string =
    localStorage.getItem("CRABS_SortMode") || "role";

  /**
   * Creates an instance of the Roster module and initializes map and state hooks.
   * @param {ModSDKModAPI} CRABS - The ModSDK API instance.
   */
  constructor(CRABS: ModSDKModAPI) {
    super(CRABS);
    this.loadFriendList();
    this.setupEventHooks();

    // Track when the mouse enters/leaves the canvas to prevent stuck hovers
    window.addEventListener("mousemove", (e) => {
      const target = e.target as HTMLElement;
      Compass.setIsMouseOverCanvas(!!target && target.id === "MainCanvas");
    });
    window.addEventListener("mouseleave", () => {
      Compass.setIsMouseOverCanvas(false);
    });

    // Capture the math during the character drawing phase
    this.safeHook("DrawCharacter", -100, (args: any, next: Function) => {
      const globalWindow = window as any;
      let isTarget = false;

      // Unconditionally capture coordinates for hover hit-testing
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

        // Canvas hover detection
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
            // Characters draw back-to-front. Last one passing this check is on top.
            Compass.setCurrentFrameHoveredPlayer(character.MemberNumber);
          }
        }
        // --

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

      // Map hover detection
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

          // Convert absolute mouse pixels to grid coordinates
          const hoverGridX = Math.floor(mouseX / tileW);
          const hoverGridY = Math.floor(mouseY / tileW);

          // Iterate backwards so the top-most overlapping player wins
          const characters = globalWindow.ChatRoomCharacter || [];
          for (let i = characters.length - 1; i >= 0; i--) {
            const c = characters[i];
            if (c?.MapData?.Pos) {
              const dX = c.MapData.Pos.X - player.MapData.Pos.X;
              const dY = c.MapData.Pos.Y - player.MapData.Pos.Y;

              const charScreenX = dX + range;
              const charScreenY = dY + range;

              // Check both the base tile (feet) and the tile directly above it (head/torso)
              const isHoveringCharacter =
                hoverGridX === charScreenX &&
                (hoverGridY === charScreenY || hoverGridY === charScreenY - 1);

              if (isHoveringCharacter) {
                // Ensure the base tile is actually visible to the player (not in fog of war)
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
      // --

      // Combine the canvas hit-detection with the chat log hover state
      const combinedHover =
        Compass.currentFrameHoveredPlayer || Compass.chatLogHoveredPlayer;

      if (Compass.canvasHoveredPlayer !== combinedHover) {
        Compass.setCanvasHoveredPlayer(combinedHover);
        Compass.syncCanvasHoverToDOM(combinedHover);
      }

      return result;
    });
  }

  /**
   * Updates the DOM elements within the roster without a full redraw.
   * Falls back to buildroster() if the container is missing or room composition changed.
   * @param {HTMLElement} root - The parent container element for the roster.
   */
  public updateRosterUI(root: HTMLElement): void {
    const globalWindow = window as any;
    const chatRoomData = globalWindow.ChatRoomData;
    const chatRoomCharacter = globalWindow.ChatRoomCharacter || [];
    const playerWindow = globalWindow.Player;

    if (typeof chatRoomData === "undefined" || chatRoomData === null) return;

    const updateText = (id: string, text: string) => {
      const el = root.querySelector(id);
      if (el && el.textContent !== text) el.textContent = text;
    };

    const currentRoomName = chatRoomData.Name || "Roster";
    updateText("#drawer-title", `CRABS: ${currentRoomName}`);

    const admins = chatRoomData.Admin || [];
    const adminInRoom =
      chatRoomData.Character?.filter((c: any) =>
        admins.includes(c.MemberNumber),
      ).length || 0;

    updateText("#CRABS_header_admins", `${adminInRoom}/${admins.length}`);
    updateText(
      "#CRABS_header_players",
      `${chatRoomCharacter.length}/${chatRoomData.Limit || 0}`,
    );
    updateText(
      "#CRABS_header_friends",
      `${this.onlineFriendsCache}/${playerWindow?.FriendList?.length || 0}`,
    );
    updateText(
      "#CRABS_header_online",
      `${typeof globalWindow.CurrentOnlinePlayers !== "undefined" ? globalWindow.CurrentOnlinePlayers : ""} `,
    );

    const keyContainer = root.querySelector(
      "#CRABS_key_container",
    ) as HTMLElement;
    const keyContent = root.querySelector("#CRABS_key_content") as HTMLElement;

    if (keyContainer && keyContent) {
      const isMap =
        typeof globalWindow.ChatRoomMapViewIsActive === "function"
          ? globalWindow.ChatRoomMapViewIsActive()
          : false;
      const activeStr = isMap ? "true" : "false";

      if (keyContainer.getAttribute("data-map-active") !== activeStr) {
        keyContainer.setAttribute("data-map-active", activeStr);
      }

      if (isMap) {
        const pState = playerWindow?.MapData?.PrivateState;
        const currentKeyState = `${pState?.HasKeyBronze}-${pState?.HasKeySilver}-${pState?.HasKeyGold}`;

        if (keyContent.dataset.lastKeys !== currentKeyState) {
          let keyHtml = "";
          const KEYS = {
            keyBronze: pState?.HasKeyBronze,
            keySilver: pState?.HasKeySilver,
            keyGold: pState?.HasKeyGold,
          };
          for (const [key, value] of Object.entries(KEYS)) {
            keyHtml += Assets.printimage({
              key: value ? (key as any) : "keyNull",
            });
          }

          keyContent.innerHTML = keyHtml;
          keyContent.dataset.lastKeys = currentKeyState;
        }
      } else if (keyContent.innerHTML !== "") {
        keyContent.innerHTML = "";
        keyContent.removeAttribute("data-last-keys");
      }
    }

    const container = root.querySelector(".CRABS_card-container");
    const currentCardCount = container?.querySelectorAll(".CRABS_card").length;
    const characterCount = chatRoomData.Character?.length || 0;

    if (currentCardCount !== characterCount) {
      if (container) {
        container.innerHTML = DOMPurify.sanitize(
          this.buildroster("all", false, true),
        );
        this.buildui(undefined, undefined, root);
        return;
      }
    }

    if (chatRoomData.Character) {
      chatRoomData.Character.forEach((charData: any) => {
        const card = root.querySelector(`#CRABS_card_${charData.MemberNumber}`);
        const character = chatRoomCharacter.find(
          (c: any) => c.MemberNumber === charData.MemberNumber,
        );

        if (card && character) {
          const nameContainer = card.querySelector(
            ".CRABS_player-name",
          ) as HTMLElement;
          if (nameContainer) {
            const currentNickname = globalWindow
              .CharacterNickname(character)
              .normalize("NFKC");
            if (nameContainer.textContent !== currentNickname) {
              nameContainer.textContent = currentNickname;
            }
          }

          const statusContainer = card.querySelector(
            ".CRABS_status-icons",
          ) as HTMLElement;
          if (statusContainer) {
            const currentEffects = globalWindow
              .CharacterGetEffects(character)
              .join(",");
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
  }

  /**
   * Hooks into base-game functions that represent state changes.
   * When these fire, the roster is flagged as dirty, triggering a UI refresh in the Drawer.
   * Utilizes safeHook to degrade gracefully if a game update breaks an API.
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

      if (messageType === "AccountUpdate") {
        this.isDirty = true;
      }
      return result;
    });
  }

  /**
   * Detects overflow in card wrappers and applies scrolling animation if necessary.
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
   * @param {PlayerCharacter} character - The player character object.
   * @param {string} badge - HTML string for the player's room badge (Admin/VIP/Guest).
   * @param {string} playerIcons - HTML string for the player's relational icons (Owner/Friend/etc).
   * @param {boolean} isDrawer - true if we are in a drawer, false if in chat
   * @returns {string} The rendered HTML card.
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
      ChatRoomMapViewIsActive() &&
      isDrawer
    ) {
      const trackedClass =
        Compass.trackedMapPlayer === character.MemberNumber
          ? "CRABS_compass-active"
          : "";
      const compassIcon = Assets.printimage({
        key: "compass",
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
      PlayerName: CharacterNickname(character).normalize("NFKC"),
      PlayerIcons: playerIcons,
      StatusIcons: `${Icons.setStatusIcons(character)}`,
      CompassBlock: compassBlock,
    };

    return this.template(rostercardstemplate, templatevars, false);
  }

  /**
   * Hooks into the friend list loading to capture the online friend count.
   * Flags the roster as dirty so the UI synchronizes with the new friend data.
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
   * Requests the online friend count from the server if the 5-minute cooldown has passed.
   * This is a "fire and forget" method; the UI will redraw when the hook catches the response.
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

  /** Returns the currently cached online friends count for dirty-checking. */
  public getOnlineFriendsCount(): number | string {
    return this.onlineFriendsCache;
  }

  /**
   * Generates the HTML for the player roster based on provided arguments.
   * @param {string} commandArguments - Command arguments determining which players to display.
   * @param {boolean} [wrapper=true] - Whether to include the standard UI wrapper.
   * @param {boolean} [forceFullRows=false] - If true, returns only the player rows for surgical DOM updates.
   * @returns {string} The completed HTML roster.
   */
  public buildroster(
    commandArguments: string,
    wrapper: boolean = true,
    forceFullRows: boolean = false,
  ): string {
    const globalWindow = window as any;
    const chatRoomData = globalWindow.ChatRoomData;
    const chatRoomCharacter = globalWindow.ChatRoomCharacter || [];

    // Revert to original check: ensures the outer HTML shell renders even if arrays are still loading.
    if (typeof chatRoomData === "undefined" || chatRoomData === null) {
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

    let admin_count = 0;
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

    // Safely default to empty arrays to prevent mapping errors during transitions
    const characters = chatRoomData.Character || [];
    const admins = chatRoomData.Admin || [];
    const whitelist = chatRoomData.Whitelist || [];

    for (let characterIndex in characters) {
      const memberNumber = characters[characterIndex].MemberNumber;
      const character = chatRoomCharacter.find(
        (c: any) => c.MemberNumber == memberNumber,
      );

      if (!character) {
        rosterCards.push({
          html: "❓ <span style='color:#FF0000'>[Unknown Person]</span>\n",
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
      const isAdmin = admins.includes(memberNumber);
      const isVIP = whitelist.includes(memberNumber) && !isMe && !isAdmin;
      const isStandard = !isMe && !isAdmin && !isVIP;

      if (isAdmin) admin_count++;

      const badge = Icons.setbadge(character);
      let playerIcons = Icons.setIcons(character);

      const html = this.buildCard(character, badge, playerIcons, !wrapper);
      const score = Sorting.calculateSortScore(character, effectiveSortMode);

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

    const playerWindow = globalWindow.Player;
    const isMap =
      typeof globalWindow.ChatRoomMapViewIsActive === "function"
        ? globalWindow.ChatRoomMapViewIsActive()
        : false;

    let templatevars: Record<string, string> = {
      RosterStyle: rosterStyle,
      adminIcon: `${Assets.printimage({ key: "admin", tooltip_override: "Admins", css_class_override: "CRABS_header_icons" })}`,
      adminsInRoom: `${admin_count}`,
      totalAdmins: `${admins.length}`,
      playerIcon: `${Assets.printimage({ key: "player", tooltip_override: "Players", css_class_override: "CRABS_header_icons" })}`,
      playersInRoom: `${chatRoomCharacter.length}`,
      totalPlayers: `${chatRoomData.Limit || 0}`,
      friendIcon: `${Assets.printimage({ key: "friend", tooltip_override: "Friends", css_class_override: "CRABS_header_icons" })}`,
      friendsOnline: `${this.onlineFriendsCache}`,
      totalFriends: `${playerWindow?.FriendList?.length || 0}`,
      connectedIcon: `${Assets.printimage({ key: "connected", tooltip_override: "Online Accounts", css_class_override: "CRABS_header_icons" })}`,
      onlinePlayers: `${typeof globalWindow.CurrentOnlinePlayers !== "undefined" ? globalWindow.CurrentOnlinePlayers : ""} `,
      playerRows: output_rows,
      MapActive: isMap ? "true" : "false",
    };

    let displaykeys = "";
    const KEYS = {
      keyBronze: playerWindow?.MapData?.PrivateState?.HasKeyBronze,
      keySilver: playerWindow?.MapData?.PrivateState?.HasKeySilver,
      keyGold: playerWindow?.MapData?.PrivateState?.HasKeyGold,
    };

    for (const [key, value] of Object.entries(KEYS)) {
      displaykeys += Assets.printimage({
        key: value ? (key as any) : "keyNull",
      });
    }
    templatevars["collectedKeys"] = displaykeys;

    let wrappervars = {
      TitleBar: `CRABS: Roster`,
      Close: Assets.printimage({
        key: "close",
        data: ["elementid", "CRABS_Roster"],
      }),
    };

    if (forceFullRows) return output_rows;

    return this.template(rostertemplate, templatevars, wrapper, wrappervars);
  }

  /**
   * Builds the user interface for the roster and attaches necessary events.
   * @param {string} [output] - The HTML string to be displayed.
   * @param {string} [elementId] - Optional ID for the roster element.
   * @param {HTMLElement} [root] - Optional root element for event attachment.
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
