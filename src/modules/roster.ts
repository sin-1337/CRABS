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

	/** The member number of the player currently hovered on the map. */
	private hoveredMapPlayer: number | null = null;
	/** Handler for when a player's entry is hovered in the roster UI. */
	private onPlayerHover = (playerId: string) => { this.hoveredMapPlayer = parseInt(playerId, 10); };
	/** Handler for when a player's entry is no longer hovered. */
	private onPlayerLeave = () => { this.hoveredMapPlayer = null; };

	/** 
	 * Creates an instance of the Roster module and initializes map hooks.
	 * 
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

	/** 
	 * Detects overflow in card wrappers and applies scrolling animation if necessary.
	 * 
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
	 * 
	 * @param {PlayerCharacter} player - The player character object to check.
	 * @returns {string} HTML string containing the status icons.
	 */
	private setStatusIcons(player: PlayerCharacter): string {
		const prefixes = ["Blind", "Gag", "Deaf"];
		const effects = CharacterGetEffects(player);

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

	/** 
	 * Builds the HTML card for a single player in the roster.
	 * 
	 * @param {PlayerCharacter} player - The player character object.
	 * @param {string} badge - HTML string for the player's room badge (Admin/VIP/Guest).
	 * @param {string} playerIcons - HTML string for the player's relational icons (Owner/Friend/etc).
	 * @returns {string} The rendered HTML card.
	 */
	private buildCard(
		player: PlayerCharacter,
		badge: string,
		playerIcons: string
	): string {
		let templatevars: Record<string, string> = {
			PlayerNumber: `${player.MemberNumber}`,
			Badge: badge,
			LabelColorBorder: `${this.convertColor(
				player.LabelColor ?? "#FFFFFF",
				0.5
			)}`,
			LabelColor: `${player.LabelColor || "#FFFFFF"}`,
			PlayerName: CharacterNickname(player).normalize("NFKC"),
			PlayerIcons: playerIcons,
			StatusIcons: `${this.setStatusIcons(player)}`,
		};

		return this.template(rostercardstemplate, templatevars, false);
	}

	/** 
	 * Hooks into the friend list loading to capture the online friend count.
	 * 
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

	/** 
	 * Checks if enough time has passed to send another server request for friend status.
	 * 
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

	/** 
	 * Retrieves the current online friend count, requesting an update if necessary.
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

	/** 
	 * Determines the room badge for a player (Admin, VIP, or Guest).
	 * 
	 * @param {PlayerCharacter} player - The player character to check.
	 * @returns {string} HTML string representing the badge icon.
	 */
	private setbadge(player: PlayerCharacter): string {
		let badge = Assets.printimage({ key: "player" });
		badge = ChatRoomData.Whitelist.includes(player.MemberNumber)
			? Assets.printimage({ key: "vip" })
			: badge;
		badge = ChatRoomData.Admin.includes(player.MemberNumber)
			? Assets.printimage({ key: "admin" })
			: badge;
		return badge;
	}

	/**
	 * Determines and generates relational icons for a player (Owner, Friend, Whitelisted, etc.).
	 * 
	 * @param {PlayerCharacter} player - The player character object.
	 * @returns {string} HTML string containing the relevant relational icons.
	 */
	private setIcons(player: PlayerCharacter): string {
		let playerIcons = "";

		// Trial checks
		const isTrial = player.Ownership?.MemberNumber === Player.MemberNumber && player.Ownership?.Stage === 0;

		if (Player.OwnerNumber() == player.MemberNumber) {
			// person owns you
			playerIcons += Assets.printimage({ key: "owner" }) + " ";
		} if (player.IsOwnedByPlayer(Player.MemberNumber ?? -1)) {
			// YOU own them
			if (isTrial) {
				playerIcons += Assets.printimage({ key: "trial" }) + " ";
			} else {
				playerIcons += Assets.printimage({ key: "sub" }) + " ";
			}
		} else if (Player.IsInFamilyOfMemberNumber(player.MemberNumber ?? -1)) {
			// they are in your family tree, but not owner or sub
			playerIcons += Assets.printimage({ key: "family" }) + " ";
		}
		if (Player.GetLoversNumbers().includes(player.MemberNumber ?? -1)) {
			// person is a lover
			playerIcons += Assets.printimage({ key: "lover" }) + " ";
		} else {
			if (CrossMod.detectMod("BCTweaks")) {
				// BCTweaks mod is found
				if (
					Player.BCT.bctSettings.bestFriendsList.includes(player.MemberNumber)
				) {
					//Player is a best friend, skip checking if they are a friend.
					playerIcons += Assets.printimage({ key: "bestfriend" }) + " ";
				} else if (Player.FriendList.includes(player.MemberNumber)) {
					// Player is not a best friend, but they are a friend
					playerIcons += Assets.printimage({ key: "friend" }) + " ";
				}
			} else if (Player.FriendList.includes(player.MemberNumber)) {
				// person is a friend, and the BCTweaks mod is not found
				playerIcons += Assets.printimage({ key: "friend" }) + " ";
			}
		}
		if (Player.WhiteList.includes(player.MemberNumber)) {
			// Player is whitelisted
			playerIcons += Assets.printimage({ key: "whitelist" }) + " ";
		} else if (Player.BlackList.includes(player.MemberNumber)) {
			// Player is blacklisted
			playerIcons += Assets.printimage({ key: "blacklist" }) + " ";
		}
		if (Player.GhostList.includes(player.MemberNumber)) {
			// Player is ghosted
			playerIcons += Assets.printimage({ key: "ghost" }) + " ";
		}
		return playerIcons;
	}

	/**
	 * Checks if the player's eyes are currently closed.
	 * 
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
	 * Draws a directional arrow pointing toward the hovered player on the map.
	 * 
	 * @returns {void}
	 */
	private drawCompass(): void {
		if (!this.hoveredMapPlayer) return;

		const globalWindow = window as any;
		if (typeof globalWindow.ChatRoomMapViewIsActive !== "function" || !globalWindow.ChatRoomMapViewIsActive()) return;

		const target = globalWindow.ChatRoomCharacter?.find((character: any) => character.MemberNumber === this.hoveredMapPlayer);
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
	 * 
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
	 * Generates the HTML for the player roster based on provided arguments.
	 * 
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

		let me_output_html: string = "" // holds data about user who ran script
		let admin_output_html: string = "" // holds admins
		let vip_output_html: string = "" // holds whitelisted users
		let player_output_html: string = "" // holds normal players
		let character: PlayerCharacter; // the person we found in the room
		let admin_count = 0; // number of admins in the room
		let badge = ""; // holds the admin icon if the player is an admin
		let playerIcons = ""; // holds the list of player/status icons (string)
		let memberNumber: number;

		// filter variables, show or not show certain output
		let showme = true; // person who ran the script (you)
		let showadmins = true; // room admins
		let showvip = true; // room whitelists
		let showplayers = true; // normal players
		let templatevars: Record<string, string>;
		let output_html: string = ""

		//get a list of players
		for (let characterIndex in ChatRoomData.Character) {
			// find member number for current player in list
			memberNumber = ChatRoomData.Character[characterIndex].MemberNumber;

			// Find player
			character = ChatRoomCharacter.find(
				(characterItem: any) => characterItem.MemberNumber == memberNumber
			);

			//bail out and return placeholder if player is not available.
			if (!character) {
				player_output_html +=
					"❓ <span style='color:#FF0000'>[Unknown Person]</span>\n";
				continue;
			}

			// check if the player is also an admin or vip and add icon with admin given priority
			badge = this.setbadge(character);
			playerIcons = this.setIcons(character);

			// if the player is me (person who ran the script)
			if (character.IsPlayer()) {
				// mark me with a star icon
				playerIcons = Assets.printimage({ key: "you" }) + " " + playerIcons;

				// format my output and store
				me_output_html = this.buildCard(character, badge, playerIcons);
			}

			// check if the player is an admin and update the count, also flag the player as admin in the output list.
			if (ChatRoomData.Admin.includes(character.MemberNumber)) {
				admin_count++;
				if (!character.IsPlayer()) {
					// if the player is not me, output admin and skip rest of loop
					admin_output_html += this.buildCard(character, badge, playerIcons);
					continue;
				}
			} else if (
				ChatRoomData.Whitelist.includes(character.MemberNumber) &&
				!character.IsPlayer()
			) {
				// if the player isn't an admin, is the player is white listed?
				vip_output_html += this.buildCard(character, badge, playerIcons);
				continue;
			} else if (!character.IsPlayer()) {
				// player is normal, nonadmin, not whitelist, and not me.
				player_output_html += this.buildCard(character, badge, playerIcons);
			}
		}

		// if argument is "count", set filter vars and skip loop
		if (splitArguments.some((item: any) => item.toLowerCase() === "count")) {
			showme = false;
			showadmins = false;
			showvip = false;
			showplayers = false;
		}

		// if argument is admins, set filter vars to only show admins and continue
		if (splitArguments.some((item: any) => item.toLowerCase() === "admins")) {
			showme = false;
			showvip = false;
			showplayers = false;
		}

		// if argument is vips, set filter vars to only show vips (white listed) and continue
		if (splitArguments.some((item: any) => item.toLowerCase() === "vips")) {
			showme = false;
			showadmins = false;
			showplayers = false;
		}

		// build table header
		templatevars = {
			RosterStyle: rosterStyle,
			adminIcon: `${Assets.printimage({
				key: "admin",
				tooltip_override: "Admins",
				css_class_override: "CRABS_header_icons"
			})}`,
			adminsInRoom: `${admin_count}`,
			totalAdmins: `${ChatRoomData.Admin.length}`,
			playerIcon: `${Assets.printimage({
				key: "player",
				tooltip_override: "Players",
				css_class_override: "CRABS_header_icons"
			})}`,
			playersInRoom: `${ChatRoomCharacter.length}`,
			totalPlayers: `${ChatRoomData.Limit}`,
			friendIcon: `${Assets.printimage({
				key: "friend",
				tooltip_override: "Friends",
				css_class_override: "CRABS_header_icons"
			})}`,
			friendsOnline: this.onlineFriends?.toString() ?? "...",
			totalFriends: `${Player.FriendNames.size}`,
			connectedIcon: `${Assets.printimage({
				key: "connected",
				tooltip_override: "Online Accounts",
				css_class_override: "CRABS_header_icons"
			})}`,
			onlinePlayers: `${CurrentOnlinePlayers}`,
		};

		// are we on a map?
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

			// Inject as a Flex cell. No border inline-styles needed!
			templatevars["collectedKeys"] = `
                <div class="CRABS_status_cell">
                    <div class="CRABS_roster_header_align">${displaykeys}</div>
                </div>`;
		} else {
			templatevars["collectedKeys"] = "";
		}

		// start the tabble
		let output_rows: string = "";
		// if the filter var resolves to true, add the respective output.
		output_rows = showme ? output_rows + me_output_html : output_rows;
		output_rows = showadmins ? output_rows + admin_output_html : output_rows;
		output_rows = showvip ? output_rows + vip_output_html : output_rows;
		output_rows = showplayers ? output_rows + player_output_html : output_rows;
		templatevars["playerRows"] = output_rows;

		let wrappervars = {
			TitleBar: `CRABS: Roster`,
			Close: Assets.printimage({
				key: "close",
				data: ["elementid", "CRABS_Roster"],
			})
		}


		// run the template and fill it out
		output_html = this.template(rostertemplate, templatevars, wrapper, wrappervars);
		return output_html;
	}

	/**
	 * Builds the user interface for the roster and attaches necessary events.
	 * 
	 * @param {string} [output] - The HTML string to be displayed.
	 * @param {string} [elementId] - Optional ID for the roster element.
	 * @param {HTMLElement} [root] - Optional root element for event attachment.
	 * @returns {void}
	 */
	public override buildui(output?: string, elementId?: string, root?: HTMLElement): void {
		super.buildui(output, elementId, root);
		this.attachEvent("CRABS_player-badge", this.showPlayerFocus, "playerNumber", undefined, "click", "class", root);
		this.attachEvent(
			"CRABS_player-id",
			this.copyToClipboard,
			"playerNumber",
			undefined,
			"contextmenu",
			"class",
			root)

		this.attachEvent("CRABS_player-id", this.onPlayerHover, "playerNumber", undefined, "mouseenter", "class", root);
		this.attachEvent("CRABS_player-id", this.onPlayerLeave, "playerNumber", undefined, "mouseleave", "class", root);
	}
}
