/**
 * CRABS Drawer Module
 *
 * This module implements the sliding drawer interface for the CRABS mod.
 * It provides:
 * - A persistent UI container for the roster and help screens
 * - Automatic visibility management based on game state
 * - Integration with the game's chat log dimensions
 * - Event handling for navigation and interaction
 */

import { CRABS_Base, PerformanceLevel } from "./base";
import { Assets } from "./assets";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Roster } from "./roster";
import "./templates/drawer.css";
import drawertemplate from "./templates/drawer.html";

import { Help } from "./help";
import { WhisperPlus } from "./whisperplus";
import { Settings } from "./settings";

/**
 * Class representing the side drawer UI.
 * Manages the sliding panel that contains the Roster, Help, and Settings access.
 * Implements a Singleton pattern for global access via static methods.
 * * @extends CRABS_Base
 */
export class Drawer extends CRABS_Base {
	/** Singleton instance of the Drawer. */
	private static _instance: Drawer | null = null;
	/** Current visual state of the drawer. */
	private isOpen: boolean = false;
	/** The primary DOM element containing the drawer. */
	private instance: HTMLElement | null = null;
	/** Reference to the Roster module for rendering player lists. */
	private rosterModule: Roster;
	/** Reference to the Help module for rendering documentation. */
	private helpModule: Help;
	/** Reference to the WhisperPlus module for UI injection. */
	private whisperPlusModule: WhisperPlus;
	/** Observer to keep the drawer aligned with the chat log resizing. */
	private resizeObserver: ResizeObserver | null = null;
	/** Tracks if the drawer is currently displaying the Help view instead of the Roster. */
	private showingHelp: boolean = false;
	private updateTick: number = 0;

	// --- State Tracking for Optimized UI Refreshes ---
	private lastRoster: string = "";
	private lastAdminList: string = "";
	private lastKeys: string = "";
	private lastFriends: string = "";
	private lastMapState: boolean = false;

	/**
	 * Initializes the Drawer module and sets up the Singleton instance.
	 * * @param {ModSDKModAPI} CRABS - The ModSDK API instance.
	 * @param {Roster} roster - The Roster module instance.
	 * @param {Help} help - The Help module instance.
	 * @param {WhisperPlus} whisperPlus - The WhisperPlus module instance.
	 */
	constructor(CRABS: ModSDKModAPI, roster: Roster, help: Help, whisperPlus: WhisperPlus) {
		super(CRABS);
		Drawer._instance = this;
		this.rosterModule = roster;
		this.helpModule = help;
		this.whisperPlusModule = whisperPlus;
		this.init();
	}

	/** Toggles the drawer open/closed globally. */
	public static toggle(): void { Drawer._instance?.toggle(); }
	/** Opens the drawer globally. */
	public static open(): void { Drawer._instance?.open(); }
	/** Closes the drawer globally. */
	public static close(): void { Drawer._instance?.close(); }
	/** Evaluates game state to determine if the drawer should be visible or hidden. */
	public static updateVisibility(): void { Drawer._instance?.updateVisibility(); }
	/** Forces a re-render of the drawer's current content. */
	public static refresh(): void { Drawer._instance?.refresh(); }
	/** * Checks if the help menu is currently being displayed.
	 * @returns {boolean} True if the help screen is active.
	 */
	public static isShowingHelp(): boolean { return Drawer._instance?.showingHelp ?? false; }
	/** * Overrides the current view state of the drawer.
	 * @param {boolean} value - True to show Help, false to show Roster.
	 */
	public static setShowingHelp(value: boolean): void { if (Drawer._instance) Drawer._instance.showingHelp = value; }
	/** Triggers the easter egg visual effect on the drawer tab. */
	public static RaveTab(): void { Drawer._instance?.RaveTab(); }

	/**
	 * Temporarily swaps the drawer tab icon to a rave variant for 10 seconds.
	 * * @returns {void}
	 */

	public RaveTab(): void {
		if (!this.instance) return;
		const tab = this.instance.querySelector("#drawer-tab") as HTMLElement;
		if (!tab) return;

		// Set the icon and the 'rave' lock
		tab.innerHTML = Assets.printimage({ key: "rave" });
		tab.setAttribute("data-mode", "rave");

		// Set the 10-second timer to release the lock
		setTimeout(() => {
			if (!tab) return;

			// Release the bypass
			tab.removeAttribute("data-mode");

			// Immediately re-evaluate performance so the icon swaps 
			// back to whatever is appropriate for the current FPS.
			const isLow = this.currentPerformanceLevel !== PerformanceLevel.NORMAL;
			this.optimizeVisuals(isLow);
		}, 10000);
	}

