/**
 * CRABS Roster Module
 *
 * This module implements the enhanced roster functionality for the CRABS mod.
 * It provides:
 * - Custom roster display with enhanced features
 * - Roster template rendering system
 * - CSS styling for roster elements
 * - Online friends tracking
 *
 */

import { CRABS_Base } from "./base";
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
	/** Current count of online friends. */
	private onlineFriends: number | undefined = undefined;
	/** Timestamp for the last server request to prevent spamming. */
	private lastSentTime: number = 0;

	/** Tracks the user's selected sort order in the drawer */
	private currentSortMode: string = "role";

	/** The member number of the player currently hovered on the map. */
	private hoveredMapPlayer: number | null = null;
	/** The member number of the player currently locked via tap/click (Mobile Friendly). */
	private trackedMapPlayer: number | null = null;

	/** Handler for when a player's entry is hovered in the roster UI. */
	private onPlayerHover = (playerId: string) => {
		// Mutual Exclusivity: If a player is locked, ignore all hovers.
		if (this.trackedMapPlayer !== null) return;

		this.hoveredMapPlayer = parseInt(playerId, 10);
	};
	/** Handler for when a player's entry is no longer hovered. */
	private onPlayerLeave = () => { this.hoveredMapPlayer = null; };



	/** * Creates an instance of the Roster module and initializes map hooks.
	 * @param {ModSDKModAPI} CRABS - The ModSDK API instance.
	 */
	constructor(CRABS: ModSDKModAPI) {
		super(CRABS);
		this.loadFriendList();

		// Hook the map's draw function to inject our compass
		this.CRABS.hookFunction("ChatRoomMapViewDraw", 10, (functionArguments, next) => {
			const result = next(functionArguments); // Let the base map draw first
			this.drawCompass();        // Then draw our overlay
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

			// Remove previous values
			wrapper.classList.remove("scrolling");
			scroller.style.removeProperty("--scroll-distance");

			// Wait for layout
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
	private setStatusIcons(character: Character): string {
		const prefixes = ["Blind", "Gag", "Deaf"];
		const effects = CharacterGetEffects(character);

		// Effect lists mapping
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

		// Initialize icons as empty strings
		const icons: { [key: string]: string } = {
			Blind: "",
			Gag: "",
			Deaf: "",
		};

		// Helper function to determine the maximum value for each prefix and set the corresponding icon
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
						key: effectName, // which icon do we print
						tooltip_override: `${prefix}: ${effectValue}`, // set a tooltip
						css_class_override: `CRABS_status-icon`, // set a class
						css_style: `--brightness: brightness(2.5);
            background: linear-gradient(to right, #202020 10%, var(--border-color, white) 80%, transparent 100%);
            `, //style overwrite
					});
				}
			}
		};

		// Process effects
		for (let effect of effects) {
			for (let prefix of prefixes) {
				if (effect.startsWith(prefix)) {
					updateIcon(prefix, effect);
				}
			}
		}

		// Set default icons if no icon was set
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
	 * @returns {string} The rendered HTML card.
	 */
	private buildCard(
		character: Character,
		badge: string,
		playerIcons: string
	): string {
		const labelColor = character.LabelColor || "#FFFFFF";

		// Extract exact RGB values to check for muddy/gray colors
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

		// Outline if truly dark (< 70) OR if it's a muddy/muted mid-tone (< 140 max channel)
		const needsOutline = brightness < 70 || maxChannel < 140;
		const outlineColor = this.getBrightOutlineColor(labelColor);

		const labelShadow = needsOutline
			? `text-shadow: -1px -1px 0 ${outlineColor}, 1px -1px 0 ${outlineColor}, -1px 1px 0 ${outlineColor}, 1px 1px 0 ${outlineColor} !important; -webkit-text-stroke: 0px;`
			: "text-shadow: none !important; -webkit-text-stroke: 0px;";

		let compassBlock = "";
		if (!character.IsPlayer() && Settings.instance.data.showMapCompass) {
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

	/** * Hooks into the friend list loading to capture the online friend count.
	 * @returns {void}
	 */
	private loadFriendList(): void {
		this.CRABS.hookFunction("FriendListLoadFriendList", 0, (functionArguments, next) => {
			const [friendData]: Array<Record<string, any>> = functionArguments;
			this.onlineFriends = friendData.length;
			this.lastSentTime = Date.now();
			return next(functionArguments);
		});
	}

	/** * Checks if enough time has passed to send another server request for friend status.
	 * @returns {boolean} True if a request can be sent, false otherwise.
	 */
	private canSendServerRequest(): boolean {
		const now = Date.now();
		if (now - this.lastSentTime >= 10 * 60 * 1000) {
			// 10 minutes in milliseconds
			this.lastSentTime = now; // Update the lastSentTime to the current time
			return true;
		}
		return false;
	}

	/** * Retrieves the current online friend count, requesting an update if necessary.
	 *
	 * @returns {Promise<number>} The number of online friends.
	 */
	public async getOnlineFriendCount(): Promise<number> {
		// Check if it's okay to send the server request
		if (this.canSendServerRequest()) {
			// Send server request if it's been more than 2 minutes
			await ServerSend("AccountQuery", { Query: "OnlineFriends" });
		}

		// Wait for the hook function to finish (assuming `next` ensures it completes)
		return new Promise<number>((resolve) => {
			const checkOnlineFriends = () => {
				if (this.onlineFriends !== undefined) {
					resolve(this.onlineFriends); // Return the online friends count
				} else {
					setTimeout(checkOnlineFriends, 100); // Check again after 100ms
				}
			};

			checkOnlineFriends(); // Start the checking process
		});
	}

	/** * Determines the room badge for a player (Admin, VIP, or Guest).
	 * @param {Character} character - The character to check.
	 * @returns {string} HTML string representing the badge icon.
	 */
	private setbadge(character: Character): string {
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
	private setIcons(character: Character): string {
		let playerIcons = "";
		const memberNum = character.MemberNumber ?? -1;

		// Trial checks
		const isTrial = character.Ownership?.MemberNumber === Player.MemberNumber && character.Ownership?.Stage === 0;

		if (Player.OwnerNumber() === memberNum) {
			// person owns you
			playerIcons += Assets.printimage({ key: "owner" }) + " ";
		} else if (character.IsOwnedByPlayer()) {
			// YOU own them (Notice how IsOwnedByPlayer takes no arguments in the new types!)
			if (isTrial) {
				playerIcons += Assets.printimage({ key: "trial" }) + " ";
			} else {
				playerIcons += Assets.printimage({ key: "sub" }) + " ";
			}
		} else if (Player.IsInFamilyOfMemberNumber(memberNum)) {
			// they are in your family tree, but not owner or sub
			playerIcons += Assets.printimage({ key: "family" }) + " ";
		}

		if (Player.GetLoversNumbers().includes(memberNum)) {
			// person is a lover
			playerIcons += Assets.printimage({ key: "lover" }) + " ";
		} else {
			if (CrossMod.detectMod("BCTweaks")) {
				// BCTweaks mod is found
				if (Player.BCT?.bctSettings?.bestFriendsList?.includes(memberNum)) {
					//Player is a best friend, skip checking if they are a friend.
					playerIcons += Assets.printimage({ key: "bestfriend" }) + " ";
				} else if (Player.FriendList.includes(memberNum)) {
					// Player is not a best friend, but they are a friend
					playerIcons += Assets.printimage({ key: "friend" }) + " ";
				}
			} else if (Player.FriendList.includes(memberNum)) {
				// person is a friend, and the BCTweaks mod is not found
				playerIcons += Assets.printimage({ key: "friend" }) + " ";
			}
		}

		if (Player.WhiteList.includes(memberNum)) {
			// Player is whitelisted
			playerIcons += Assets.printimage({ key: "whitelist" }) + " ";
		} else if (Player.BlackList.includes(memberNum)) {
			// Player is blacklisted
			playerIcons += Assets.printimage({ key: "blacklist" }) + " ";
		}

		if (Player.GhostList.includes(memberNum)) {
			// Player is ghosted
			playerIcons += Assets.printimage({ key: "ghost" }) + " ";
		}

		return playerIcons;
	}

	/**
	 * Checks if the player's eyes are currently closed.
	 * @returns {boolean} True if eyes are closed, false otherwise.
	 */
	private isEyesClosed(): boolean {
		// Try the global function first if it's available
		const characterIsEyesClosed = (window as any).CharacterIsEyesClosed;
		if (typeof characterIsEyesClosed === "function") {
			return characterIsEyesClosed(Player);
		}

		// Try the method on the Player object
		if (typeof (Player as any).IsEyesClosed === "function") {
			return (Player as any).IsEyesClosed();
		}

		// Fallback: Check the actual Expression property in the base game
		if (Array.isArray(Player.Appearance)) {
			const eyesItem = Player.Appearance.find(
				(item: any) => item.Asset && item.Asset.Group && item.Asset.Group.Name === "Eyes"
			);

			if (eyesItem) {
				// FIX: Facial expressions are stored in the Property object
				return eyesItem.Property?.Expression === "Closed";
			}
		}

		return false;
	}

	/** 
	 * Handler for tapping/clicking the compass icon. 
	 *
	 * @param {string} playerId - the id of the player to be tracked.
	 */
	private onPlayerToggleTrack = (playerId: string) => {
		const id = parseInt(playerId, 10);

		// Toggle logic: If clicking the already tracked player, untrack. Otherwise, track new.
		this.trackedMapPlayer = (this.trackedMapPlayer === id) ? null : id;

		// Fast UI Update: Remove active class from ALL compasses
		document.querySelectorAll(".CRABS_track-compass").forEach(el => {
			el.classList.remove("CRABS_compass-active");
		});

		// Add active class to the newly tracked player's compass (if we didn't just clear it)
		if (this.trackedMapPlayer !== null) {
			document.querySelectorAll(`.CRABS_track-compass[data-player-number="${id}"]`).forEach(el => {
				el.classList.add("CRABS_compass-active");
			});
		}
	};

	/** 
	 * Clears the tracked player and resets compass UI. Call this when the drawer closes. 
	 */
	public clearTracking(): void {
		this.trackedMapPlayer = null;

		document.querySelectorAll(".CRABS_track-compass").forEach(el => {
			el.classList.remove("CRABS_compass-active");
		});
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

		if (deltaX === 0 && deltaY === 0) return;

		const canvasElement = document.getElementById("MainCanvas") as HTMLCanvasElement;
		const canvasContext = canvasElement?.getContext("2d");
		if (!canvasContext) return;

		let arrowX, arrowY, angle;
		let scale = 1; // Default scale for the edge HUD compass

		const range = globalWindow.ChatRoomMapViewPerceptionRange;
		const tileW = 1000 / ((range * 2) + 1);
		const tileIndex = target.MapData.Pos.X + (target.MapData.Pos.Y * globalWindow.ChatRoomMapViewWidth);
		const isVisible = globalWindow.ChatRoomMapViewVisibilityMask && globalWindow.ChatRoomMapViewVisibilityMask[tileIndex];

		if (Math.abs(deltaX) <= range && Math.abs(deltaY) <= range && isVisible) {
			arrowX = (deltaX + range) * tileW + (tileW / 2);
			arrowY = (deltaY + range) * tileW - (tileW * 0.85);
			angle = Math.PI / 2;

			// 111px is roughly the default tile width at range 4. 
			// This makes the arrow grow and shrink perfectly with the character!
			scale = tileW / 111;
		} else {
			angle = Math.atan2(deltaY, deltaX);
			arrowX = 500 + Math.cos(angle) * 450;
			arrowY = 500 + Math.sin(angle) * 450;
		}

		// Calculate colors BEFORE transforming the canvas
		const playerColor = target.LabelColor || "cyan";
		const brightness = this.getColorBrightness(playerColor);
		const isDark = brightness < 128;

		canvasContext.save();
		try {
			canvasContext.translate(arrowX, arrowY);
			canvasContext.rotate(angle);
			canvasContext.scale(scale, scale); // Apply the dynamic scale here!

			canvasContext.beginPath();
			canvasContext.moveTo(20, 0);
			canvasContext.lineTo(-20, 15);
			canvasContext.lineTo(-20, -15);

			canvasContext.fillStyle = playerColor;
			canvasContext.fill();

			canvasContext.strokeStyle = isDark ? "white" : "black";

			// We divide by scale here so the 1.5px border stays crisp and 
			// doesn't turn into a massive thick line when you zoom in!
			canvasContext.lineWidth = 1.5 / scale;

			canvasContext.closePath();
			canvasContext.stroke();
		} finally {
			canvasContext.restore();
		}
	}

	/**
	 * Determines the current blindness level of the player (0 to 4).
	 * Accounts for immersive settings and BCX rules.
	 * @returns {number} The blindness level.
	 */
	private getBlindnessLevel(): number {
		// If Respect Blindness is OFF, we don't want any blindness blurring
		if (!Settings.instance.data.immersiveBlind) return 0;

		// Check BCX full blind rule - only applies if both blindness immersion and BCX rules are respected
		if (Settings.instance.data.respectBcxRules && CrossMod.isBCXRuleEnforced("alt_eyes_fullblind")) {
			if (this.isEyesClosed()) {
				return 4;
			}
		}

		if (Player.HasEffect("BlindTotal")) return 4;
		if (Player.HasEffect("BlindHeavy")) return 3;
		if (Player.HasEffect("BlindNormal")) return 2;
		if (Player.HasEffect("BlindLight")) return 1;
		return 0;
	}

	/**
	 * Calculates a numerical score for sorting the roster. Lower score = higher on the list.
	 */
	private calculateSortScore(character: any, mode: string): number {
		if (character.IsPlayer && character.IsPlayer()) return 0; // "You" are always absolute top

		const mNum = character.MemberNumber ?? -1;
		const player = (window as any).Player;
		const isBestFriend = CrossMod.detectMod("BCTweaks") && player.BCT?.bctSettings?.bestFriendsList?.includes(mNum);

		switch (mode) {
			case "ds":
				if (player.OwnerNumber && player.OwnerNumber() === mNum) return 1; // Owner
				if (typeof character.IsOwnedByPlayer === "function" && character.IsOwnedByPlayer(player.MemberNumber ?? -1)) {
					return character.Ownership?.Stage === 0 ? 3 : 2; // Sub (2), Trial (3)
				}
				if (typeof player.IsInFamilyOfMemberNumber === "function" && player.IsInFamilyOfMemberNumber(mNum)) return 4; // Family
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
	 * @returns {string} The completed HTML roster.
	 */
	public buildroster(
		commandArguments: string,
		wrapper: boolean = true
	): string {

		if (typeof ChatRoomData === 'undefined' || ChatRoomData === null) {
			return "";
		}

		// Immersive Mode Check
		let rosterStyle = "";
		if (Settings.instance.data.immersiveBlind) {
			const blindLevel = this.getBlindnessLevel();
			if (blindLevel > 0) {
				const blurAmount = blindLevel * 5; // 1=5px, 2=10px, 3=15px, 4=20px
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

		// wrapper = true means it's floating in the chat log (needs the wrapper UI).
		// wrapper = false means it's inside the Drawer (drawer provides its own UI).
		// If true (in chat log), force "role". If false (in drawer), respect user choice.
		const effectiveSortMode = wrapper ? "role" : this.currentSortMode;

		// Build the Data Array
		for (let characterIndex in ChatRoomData.Character) {
			const memberNumber = ChatRoomData.Character[characterIndex].MemberNumber;
			const character = ChatRoomCharacter.find((c: any) => c.MemberNumber == memberNumber);

			if (!character) {
				rosterCards.push({ html: "❓ <span style='color:#FF0000'>[Unknown Person]</span>\n", score: 99, memberNumber: 9999999, isMe: false, isAdmin: false, isVIP: false, isStandard: true });
				continue;
			}

			const isMe = character.IsPlayer();
			const isAdmin = ChatRoomData.Admin.includes(memberNumber);
			const isVIP = ChatRoomData.Whitelist.includes(memberNumber) && !isMe && !isAdmin;
			const isStandard = !isMe && !isAdmin && !isVIP;

			if (isAdmin) admin_count++;

			const badge = this.setbadge(character);
			let playerIcons = this.setIcons(character);
			if (isMe) playerIcons = Assets.printimage({ key: "you" }) + " " + playerIcons;

			const html = this.buildCard(character, badge, playerIcons);
			const score = this.calculateSortScore(character, effectiveSortMode);

			rosterCards.push({ html, score, memberNumber, isMe, isAdmin, isVIP, isStandard });
		}

		// Mathematically Sort the Cards (If scores tie, fallback to MemberNumber to prevent jumping)
		rosterCards.sort((a, b) => a.score - b.score || a.memberNumber - b.memberNumber);

		// Apply Command Filters & Output
		let output_rows = "";
		for (const card of rosterCards) {
			if (!showme && card.isMe) continue;
			if (!showadmins && card.isAdmin && !card.isMe) continue;
			if (!showvip && card.isVIP) continue;
			if (!showplayers && card.isStandard) continue;
			output_rows += card.html;
		}

		let templatevars: Record<string, string> = {
			RosterStyle: rosterStyle,
			adminIcon: `${Assets.printimage({ key: "admin", tooltip_override: "Admins", css_class_override: "CRABS_header_icons" })}`,
			adminsInRoom: `${admin_count}`,
			totalAdmins: `${ChatRoomData.Admin.length}`,
			playerIcon: `${Assets.printimage({ key: "player", tooltip_override: "Players", css_class_override: "CRABS_header_icons" })}`,
			playersInRoom: `${ChatRoomCharacter.length}`,
			totalPlayers: `${ChatRoomData.Limit}`,
			friendIcon: `${Assets.printimage({ key: "friend", tooltip_override: "Friends", css_class_override: "CRABS_header_icons" })}`,
			friendsOnline: this.onlineFriends?.toString() ?? "...",
			totalFriends: `${Player.FriendNames.size}`,
			connectedIcon: `${Assets.printimage({ key: "connected", tooltip_override: "Online Accounts", css_class_override: "CRABS_header_icons" })}`,
			onlinePlayers: `${CurrentOnlinePlayers}`,
			playerRows: output_rows
		};

		if (ChatRoomMapViewIsActive()) {
			let displaykeys = "";
			const KEYS = {
				keyBronze: Player.MapData.PrivateState.HasKeyBronze,
				keySilver: Player.MapData.PrivateState.HasKeySilver,
				keyGold: Player.MapData.PrivateState.HasKeyGold,
			};
			for (const [key, value] of Object.entries(KEYS)) {
				displaykeys += Assets.printimage({ key: value ? key : "keyNull" });
			}
			templatevars["collectedKeys"] = `<div class="CRABS_status_cell"><div class="CRABS_roster_header_align">${displaykeys}</div></div>`;
		} else {
			templatevars["collectedKeys"] = "";
		}

		let wrappervars = {
			TitleBar: `CRABS: Roster`,
			Close: Assets.printimage({ key: "close", data: ["elementid", "CRABS_Roster"] })
		};

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

		// Left Click Badge -> Whisper Focus
		this.attachEvent("CRABS_player-badge", this.showPlayerFocus, "playerNumber", undefined, "click", "class", root);

		// Left Click Number -> Copy to Clipboard
		this.attachEvent("CRABS_player-id", this.copyToClipboard, "playerNumber", undefined, "click", "class", root);

		// Hover Name -> Show Compass
		this.attachEvent("CRABS_player-name", this.onPlayerHover, "playerNumber", undefined, "mouseenter", "class", root);
		this.attachEvent("CRABS_player-name", this.onPlayerLeave, "playerNumber", undefined, "mouseleave", "class", root);

		// Hover Number -> Show Compass
		this.attachEvent("CRABS_player-id", this.onPlayerHover, "playerNumber", undefined, "mouseenter", "class", root);
		this.attachEvent("CRABS_player-id", this.onPlayerLeave, "playerNumber", undefined, "mouseleave", "class", root);

		// Click Compass -> Toggle Sticky Compass Tracking
		this.attachEvent("CRABS_track-compass", this.onPlayerToggleTrack, "playerNumber", undefined, "click", "class", root);

		// Handle Dropdown changes for live-sorting (Drawer Only)
		const dropdown = (root || document).querySelector("#CRABS_sort_dropdown") as HTMLSelectElement;
		if (dropdown) {
			// Re-select the option if the UI was just redrawn
			dropdown.value = this.currentSortMode;

			dropdown.onchange = (e) => {
				this.currentSortMode = (e.target as HTMLSelectElement).value;

				// Directly target the drawer container to prevent spamming the chat log
				const drawerRosterContainer = document.getElementById("CRABS_Drawer_Roster");
				if (drawerRosterContainer) {
					// Force wrapper = false because we are updating inside the Drawer!
					const updatedHtml = this.buildroster("all", false);
					drawerRosterContainer.innerHTML = DOMPurify.sanitize(updatedHtml, { USE_PROFILES: { html: true } });
					// Re-attach all listeners to the fresh DOM elements inside the drawer
					this.buildui(undefined, undefined, drawerRosterContainer);
				}
			};
		}
	}
}
