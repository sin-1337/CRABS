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

import { CRABS_Base, PerformanceLevel } from "./base";
import { Assets } from "./assets";
import { CrossMod } from "./crossmod";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Settings } from "./settings";
import DOMPurify from "dompurify";
import "./templates/roster.css";
import rostertemplate from "./templates/roster.html";
import rostercardstemplate from "./templates/roster_cards.html";

/**
 * Class representing the enhanced player roster and related map features.
 */
export class Roster extends CRABS_Base {
	/** Cached count of online friends. */
	private onlineFriendsCache: number | string = "...";

	/** Timestamp for the last server request to prevent spamming. */
	private lastSentTime: number = 0;

	/** Prevents multiple requests from firing at the same time. */
	private isFetching: boolean = false;

	/** Flag indicating the roster data has changed and needs a redraw. */
	public isDirty: boolean = true;

	/** Tracks the user's selected sort order in the drawer. */
	private currentSortMode: string = localStorage.getItem("CRABS_SortMode") || "role";

	/** The member number of the player currently hovered on the map. */
	public hoveredMapPlayer: number | null = null;

	/** The member number of the player currently locked via tap/click (Mobile Friendly). */
	private trackedMapPlayer: number | null = null;

	/** Caches the measured width of player names to prevent off-center arrows on name changes. */
	private nameWidthCache: Map<number, { name: string, width: number }> = new Map();

	/** Timer for the hover delay mode to prevent accidental pagination. */
	private hoverTimeout: number | null = null;

	/** Caches the indicator coordinates so it can be drawn at the absolute end of the frame. */
	private deferredIndicator: { character: any, x: number, y: number, zoom: number } | null = null;

	/** Tracks if the mouse is physically over the game canvas (not an HTML UI overlay or off-screen) */
	private isMouseOverCanvas: boolean = false;

	/** The player currently hovered on the main canvas (to sync to DOM) */
	public canvasHoveredPlayer: number | null = null;

	/** Temporary variable to calculate the top-most hovered player per frame */
	private currentFrameHoveredPlayer: number | null = null;

	/** Timeout to prevent scroll jittering */
	private scrollTimeout: number | null = null;

	/** Which player are we hovering over in the chat log */
	public chatLogHoveredPlayer: number | null = null;

	/**
	 * Applies a simulated CSS hover state to a player's roster card and scrolls it into view.
	 * @param memberNumber - The ID of the hovered player, or null to clear.
	 */
	public syncCanvasHoverToDOM(memberNumber: number | null): void {
		// Clear existing simulated hovers
		document.querySelectorAll('.CRABS_card.CRABS_simulated-hover').forEach(el => {
			el.classList.remove('CRABS_simulated-hover');
		});

		if (this.scrollTimeout) {
			window.clearTimeout(this.scrollTimeout);
			this.scrollTimeout = null;
		}

		if (memberNumber !== null) {
			const card = document.querySelector(`#CRABS_card_${memberNumber}`);
			if (card) {
				card.classList.add('CRABS_simulated-hover');

				// Only scroll if the setting is enabled AND the card is inside the Drawer
				const isInsideDrawer = card.closest('#CRABS_Drawer_Roster') !== null;

				if (isInsideDrawer && Settings.instance.data.autoScrollRoster) {
					// Wait 150ms before scrolling to prevent rapid-wiggle spam
					this.scrollTimeout = window.setTimeout(() => {
						card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
					}, 150);
				}
			}
		}
	}

	/** * Handler for when a player's entry is hovered in the roster UI. 
	 * Evaluates the current pageShiftMode setting to determine the interaction response.
	 * @param {string} playerId - The ID of the hovered player.
	 */
	private onPlayerHover = (playerId: string) => {
		if (this.trackedMapPlayer !== null || !playerId) return;

		const id = parseInt(playerId, 10);
		if (!isNaN(id)) {
			if (this.hoveredMapPlayer !== id) {
			}
			this.hoveredMapPlayer = id;

			// ONLY return early here so we don't start the pagination timer
			if (!Settings.instance.data.pageFocusHover) return;

			// Enforce the 500ms delay for auto-pagination
			this.hoverTimeout = window.setTimeout(() => {
				this.autoPaginateToPlayer(id);
			}, 500);
		}
	};

	/** 
	 * Handler for when a player's entry is no longer hovered. 
	 * Clears active hover states and cancels any pending delayed shifts.
	 */
	private onPlayerLeave = () => {
		this.hoveredMapPlayer = null;
		if (this.hoverTimeout) {
			window.clearTimeout(this.hoverTimeout);
			this.hoverTimeout = null;
		}
	};

	/** * Handler for explicit clicks on a player's roster card. 
	 * @param {string} playerId - The ID of the clicked player.
	 */
	private onPlayerCardClick = (playerId: string) => {
		// Clicks should always work instantly, overriding any hover delays
		const id = parseInt(playerId, 10);
		if (!isNaN(id)) {
			this.autoPaginateToPlayer(id);
		}
	};