	/**
	 * Bootstraps the drawer layout, injecting it into the DOM and establishing global hotkeys.
	 * * @private
	 * @returns {void}
	 */
	private init(): void {
		if (document.body) {
			this.setupElement();
		} else {
			document.addEventListener("DOMContentLoaded", () => this.setupElement());
		}

		document.addEventListener("keydown", (event) => {
			if (event.key === "Escape") {
				// If the player focus screen is up, we force it to close
				if ((window as any).CurrentCharacter !== null) {
					(window as any).DialogLeave();

					// If the drawer was open behind it, we make sure it stays closed
					if (this.isOpen) {
						this.close();
					}
				}
				// If no player is focused, but the drawer is open, close the drawer
				else if (this.isOpen) {
					this.close();
				}
			}
		}, true);

		this.setupDynamicUpdates();
	}

	/**
	 * Dirty-check to see if the relevant game state has actually changed.
	 * Prevents expensive DOM re-renders every frame.
	 * * @private
	 * @returns {boolean} True if the room composition, admin list, keys, or friends list changed.
	 */
	private hasStateChanged(): boolean {
		if (typeof ChatRoomData === 'undefined' || ChatRoomData === null || typeof (window as any).Player === 'undefined') {
			return false;
		}

		const currentRoster = ChatRoomData.Character.map((c: any) => c.MemberNumber).join(",");
		const currentAdmins = (ChatRoomData.Admin || []).join(",");
		const player = (window as any).Player;
		const currentKeys = [
			player.MapData?.PrivateState?.HasKeyBronze,
			player.MapData?.PrivateState?.HasKeySilver,
			player.MapData?.PrivateState?.HasKeyGold
		].join(",");
		const currentFriends = (player.FriendList || []).join(",");
		const isMapActive = ChatRoomMapViewIsActive();

		if (currentRoster !== this.lastRoster ||
			currentAdmins !== this.lastAdminList ||
			currentKeys !== this.lastKeys ||
			currentFriends !== this.lastFriends ||
			isMapActive !== this.lastMapState) {

			this.lastRoster = currentRoster;
			this.lastAdminList = currentAdmins;
			this.lastKeys = currentKeys;
			this.lastFriends = currentFriends;
			this.lastMapState = isMapActive;
			return true;
		}
		return false;
	}

	/**
	 * Swaps visual assets and CSS variables based on performance needs.
	 */
	private optimizeVisuals(lowPerf: boolean): void {
		if (!this.instance) return;

		// Toggle Static vs Animated Logo
		const tab = this.instance.querySelector("#drawer-tab");
		if (!tab) return;

		// Bypass optimizations for easteregg
		if (tab.getAttribute("data-mode") === "rave") return;

		const isStatic = tab.getAttribute("data-mode") === "static";
		if (lowPerf && !isStatic) {
			tab.innerHTML = Assets.printimage({ key: "logo" }); // Ensure this exists in Assets
			tab.setAttribute("data-mode", "static");
		} else if (!lowPerf && isStatic) {
			tab.innerHTML = Assets.printimage({ key: "animated_logo" });
			tab.setAttribute("data-mode", "animated");
		}

		// Toggle Blur Radius via CSS Variable
		const blurVal = lowPerf ? "3px" : "10px";
		document.documentElement.style.setProperty("--crabs-blur", blurVal);
	}

	/**
	 * Hooks into the game's render loop to process updates.
	 * Only triggers a refresh if the drawer is open, not on the help screen, and state has changed.
	 * * @private
	 * @returns {void}
	 */
	private setupDynamicUpdates(): void {
		this.CRABS.hookFunction("ChatRoomRun", 10, (functionArguments, next) => {
			const result = next(functionArguments);

			// Update the performance state (defined in CRABS_Base)
			this.updatePerformanceState();

			// Determine how many frames to skip based on performance tier
			let threshold = 5; // Normal: ~12 polls/sec
			if (this.currentPerformanceLevel === PerformanceLevel.LOW) {
				threshold = 30; // Low: ~2 polls/sec
				this.optimizeVisuals(true); // Helper to swap logo/blur
			} else if (this.currentPerformanceLevel === PerformanceLevel.CRITICAL) {
				threshold = 120; // Critical: ~once every 2 secs
				this.optimizeVisuals(true);
			} else {
				this.optimizeVisuals(false);
			}

			// Process the poll
			this.updateTick++;
			if (this.updateTick >= threshold) {
				this.updateTick = 0;

				// Continuously evaluate visibility (Auto-stowing on focus screens)
				this.updateVisibility();

				// Only refresh if Drawer is open, not showing help, AND state actually changed
				if (this.isOpen && !this.showingHelp && this.hasStateChanged()) {
					this.refresh();
				}
			}

			return result;
		});
	}

	/**
	 * Compiles the drawer HTML template and injects it into the document body.
	 * Binds internal events once the element is created.
	 * * @private
	 * @returns {void}
	 */
	private setupElement(): void {
		if (this.instance) return;

		let title = "CRABS: Roster";
		if (typeof ChatRoomData !== 'undefined' && ChatRoomData !== null && ChatRoomData.Name) {
			title = `CRABS: ${ChatRoomData.Name}`;
		}

		const templateVars = {
			Help: Assets.printimage({ key: "help", css_class_override: "CRABS_Drawer_Help_Icon" }),
			Settings: Assets.printimage({ key: "settings", css_class_override: "CRABS_Drawer_Settings_Icon" }),
			TabIcon: Assets.printimage({ key: "animated_logo" }),
			TitleBar: title,
			Close: Assets.printimage({ key: "close", css_class_override: "CRABS_Drawer_Close_Icon" }),
		};

		const html = this.template(drawertemplate, templateVars, false);
		const container = document.createElement("div");
		container.innerHTML = html;
		const element = container.firstElementChild as HTMLElement;

		if (element) {
			element.style.display = "none";
			document.body.appendChild(element);
			this.instance = element;
			this.bindEvents();
		}
	}

	/**
	 * Aligns the drawer UI to the dimensions and position of the native game chat log.
	 * Adapts dynamically to window resizing and user settings.
	 * * @private
	 * @returns {void}
	 */
	private syncToChat(): void {
		const chatLog = document.getElementById("TextAreaChatLog");
		if (!chatLog || !this.instance) return;

		const rect = chatLog.getBoundingClientRect();

		if (rect.width === 0 || rect.height === 0) {
			this.instance.style.top = "0px";
			this.instance.style.height = "100%";
			this.instance.style.width = "400px";
			this.instance.style.right = "0px";
			return;
		}

		this.instance.style.top = `${rect.top}px`;
		this.instance.style.width = `${rect.width}px`;

		if (Settings.instance.data.compactDrawer) {
			this.instance.style.height = `${rect.height * 0.77}px`;
		} else {
			this.instance.style.height = `${rect.height}px`;
		}

		const rightOffset = document.documentElement.clientWidth - rect.right;
		this.instance.style.right = `${rightOffset}px`;
	}

	/**
	 * Determines whether the drawer should be injected into the DOM workflow based on:
	 * User settings, current screen (ChatRoom), and modal overlays (CurrentCharacter).
	 * * @returns {void}
	 */
	public updateVisibility(): void {
		if (!this.instance) return;

		if (Settings.instance.data.disableDrawer) {
			this.instance.style.display = "none";
			this.close();
			return;
		}

		const inChatRoom = typeof ChatRoomData !== 'undefined' &&
			ChatRoomData !== null &&
			(typeof CurrentScreen === 'undefined' || CurrentScreen === "ChatRoom");

		if (!inChatRoom) {
			this.instance.style.display = "none";
			this.close();

			if (this.resizeObserver) {
				this.resizeObserver.disconnect();
				this.resizeObserver = null;
			}
		} else {
			const isFocused = (window as any).CurrentCharacter !== null;
			this.instance.style.display = isFocused ? "none" : "flex";

			const tab = this.instance.querySelector("#drawer-tab") as HTMLElement;
			if (tab) {
				const shouldHideTab = Settings.instance.data.hideDrawerTab && Settings.instance.data.rosterOpensDrawer;
				tab.style.display = (shouldHideTab || isFocused) ? "none" : "flex";
			}

			if (!this.resizeObserver) {
				const chatLog = document.getElementById("TextAreaChatLog");
				if (chatLog) {
					this.resizeObserver = new ResizeObserver(() => this.syncToChat());
					this.resizeObserver.observe(chatLog);
					this.syncToChat();
				}
			} else {
				this.syncToChat();
			}
		}
	}