	/** * Creates an instance of the Roster module and initializes map and state hooks.
	 * @param {ModSDKModAPI} CRABS - The ModSDK API instance.
	 */
	constructor(CRABS: ModSDKModAPI) {
		super(CRABS);
		this.loadFriendList();
		this.setupEventHooks();

		// Track when the mouse enters/leaves the canvas to prevent stuck hovers
		window.addEventListener("mousemove", (e) => {
			const target = e.target as HTMLElement;
			this.isMouseOverCanvas = !!target && target.id === "MainCanvas";
		});
		window.addEventListener("mouseleave", () => {
			this.isMouseOverCanvas = false;
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

			if (globalWindow.CurrentScreen === "ChatRoom" &&
				globalWindow.ChatRoomHideIconState < 3 &&
				globalWindow.Player?.OnlineSettings?.ShowNames !== false) {

				const isMap = globalWindow.ChatRoomMapViewIsActive && globalWindow.ChatRoomMapViewIsActive();
				const targetId = this.trackedMapPlayer || this.hoveredMapPlayer;

				// Canvas hover detection 
				const mouseX = globalWindow.MouseX;
				const mouseY = globalWindow.MouseY;

				if (this.isMouseOverCanvas && typeof mouseX === "number" && typeof mouseY === "number") {
					if (!isMap && mouseX < 1000 && this.hoveredMapPlayer === null &&
						mouseX >= drawX && mouseX <= drawX + (500 * zoom) &&
						mouseY >= drawY && mouseY <= drawY + (1000 * zoom)) {

						// Characters draw back-to-front. Last one passing this check is on top.
						this.currentFrameHoveredPlayer = character.MemberNumber;
					}
				}
				// --

				if (!isMap && targetId && character.MemberNumber === targetId) {
					isTarget = true;
					this.drawFocusGlow(character, drawX, drawY, zoom);
				}
			}

			const result = next(args);

			if (isTarget) {
				const centerX = drawX + (250 * zoom);
				const nameY = drawY + (975 * zoom);
				this.deferredIndicator = { character, x: centerX, y: nameY, zoom };
			}

			return result;
		});


		this.safeHook("ChatRoomRun", 10, (args: any, next: Function) => {
			this.updatePerformanceState();
			this.currentFrameHoveredPlayer = null;
			this.deferredIndicator = null;

			const result = next(args);

			// Updated type cast to include zoom
			const indicator = this.deferredIndicator as { character: any, x: number, y: number, zoom: number } | null;

			if (indicator && indicator.x >= 0 && indicator.x <= 1000 && indicator.y >= 0 && indicator.y <= 1000) {
				this.drawNameIndicator(
					indicator.character,
					indicator.x,
					indicator.y,
				);
				this.deferredIndicator = null;
			}
			this.drawCompass();

			// Map hover detection
			const globalWindow = window as any;
			const isMap = globalWindow.ChatRoomMapViewIsActive && globalWindow.ChatRoomMapViewIsActive();

			if (isMap && this.isMouseOverCanvas) {
				const mouseX = globalWindow.MouseX;
				const mouseY = globalWindow.MouseY;
				const range = globalWindow.ChatRoomMapViewPerceptionRange;
				const player = globalWindow.Player;

				if (typeof mouseX === "number" && typeof mouseY === "number" && typeof range === "number" && player?.MapData?.Pos) {
					const tileW = 1000 / ((range * 2) + 1);

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
							const isHoveringCharacter = hoverGridX === charScreenX &&
								(hoverGridY === charScreenY || hoverGridY === charScreenY - 1);

							if (isHoveringCharacter) {
								// Ensure the base tile is actually visible to the player (not in fog of war)
								const tileIndex = c.MapData.Pos.X + (c.MapData.Pos.Y * globalWindow.ChatRoomMapViewWidth);
								const isVisible = globalWindow.ChatRoomMapViewVisibilityMask && globalWindow.ChatRoomMapViewVisibilityMask[tileIndex];

								if (isVisible) {
									this.currentFrameHoveredPlayer = c.MemberNumber;
									break;
								}
							}
						}
					}
				}
			}
			// --

			// Combine the canvas hit-detection with the chat log hover state
			const combinedHover = this.currentFrameHoveredPlayer || this.chatLogHoveredPlayer;

			if (this.canvasHoveredPlayer !== combinedHover) {
				this.canvasHoveredPlayer = combinedHover;
				this.syncCanvasHoverToDOM(this.canvasHoveredPlayer);
			}

			return result;
		});
	}

	/**
	 * Automatically switches the base game's ChatRoom pagination to the page
	 * containing the targeted player, accounting for mods that alter visual order.
	 * @param targetId The MemberNumber of the player to locate.
	 */
	private autoPaginateToPlayer(targetId: number): void {
		const globalWindow = window as any;

		if (
			globalWindow.CurrentScreen !== "ChatRoom" ||
			typeof globalWindow.ChatRoomCharacterViewOffset !== "number" ||
			!Array.isArray(globalWindow.ChatRoomCharacter) ||
			globalWindow.ChatRoomCharacter.length <= 10
		) {
			return;
		}

		if (globalWindow.ChatRoomCharacterDrawlist?.some((c: any) => c.MemberNumber === targetId)) {
			return;
		}

		const originalOffset = globalWindow.ChatRoomCharacterViewOffset;
		const charCount = globalWindow.ChatRoomCharacter.length;

		const charIndex = globalWindow.ChatRoomCharacter.findIndex((c: any) => c.MemberNumber === targetId);
		if (charIndex !== -1) {
			const expectedOffset = Math.floor(charIndex / 10) * 10;
			globalWindow.ChatRoomCharacterViewOffset = expectedOffset;
			if (typeof globalWindow.ChatRoomUpdateDisplay === "function") {
				globalWindow.ChatRoomUpdateDisplay();
			}

			if (globalWindow.ChatRoomCharacterDrawlist?.some((c: any) => c.MemberNumber === targetId)) {
				return;
			}
		}

		const highestValidOffset = Math.max(0, Math.floor((charCount - 1) / 10) * 10);
		let found = false;

		for (let offset = 0; offset <= highestValidOffset; offset += 10) {
			globalWindow.ChatRoomCharacterViewOffset = offset;
			if (typeof globalWindow.ChatRoomUpdateDisplay === "function") {
				globalWindow.ChatRoomUpdateDisplay();
			}

			if (globalWindow.ChatRoomCharacterDrawlist?.some((c: any) => c.MemberNumber === targetId)) {
				found = true;
				break;
			}
		}

		if (!found) {
			globalWindow.ChatRoomCharacterViewOffset = originalOffset;
			if (typeof globalWindow.ChatRoomUpdateDisplay === "function") {
				globalWindow.ChatRoomUpdateDisplay();
			}
		}
	}

	/**
	 * Updates the DOM elements within the roster without a full redraw.
	 * Falls back to buildroster() if the container is missing or room composition changed.
	 * @param {HTMLElement} root - The parent container element for the roster.
	 */
	public updateRosterUI(root: HTMLElement): void {
		if (typeof ChatRoomData === 'undefined' || ChatRoomData === null) return;

		const updateText = (id: string, text: string) => {
			const el = root.querySelector(id);
			if (el && el.textContent !== text) el.textContent = text;
		};

		const currentRoomName = ChatRoomData.Name || "Roster";
		updateText("#drawer-title", `CRABS: ${currentRoomName}`);

		const adminInRoom = ChatRoomData.Character.filter((c: any) => ChatRoomData.Admin.includes(c.MemberNumber)).length;
		updateText("#CRABS_header_admins", `${adminInRoom}/${ChatRoomData.Admin.length}`);
		updateText("#CRABS_header_players", `${ChatRoomCharacter.length}/${ChatRoomData.Limit}`);
		updateText("#CRABS_header_friends", `${this.onlineFriendsCache}/${Player.FriendList.length}`);
		updateText("#CRABS_header_online", `${typeof CurrentOnlinePlayers !== "undefined" ? CurrentOnlinePlayers : ""} `);

		const keyContainer = root.querySelector("#CRABS_key_container") as HTMLElement;
		const keyContent = root.querySelector("#CRABS_key_content") as HTMLElement;

		if (keyContainer && keyContent) {
			const isMap = ChatRoomMapViewIsActive();
			const activeStr = isMap ? "true" : "false";

			if (keyContainer.getAttribute("data-map-active") !== activeStr) {
				keyContainer.setAttribute("data-map-active", activeStr);
			}

			if (isMap) {
				const playerWindow = (window as any).Player;
				const pState = playerWindow.MapData?.PrivateState;

				const currentKeyState = `${pState?.HasKeyBronze}-${pState?.HasKeySilver}-${pState?.HasKeyGold}`;

				if (keyContent.dataset.lastKeys !== currentKeyState) {
					let keyHtml = "";
					const KEYS = {
						keyBronze: pState?.HasKeyBronze,
						keySilver: pState?.HasKeySilver,
						keyGold: pState?.HasKeyGold,
					};
					for (const [key, value] of Object.entries(KEYS)) {
						keyHtml += Assets.printimage({ key: value ? (key as any) : "keyNull" });
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
		if (currentCardCount !== ChatRoomData.Character.length) {
			if (container) {
				container.innerHTML = DOMPurify.sanitize(this.buildroster("all", false, true));
				this.buildui(undefined, undefined, root);
				return;
			}
		}

		ChatRoomData.Character.forEach((charData: any) => {
			const card = root.querySelector(`#CRABS_card_${charData.MemberNumber}`);
			const character = ChatRoomCharacter.find(c => c.MemberNumber === charData.MemberNumber);

			if (card && character) {

				// Handle nickname changes
				const nameContainer = card.querySelector(".CRABS_player-name") as HTMLElement;
				if (nameContainer) {
					const currentNickname = CharacterNickname(character).normalize("NFKC");
					if (nameContainer.textContent !== currentNickname) {
						nameContainer.textContent = currentNickname;
					}
				}

				// Handle status icons
				const statusContainer = card.querySelector(".CRABS_status-icons") as HTMLElement;
				if (statusContainer) {
					const currentEffects = CharacterGetEffects(character).join(",");

					if (statusContainer.dataset.lastEffects !== currentEffects) {
						statusContainer.innerHTML = DOMPurify.sanitize(this.setStatusIcons(character));
						statusContainer.dataset.lastEffects = currentEffects;
					}
				}

				// Handle relationship icons
				const iconContainer = card.querySelector(".CRABS_player-icons") as HTMLElement;
				if (iconContainer) {
					const newIconHTML = this.setIcons(character);

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

	/** * Detects overflow in card wrappers and applies scrolling animation if necessary.
	 * @param {string} [containerSelector=".CRABS_overflow-wrapper"] - CSS selector for the containers to check.
	 * @returns {void}
	 */
	public initScrollingOverflow(
		containerSelector: string = ".CRABS_overflow-wrapper"
	): void {
		const wrappers = document.querySelectorAll<HTMLElement>(containerSelector);

		wrappers.forEach((wrapper) => {
			const scroller = wrapper.querySelector<HTMLElement>(
				".CRABS_overflow-scroll"
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
	 * Determines the status icons for a player based on their current effects (Deaf, Blind, Gagged).
	 * @param {Character} character - The character object to check.
	 * @returns {string} HTML string containing the status icons.
	 */
	private setStatusIcons(character: any): string {
		const prefixes = ["Blind", "Gag", "Deaf"];
		const effects = CharacterGetEffects(character);

		const effectLists: { [key: string]: { [key: string]: number } } = {
			Blind: {
				BlindLight: 1,
				BlindNormal: 2,
				BlindHeavy: 3,
				BlindTotal: 4,
			},
			Gag: {
				GagVeryLight: 1,
				GagEasy: 1,
				GagLight: 1,
				GagNormal: 2,
				GagMedium: 2,
				GagHeavy: 3,
				GagVeryHeavy: 3,
				GagTotal: 4,
				GagTotal2: 4,
				GagTotal3: 4,
				GagTotal4: 4,
			},
			Deaf: {
				DeafLight: 1,
				DeafNormal: 2,
				DeafHeavy: 3,
				DeafTotal: 4,
			},
		};

		const icons: { [key: string]: string } = {
			Blind: "",
			Gag: "",
			Deaf: "",
		};

		const updateIcon = (prefix: string, effect: string): void => {
			const effectName = effect.charAt(0).toLowerCase() + effect.slice(1);
			const effectList = effectLists[prefix];

			if (effect in effectList) {
				const effectValue = effectList[effect];
				if (
					effectValue >
					(icons[prefix] ? parseInt(icons[prefix].split(": ")[1]) : 0)
				) {
					icons[prefix] = Assets.printimage({
						key: effectName,
						tooltip_override: `${prefix}: ${effectValue}`,
						css_class_override: `CRABS_status-icon`,
						css_style: `--brightness: brightness(2.5);
            background: linear-gradient(to right, #202020 10%, var(--border-color, white) 80%, transparent 100%);
            `,
					});
				}
			}
		};

		for (let effect of effects) {
			for (let prefix of prefixes) {
				if (effect.startsWith(prefix)) {
					updateIcon(prefix, effect);
				}
			}
		}

		icons.Blind = icons.Blind || Assets.printimage({
			key: "blindNone", css_class_override: "CRABS_status-icon"
		});
		icons.Gag = icons.Gag || Assets.printimage({
			key: "gagNone", css_class_override: "CRABS_status-icon"
		});
		icons.Deaf = icons.Deaf || Assets.printimage({
			key: "deafNone", css_class_override: "CRABS_status-icon"
		});

		return `${icons.Gag} ${icons.Blind} ${icons.Deaf}`;
	}

	/** * Builds the HTML card for a single player in the roster.
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

		let r = 255, g = 255, b = 255;
		if (this.canvasContext) {
			this.canvasContext.clearRect(0, 0, 1, 1);
			this.canvasContext.fillStyle = labelColor;
			this.canvasContext.fillRect(0, 0, 1, 1);
			const data = this.canvasContext.getImageData(0, 0, 1, 1).data;
			r = data[0]; g = data[1]; b = data[2];
		}

		const brightness = (r * 299 + g * 587 + b * 114) / 1000;
		const maxChannel = Math.max(r, g, b);

		const needsOutline = brightness < 70 || maxChannel < 140;
		const outlineColor = this.getBrightOutlineColor(labelColor);

		const labelShadow = needsOutline
			? `text-shadow: -1px -1px 0 ${outlineColor}, 1px -1px 0 ${outlineColor}, -1px 1px 0 ${outlineColor}, 1px 1px 0 ${outlineColor} !important; -webkit-text-stroke: 0px;`
			: "text-shadow: none !important; -webkit-text-stroke: 0px;";

		let compassBlock = "";
		if (!character.IsPlayer() && Settings.instance.data.showMapCompass && ChatRoomMapViewIsActive() && isDrawer) {
			const trackedClass = this.trackedMapPlayer === character.MemberNumber ? "CRABS_compass-active" : "";
			const compassIcon = Assets.printimage({ key: "compass", css_class_override: "CRABS_icon" });

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
			StatusIcons: `${this.setStatusIcons(character)}`,
			CompassBlock: compassBlock
		};

		return this.template(rostercardstemplate, templatevars, false);
	}

	/**
	 * Hooks into the friend list loading to capture the online friend count.
	 * Flags the roster as dirty so the UI synchronizes with the new friend data.
	 * @returns {void}
	 */
	private loadFriendList(): void {
		this.safeHook("FriendListLoadFriendList", 0, (args: any, next: Function) => {
			const friendData = args[0];

			if (Array.isArray(friendData)) {
				this.onlineFriendsCache = friendData.length;
				this.isDirty = true;
			}
			this.isFetching = false;

			return next(args);
		});
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

			setTimeout(() => { this.isFetching = false; }, 3000);
		}
	}

	/** Returns the currently cached online friends count for dirty-checking. */
	public getOnlineFriendsCount(): number | string {
		return this.onlineFriendsCache;
	}

	/**
	 * Determines the room badge for a player (Admin, VIP, or Guest).
	 * @param {Character} character - The character to check.
	 * @returns {string} HTML string representing the badge icon.
	 */
	private setbadge(character: any): string {
		const memberNum = character.MemberNumber ?? -1;
		let badge = Assets.printimage({ key: "player" });

		badge = ChatRoomData.Whitelist.includes(memberNum)
			? Assets.printimage({ key: "vip" })
			: badge;

		badge = ChatRoomData.Admin.includes(memberNum)
			? Assets.printimage({ key: "admin" })
			: badge;

		return badge;
	}

	/**
	 * Determines and generates relational icons for a player (Owner, Friend, Whitelisted, etc.).
	 * @param {Character} character - The character object.
	 * @returns {string} HTML string containing the relevant relational icons.
	 */
	private setIcons(character: any): string {
		if (character.IsPlayer()) {
			return Assets.printimage({ key: "you" }) + " ";
		}

		let playerIcons = "";
		const memberNum = character.MemberNumber ?? -1;
		const playerWindow = (window as any).Player;

		const isTrial = character.Ownership?.MemberNumber === playerWindow.MemberNumber && character.Ownership?.Stage === 0;

		if (playerWindow.OwnerNumber() === memberNum) {
			playerIcons += Assets.printimage({ key: "owner" }) + " ";
		} else if (character.IsOwnedByPlayer()) {
			if (isTrial) {
				playerIcons += Assets.printimage({ key: "trial" }) + " ";
			} else {
				playerIcons += Assets.printimage({ key: "sub" }) + " ";
			}
		} else if (playerWindow.IsInFamilyOfMemberNumber(memberNum)) {
			playerIcons += Assets.printimage({ key: "family" }) + " ";
		}

		if (playerWindow.GetLoversNumbers().includes(memberNum)) {
			playerIcons += Assets.printimage({ key: "lover" }) + " ";
		} else {
			if (CrossMod.detectMod("BCTweaks")) {
				if (playerWindow.BCT?.bctSettings?.bestFriendsList?.includes(memberNum)) {
					playerIcons += Assets.printimage({ key: "bestfriend" }) + " ";
				} else if (playerWindow.FriendList.includes(memberNum)) {
					playerIcons += Assets.printimage({ key: "friend" }) + " ";
				}
			} else if (playerWindow.FriendList.includes(memberNum)) {
				playerIcons += Assets.printimage({ key: "friend" }) + " ";
			}
		}

		if (playerWindow.WhiteList.includes(memberNum)) {
			playerIcons += Assets.printimage({ key: "whitelist" }) + " ";
		} else if (playerWindow.BlackList.includes(memberNum)) {
			playerIcons += Assets.printimage({ key: "blacklist" }) + " ";
		}

		if (playerWindow.GhostList.includes(memberNum)) {
			playerIcons += Assets.printimage({ key: "ghost" }) + " ";
		}

		return playerIcons;
	}

	/**
	 * Checks if the player's eyes are currently closed.
	 * @returns {boolean} True if eyes are closed, false otherwise.
	 */
	private isEyesClosed(): boolean {
		const playerWindow = (window as any).Player;

		const characterIsEyesClosed = (window as any).CharacterIsEyesClosed;
		if (typeof characterIsEyesClosed === "function") {
			return characterIsEyesClosed(playerWindow);
		}

		if (typeof (playerWindow as any).IsEyesClosed === "function") {
			return (playerWindow as any).IsEyesClosed();
		}

		if (Array.isArray(playerWindow.Appearance)) {
			const eyesItem = playerWindow.Appearance.find(
				(item: any) => item.Asset && item.Asset.Group && item.Asset.Group.Name === "Eyes"
			);

			if (eyesItem) {
				return eyesItem.Property?.Expression === "Closed";
			}
		}

		return false;
	}

	/** * Handler for tapping/clicking the compass icon. 
	 * @param {string} playerId - the id of the player to be tracked.
	 */
	private onPlayerToggleTrack = (playerId: string) => {
		const id = parseInt(playerId, 10);
		const wasTracked = this.trackedMapPlayer === id;

		this.trackedMapPlayer = wasTracked ? null : id;

		if (!wasTracked) {
			this.autoPaginateToPlayer(id);
		}

		document.querySelectorAll(".CRABS_track-compass").forEach(el => {
			el.classList.remove("CRABS_compass-active");
		});

		if (this.trackedMapPlayer !== null) {
			document.querySelectorAll(`.CRABS_track-compass[data-player-number="${id}"]`).forEach(el => {
				el.classList.add("CRABS_compass-active");
			});
		}
	};

	/** * Clears the tracked player and resets compass UI. Call this when the drawer closes. 
	 */
	public clearTracking(): void {
		this.trackedMapPlayer = null;

		document.querySelectorAll(".CRABS_track-compass").forEach(el => {
			el.classList.remove("CRABS_compass-active");
		});
	}

	/**
	 * Renders a 3D-spinning directional arrow indicator on the canvas.
	 * The arrow is natively drawn pointing right (0 radians); use the angle parameter to reorient.
	 * Applies a continuous Y-axis squish to simulate a barrel roll, complete with dynamic specular highlights and shadows.
	 * * @param {CanvasRenderingContext2D} context - The 2D rendering context of the target canvas.
	 * @param {number} x - The absolute X coordinate on the canvas to place the center of the indicator.
	 * @param {number} y - The absolute Y coordinate on the canvas to place the center of the indicator.
	 * @param {number} angle - The rotation angle in radians (e.g., Math.PI / 2 points it downwards).
	 * @param {number} scale - The uniform scaling multiplier for the indicator's size.
	 * @param {string} color - The CSS color string used to fill the base of the arrow.
	 * @param {boolean} isDark - True if the base color is dark; toggles the outline stroke to white for contrast.
	 * @returns {void}
	 */
	private drawIndicator(
		context: CanvasRenderingContext2D,
		x: number,
		y: number,
		angle: number,
		scale: number,
		color: string,
		isDark: boolean
	): void {
		const now = Date.now();

		context.save();
		try {
			// 1. Base positioning (Translate & Rotate)
			context.translate(x, y);
			context.rotate(angle);

			const rollFactor = Math.sin(now / 500);
			const absRoll = Math.abs(rollFactor);
			const sign = Math.sign(rollFactor) || 1;

			// Prevent absolute zero so it doesn't blink out of existence
			const renderScaleY = Math.max(absRoll, 0.15) * sign;

			// 2. SAVE STATE BEFORE SQUISHING
			context.save();

			// 3. Apply the 3D squish effect
			context.scale(scale, scale * renderScaleY);

			// 4. Define the path (points are locked in with the squish)
			context.beginPath();
			context.moveTo(20, 0);
			context.lineTo(-20, 15);
			context.lineTo(-20, -15);
			context.closePath();

			// 5. Fill and apply the shine/shadow to the squished face
			context.fillStyle = color;
			context.fill();

			if (rollFactor > 0) {
				context.save();
				context.clip();
				const sweepX = Math.cos(now / 500) * 30;
				context.translate(sweepX, 0);
				const shineGrad = context.createLinearGradient(-10, 0, 10, 0);
				shineGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
				shineGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.8)");
				shineGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
				context.fillStyle = shineGrad;
				context.fillRect(-40, -20, 80, 40);
				context.restore();
			} else {
				const shadowAlpha = absRoll * 0.4;
				context.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
				context.fill();
			}

			// 6. RESTORE STATE (REMOVES THE SQUISH)
			// The canvas is back to normal proportions, but it still remembers our path!
			context.restore();

			// 7. Draw the stroke uniformly
			context.strokeStyle = isDark ? "white" : "black";

			// As absRoll approaches 0 (flat), the stroke gets thicker (bulges)
			context.lineWidth = (1.5 * scale) + ((1 - absRoll) * 3 * scale);

			// Because we un-squished the canvas, this stroke is perfectly thick on all sides
			context.stroke();

		} finally {
			context.restore(); // Clean up base translation
		}
	}

	/**
	 * Draws a directional arrow pointing toward the hovered player on the map.
	 * @returns {void}
	 */
	private drawCompass(): void {
		const targetId = this.trackedMapPlayer || this.hoveredMapPlayer;

		if (!targetId || !Settings.instance.data.showMapCompass) return;

		const globalWindow = window as any;
		if (typeof globalWindow.ChatRoomMapViewIsActive !== "function" || !globalWindow.ChatRoomMapViewIsActive()) return;

		const target = globalWindow.ChatRoomCharacter?.find((character: any) => character.MemberNumber === targetId);
		const player = globalWindow.Player;

		if (!target?.MapData?.Pos || !player?.MapData?.Pos) return;

		let deltaX = target.MapData.Pos.X - player.MapData.Pos.X;
		let deltaY = target.MapData.Pos.Y - player.MapData.Pos.Y;

		// REMOVED: if (deltaX === 0 && deltaY === 0) return;

		const canvasContext = (globalWindow.MainCanvas as HTMLCanvasElement)?.getContext("2d");
		if (!canvasContext) return;

		let arrowX, arrowY, angle;
		const scale = 0.66; // Locked base size

		const range = globalWindow.ChatRoomMapViewPerceptionRange;
		const tileW = 1000 / ((range * 2) + 1);
		const tileIndex = target.MapData.Pos.X + (target.MapData.Pos.Y * globalWindow.ChatRoomMapViewWidth);
		const isVisible = globalWindow.ChatRoomMapViewVisibilityMask && globalWindow.ChatRoomMapViewVisibilityMask[tileIndex];

		if (Math.abs(deltaX) <= range && Math.abs(deltaY) <= range && isVisible) {
			angle = Math.PI / 2; // Point down

			arrowX = (deltaX + range) * tileW + (tileW / 2);

			// Find the absolute top edge of the grid tile
			const tileTop = (deltaY + range) * tileW;

			// Calculate the dynamic height of the character sprite overhang (67% of tile width)
			const headY = tileTop - (tileW * 0.67);

			// Anchor the center of the fixed-size arrow exactly half its height above the head
			arrowY = headY - (20 * scale) - 5;

		} else {
			angle = Math.atan2(deltaY, deltaX); // Point toward the edge
			arrowX = 500 + Math.cos(angle) * 450;
			arrowY = 500 + Math.sin(angle) * 450;
		}

		const playerColor = target.LabelColor || "cyan";
		const brightness = this.getColorBrightness(playerColor);
		const isDark = brightness < 128;

		// Call our unified 3D drawer
		this.drawIndicator(canvasContext, arrowX, arrowY, angle, scale, playerColor, isDark);
	}

	/**
	 * Renders a continuous, pulsating aura behind a targeted character on the main screen.
	 * This effect is drawn before the character model to ensure it appears behind them.
	 * @private
	 * @param {any} character - The character object to reference for colors.
	 * @param {number} drawX - The base X coordinate where the character is being drawn.
	 * @param {number} drawY - The base Y coordinate where the character is being drawn.
	 * @param {number} zoom - The current zoom/scaling factor of the room.
	 * @returns {void}
	 */
	private drawFocusGlow(character: any, drawX: number, drawY: number, zoom: number): void {
		if (!Settings.instance.data.enableFocusHalo) return;

		const globalWindow = window as any;
		const context = (globalWindow.MainCanvas as HTMLCanvasElement)?.getContext("2d");
		if (!context) return;

		const playerColor = character.LabelColor || "cyan";

		// Default to the static, higher-visibility alpha for LOW performance
		let currentAlpha = 0.5;

		if (this.currentPerformanceLevel === PerformanceLevel.CRITICAL) {
			// Dimmer static alpha to save maximum processing power
			currentAlpha = 0.25;
		} else if (this.currentPerformanceLevel === PerformanceLevel.NORMAL) {
			// Full pulsating math for high-performance mode
			const pulseSpeed = 250;
			currentAlpha = ((Math.sin(Date.now() / pulseSpeed) + 1) / 2) * 0.4;
		}

		const activePoses = character.ActivePose || character.Pose || [];
		const poseStr = Array.isArray(activePoses) ? activePoses.join(" ") : String(activePoses);

		let scaleY = 1.0;
		if (poseStr.includes("Lay") || poseStr.includes("Sleep") || poseStr.includes("Hogtied")) {
			scaleY = 0.35;
		} else if (poseStr.includes("AllFours")) {
			scaleY = 0.50;
		} else if (poseStr.includes("Kneel")) {
			scaleY = 0.65;
		}

		const heightRatio = typeof character.HeightRatio === "number" ? character.HeightRatio : 1.0;

		const radiusX = 250 * zoom * heightRatio;
		const radiusY = 500 * zoom * heightRatio * scaleY;

		const centerX = drawX + (250 * zoom);
		const floorY = drawY + (1000 * zoom);
		const centerY = floorY - radiusY;

		context.save();
		try {
			context.globalAlpha = currentAlpha;

			if (this.currentPerformanceLevel === PerformanceLevel.NORMAL) {
				// --- THE ORIGINAL HEAVY BLUR EFFECT ---
				context.fillStyle = playerColor;
				context.filter = 'blur(25px)';

				context.beginPath();
				context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
				context.fill();
			} else {
				// --- THE LIGHTWEIGHT GRADIENT FALLBACK ---
				context.translate(centerX, centerY);
				context.scale(1, radiusY / radiusX);

				const gradient = context.createRadialGradient(0, 0, radiusX * 0.4, 0, 0, radiusX);
				gradient.addColorStop(0, playerColor);
				gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

				context.fillStyle = gradient;
				context.beginPath();
				context.arc(0, 0, radiusX, 0, Math.PI * 2);
				context.fill();
			}
		} finally {
			context.restore();
		}
	}

	/**
	 * Renders the custom indicator arrow to the left of the character's nameplate in normal rooms.
	 * @private
	 */
	private drawNameIndicator(character: any, x: number, y: number): void {
		const globalWindow = window as any;
		const canvasContext = (globalWindow.MainCanvas as HTMLCanvasElement)?.getContext("2d");
		if (!canvasContext) return;

		const currentName = CharacterNickname(character).normalize("NFKC");
		let cachedData = this.nameWidthCache.get(character.MemberNumber);

		if (!cachedData || cachedData.name !== currentName) {
			canvasContext.font = "36px sans-serif";
			cachedData = { name: currentName, width: canvasContext.measureText(currentName).width };
			this.nameWidthCache.set(character.MemberNumber, cachedData);
		}

		const playerColor = character.LabelColor || "cyan";
		const brightness = this.getColorBrightness(playerColor);
		const isDark = brightness < 128;

		const scale = 0.6;
		const textWidth = cachedData.width;
		const padding = 10;
		const arrowWidth = 40 * scale;

		// Assume default positioning (Left side, pointing Right)
		let angle = 0;
		let tipX = x - (textWidth / 2) - padding;
		let finalArrowX = tipX - (arrowWidth / 2);

		// Is the back of the arrow going to clip past the left edge of the screen (0)?
		// We use 10px as a safe margin so it doesn't scrape the absolute edge.
		if (finalArrowX - (arrowWidth / 2) < 10) {
			// Flip to the Right side, pointing Left (<)
			angle = Math.PI;
			tipX = x + (textWidth / 2) + padding;
			finalArrowX = tipX + (arrowWidth / 2);
		}

		this.drawIndicator(canvasContext, finalArrowX, y, angle, scale, playerColor, isDark);
	}

	/**
	 * Determines the current blindness level of the player (0 to 4).
	 * Accounts for immersive settings and BCX rules.
	 * @returns {number} The blindness level.
	 */
	private getBlindnessLevel(): number {
		if (!Settings.instance.data.immersiveBlind) return 0;

		if (Settings.instance.data.respectBcxRules && CrossMod.isBCXRuleEnforced("alt_eyes_fullblind")) {
			if (this.isEyesClosed()) {
				return 4;
			}
		}

		const playerWindow = (window as any).Player;

		if (playerWindow.HasEffect("BlindTotal")) return 4;
		if (playerWindow.HasEffect("BlindHeavy")) return 3;
		if (playerWindow.HasEffect("BlindNormal")) return 2;
		if (playerWindow.HasEffect("BlindLight")) return 1;
		return 0;
	}

	/**
	 * Calculates a numerical score for sorting the roster. Lower score = higher on the list.
	 * @param {any} character - The character to sort.
	 * @param {string} mode - The sorting algorithm to apply.
	 * @returns {number} The computed order weight.
	 */
	private calculateSortScore(character: any, mode: string): number {
		if (character.IsPlayer && character.IsPlayer()) return 0;

		const mNum = character.MemberNumber ?? -1;
		const player = (window as any).Player;
		const isBestFriend = CrossMod.detectMod("BCTweaks") && player.BCT?.bctSettings?.bestFriendsList?.includes(mNum);

		switch (mode) {
			case "ds":
				if (player.OwnerNumber && player.OwnerNumber() === mNum) return 1;
				if (typeof character.IsOwnedByPlayer === "function" && character.IsOwnedByPlayer(player.MemberNumber ?? -1)) {
					return character.Ownership?.Stage === 0 ? 3 : 2;
				}
				if (typeof player.IsInFamilyOfMemberNumber === "function" && player.IsInFamilyOfMemberNumber(mNum)) return 4;
				return 5;
			case "lovers":
				if (player.GetLoversNumbers && player.GetLoversNumbers().includes(mNum)) return 1;
				if (isBestFriend) return 2;
				if (player.FriendList && player.FriendList.includes(mNum)) return 3;
				return 4;
			case "friends":
				if (isBestFriend) return 1;
				if (player.FriendList && player.FriendList.includes(mNum)) return 2;
				return 3;
			case "whitelist":
				if (player.WhiteList && player.WhiteList.includes(mNum)) return 1;
				if (player.BlackList && player.BlackList.includes(mNum)) return 3;
				return 2;
			case "blacklist":
				if (player.BlackList && player.BlackList.includes(mNum)) return 1;
				if (player.WhiteList && player.WhiteList.includes(mNum)) return 2;
				return 3;
			case "role":
			default:
				if (ChatRoomData.Admin && ChatRoomData.Admin.includes(mNum)) return 1;
				if (ChatRoomData.Whitelist && ChatRoomData.Whitelist.includes(mNum)) return 2;
				return 3;
		}
	}

	/** * Generates the HTML for the player roster based on provided arguments.
	 * @param {string} commandArguments - Command arguments determining which players to display.
	 * @param {boolean} [wrapper=true] - Whether to include the standard UI wrapper.
	 * @param {boolean} [forceFullRows=false] - If true, returns only the player rows for surgical DOM updates.
	 * @returns {string} The completed HTML roster.
	 */
	public buildroster(
		commandArguments: string,
		wrapper: boolean = true,
		forceFullRows: boolean = false
	): string {

		if (typeof ChatRoomData === 'undefined' || ChatRoomData === null) {
			return "";
		}

		this.requestOnlineFriends();

		let rosterStyle = "";
		if (Settings.instance.data.immersiveBlind) {
			const blindLevel = this.getBlindnessLevel();
			if (blindLevel > 0) {
				const blurAmount = blindLevel * 5;
				rosterStyle = `filter: blur(${blurAmount}px); pointer-events: none; user-select: none; transition: filter 0.5s ease;`;
			}
		}

		const splitArguments = commandArguments.split(" ");
		let showme = true, showadmins = true, showvip = true, showplayers = true;

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
		let rosterCards: { html: string, score: number, memberNumber: number, isMe: boolean, isAdmin: boolean, isVIP: boolean, isStandard: boolean }[] = [];

		const effectiveSortMode = wrapper ? "role" : this.currentSortMode;

		for (let characterIndex in ChatRoomData.Character) {
			const memberNumber = ChatRoomData.Character[characterIndex].MemberNumber;
			const character = ChatRoomCharacter.find((c: any) => c.MemberNumber == memberNumber);

			if (!character) {
				rosterCards.push({
					html: "❓ <span style='color:#FF0000'>[Unknown Person]</span>\n",
					score: 99, memberNumber: 9999999, isMe: false, isAdmin: false, isVIP: false, isStandard: true
				});
				continue;
			}

			const isMe = character.IsPlayer();
			const isAdmin = ChatRoomData.Admin.includes(memberNumber);
			const isVIP = ChatRoomData.Whitelist.includes(memberNumber) && !isMe && !isAdmin;
			const isStandard = !isMe && !isAdmin && !isVIP;

			if (isAdmin) admin_count++;

			const badge = this.setbadge(character);
			let playerIcons = this.setIcons(character);

			const html = this.buildCard(character, badge, playerIcons, !wrapper);
			const score = this.calculateSortScore(character, effectiveSortMode);

			rosterCards.push({ html, score, memberNumber, isMe, isAdmin, isVIP, isStandard });
		}

		rosterCards.sort((a, b) => a.score - b.score || a.memberNumber - b.memberNumber);

		let output_rows = "";
		for (const card of rosterCards) {
			if (!showme && card.isMe) continue;
			if (!showadmins && card.isAdmin && !card.isMe) continue;
			if (!showvip && card.isVIP) continue;
			if (!showplayers && card.isStandard) continue;
			output_rows += card.html;
		}

		const playerWindow = (window as any).Player;
		const isMap = ChatRoomMapViewIsActive();

		let templatevars: Record<string, string> = {
			RosterStyle: rosterStyle,
			adminIcon: `${Assets.printimage({ key: "admin", tooltip_override: "Admins", css_class_override: "CRABS_header_icons" })}`,
			adminsInRoom: `${admin_count}`,
			totalAdmins: `${ChatRoomData.Admin.length}`,
			playerIcon: `${Assets.printimage({ key: "player", tooltip_override: "Players", css_class_override: "CRABS_header_icons" })}`,
			playersInRoom: `${ChatRoomCharacter.length}`,
			totalPlayers: `${ChatRoomData.Limit}`,
			friendIcon: `${Assets.printimage({ key: "friend", tooltip_override: "Friends", css_class_override: "CRABS_header_icons" })}`,
			friendsOnline: `${this.onlineFriendsCache}`,
			totalFriends: `${playerWindow.FriendList.length}`,
			connectedIcon: `${Assets.printimage({ key: "connected", tooltip_override: "Online Accounts", css_class_override: "CRABS_header_icons" })}`,
			onlinePlayers: `${typeof CurrentOnlinePlayers !== "undefined" ? CurrentOnlinePlayers : ""} `,
			playerRows: output_rows,
			MapActive: isMap ? "true" : "false"
		};

		let displaykeys = "";
		const KEYS = {
			keyBronze: playerWindow.MapData?.PrivateState?.HasKeyBronze,
			keySilver: playerWindow.MapData?.PrivateState?.HasKeySilver,
			keyGold: playerWindow.MapData?.PrivateState?.HasKeyGold,
		};

		for (const [key, value] of Object.entries(KEYS)) {
			displaykeys += Assets.printimage({ key: value ? (key as any) : "keyNull" });
		}
		templatevars["collectedKeys"] = displaykeys;

		let wrappervars = {
			TitleBar: `CRABS: Roster`,
			Close: Assets.printimage({ key: "close", data: ["elementid", "CRABS_Roster"] })
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
	public override buildui(output?: string, elementId?: string, root?: HTMLElement): void {
		super.buildui(output, elementId, root);

		this.attachEvent("CRABS_player-badge", this.showPlayerFocus, "playerNumber", undefined, "click", "class", root);
		this.attachEvent("CRABS_player-id", this.copyToClipboard, "playerNumber", undefined, "click", "class", root);

		this.attachEvent("CRABS_card", this.onPlayerHover, "playerNumber", undefined, "mouseenter", "class", root);
		this.attachEvent("CRABS_card", this.onPlayerLeave, undefined, undefined, "mouseleave", "class", root);
		this.attachEvent("CRABS_card", this.onPlayerCardClick, "playerNumber", undefined, "click", "class", root);

		this.attachEvent("CRABS_track-compass", this.onPlayerToggleTrack, "playerNumber", undefined, "click", "class", root);

		const dropdown = (root || document).querySelector("#CRABS_sort_dropdown") as HTMLSelectElement;
		if (dropdown) {
			dropdown.value = this.currentSortMode;

			dropdown.onchange = (e) => {
				this.currentSortMode = (e.target as HTMLSelectElement).value;
				localStorage.setItem("CRABS_SortMode", this.currentSortMode);

				const drawerRosterContainer = document.getElementById("CRABS_Drawer_Roster");
				if (drawerRosterContainer) {
					const updatedHtml = this.buildroster("all", false);
					drawerRosterContainer.innerHTML = DOMPurify.sanitize(updatedHtml, { USE_PROFILES: { html: true } });
					this.buildui(undefined, undefined, drawerRosterContainer);
				}
			};
		}
	}
}