	/**
		 * Completely rebuilds the inner HTML of the drawer based on the current context 
		 * (Help Menu vs. Player Roster) and fires sub-module UI builds.
		 * @returns {void}
		 */
	public refresh(): void {
		const content = this.instance?.querySelector("#CRABS_Drawer_Roster");
		const title = this.instance?.querySelector("#drawer-title") as HTMLElement;
		const helpIconContainer = this.instance?.querySelector(".CRABS_Drawer_Help_Icon");

		// Grab the whole container so we hide the text AND the dropdown
		const sortContainer = this.instance?.querySelector("#CRABS_sort_container") as HTMLElement;

		const isRoomReady = typeof ChatRoomData !== 'undefined' && ChatRoomData !== null;

		if (content && isRoomReady) {
			const roomName = ChatRoomData.Name || "Roster";
			const rosterTitle = `CRABS: ${roomName}`;

			if (this.showingHelp) {
				if (title && title.textContent !== "CRABS: Help") title.textContent = "CRABS: Help";

				if (helpIconContainer && helpIconContainer.getAttribute("data-icon") !== "roster") {
					helpIconContainer.innerHTML = Assets.printimage({
						key: "roster",
						css_class_override: "CRABS_Drawer_Help_Icon"
					});
					helpIconContainer.setAttribute("data-icon", "roster");
				}

				// Hide the entire sort container
				if (sortContainer) sortContainer.style.display = "none";

				content.innerHTML = this.helpModule.showHelp(false);
			} else {
				if (title && title.textContent !== rosterTitle) title.textContent = rosterTitle;

				if (helpIconContainer && helpIconContainer.getAttribute("data-icon") !== "help") {
					helpIconContainer.innerHTML = Assets.printimage({
						key: "help",
						css_class_override: "CRABS_Drawer_Help_Icon"
					});
					helpIconContainer.setAttribute("data-icon", "help");
				}

				// Show the entire sort container (use flex to keep them aligned)
				if (sortContainer) sortContainer.style.display = "flex";

				content.innerHTML = this.rosterModule.buildroster("all", false);
				this.rosterModule.initScrollingOverflow();

				if (this.instance) {
					this.rosterModule.buildui(undefined, undefined, this.instance);
					this.whisperPlusModule.buildui(undefined, undefined, this.instance);
				}
			}
			this.syncToChat();
		}
	}

	/**
	 * Overrides the base class openSettings to ensure the drawer 
	 * slides closed before the settings modal appears.
	 * * @override
	 * @returns {Promise<void>}
	 */
	public override async openSettings(): Promise<void> {
		this.close();
		await super.openSettings();
	}

	/**
	 * Attaches click event listeners to the interactive elements within the drawer header.
	 * Delegates handling for the Tab, Help, Settings, and Close buttons.
	 * * @private
	 * @returns {void}
	 */
	private bindEvents(): void {
		if (!this.instance) return;

		const tab = this.instance.querySelector("#drawer-tab") as HTMLElement;
		if (tab) {
			tab.addEventListener("click", () => {
				if (!this.isOpen) this.refresh();
				this.toggle();
			});
		}

		this.instance.addEventListener("click", (event) => {
			const target = event.target as HTMLElement;

			if (target.closest(".CRABS_Drawer_Help_Icon")) {
				this.showingHelp = !this.showingHelp;
				this.refresh();
			} else if (target.closest(".CRABS_Drawer_Settings_Icon")) {
				this.openSettings();
			} else if (target.closest(".CRABS_Drawer_Close_Icon")) {
				event.stopPropagation();
				if (this.showingHelp) {
					this.showingHelp = false;
					this.refresh();
				} else {
					this.close();
				}
			}
		});
	}

	/**
	 * Alternates the drawer's state between open and closed.
	 * * @returns {void}
	 */
	public toggle(): void {
		this.isOpen ? this.close() : this.open();
	}

	/**
	 * Opens the drawer by updating the CSS classes and triggering a content refresh.
	 * * @returns {void}
	 */
	public open(): void {
		if (!this.instance) return;
		this.refresh();
		this.isOpen = true;
		this.instance.classList.replace("drawer-closed", "drawer-open");
	}

	/**
	 * Closes the drawer by updating the CSS classes.
	 * * @returns {void}
	 */
	public close(): void {
		if (!this.instance) return;
		this.isOpen = false;
		this.instance.classList.replace("drawer-open", "drawer-closed");

		// Clear the tracked compass player when stowed
		if (this.rosterModule) {
			this.rosterModule.clearTracking();
		}
	}
}
