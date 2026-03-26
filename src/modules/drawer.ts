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

import { CRABS_Base } from "./base";
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
 */
export class Drawer extends CRABS_Base {
	/** Singleton instance of the Drawer. */
	private static _instance: Drawer | null = null;
	/** Whether the drawer is currently open. */
	private isOpen: boolean = false;
	/** The HTML element for the drawer instance. */
	private instance: HTMLElement | null = null;
	/** Reference to the Roster module. */
	private rosterModule: Roster;
	/** Reference to the Help module. */
	private helpModule: Help;
	/** Reference to the WhisperPlus module. */
	private whisperPlusModule: WhisperPlus;
	/** Observer for tracking changes to the chat log size. */
	private resizeObserver: ResizeObserver | null = null;
	/** Whether the help screen is currently being displayed within the drawer. */
	private showingHelp: boolean = false;
	/** Cached state of the player's keys to prevent redundant refreshes on map draw. */
	private lastKeys: string = "";
	/** Cached count of characters in the room to optimize refreshing. */
	private lastCharacterCount: number = 0;
	/** Cached list of room administrators to optimize refreshing. */
	private lastAdminList: string = "";

	/**
	 * Creates an instance of the Drawer module.
	 * 
	 * @param {ModSDKModAPI} CRABS - The ModSDK API instance.
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

	/** Static method to toggle the drawer's open state. */
	public static toggle(): void { Drawer._instance?.toggle(); }
	/** Static method to open the drawer. */
	public static open(): void { Drawer._instance?.open(); }
	/** Static method to close the drawer. */
	public static close(): void { Drawer._instance?.close(); }
	/** Static method to update the drawer's visibility based on game state. */
	public static updateVisibility(): void { Drawer._instance?.updateVisibility(); }
	/** Static method to refresh the content within the drawer. */
	public static refresh(): void { Drawer._instance?.refresh(); }
	/** Static method to check if the help screen is currently showing. */
	public static isShowingHelp(): boolean { return Drawer._instance?.showingHelp ?? false; }
	/** Static method to set whether the help screen should be shown. */
	public static setShowingHelp(value: boolean): void { if (Drawer._instance) Drawer._instance.showingHelp = value; }
	/** Static method to trigger the Rave Tab effect. */
	public static RaveTab(): void { Drawer._instance?.RaveTab(); }

	/**
	 * Temporarily changes the tab icon to the Rave version.
	 * 
	 * @returns {void}
	 */
	public RaveTab(): void {
		if (!this.instance) return;
		const tab = this.instance.querySelector("#drawer-tab");
		if (!tab) return;

		const originalIcon = Assets.printimage({ key: "animated_logo" });
		const raveIcon = Assets.printimage({ key: "rave" });

		tab.innerHTML = raveIcon;
		setTimeout(() => {
			if (tab) tab.innerHTML = originalIcon;
		}, 10000);
	}

	/**
	 * Initializes the drawer module and sets up global event listeners.
	 * 
	 * @returns {void}
	 */
	private init(): void {
		if (document.body) {
			this.setupElement();
		} else {
			document.addEventListener("DOMContentLoaded", () => this.setupElement());
		}

		// Global ESC key listener using capture phase to intercept before game handlers
		document.addEventListener("keydown", (event) => {
			if (event.key === "Escape" && this.isOpen) {
				this.close();
			}
		}, true);

		this.setupDynamicUpdates();
	}

	/**
	 * Sets up hooks and observers to dynamically refresh the drawer content.
	 * 
	 * @returns {void}
	 */
	private setupDynamicUpdates(): void {
		// Hook into chat room messages to detect joins/leaves
		this.CRABS.hookFunction("ChatRoomMessage", 10, (functionArguments, next) => {
			const result = next(functionArguments);

			// Check if character count changed to detect joins/leaves
			if (this.isOpen && !this.showingHelp && ChatRoomData) {
				if (ChatRoomData.Character.length !== this.lastCharacterCount) {
					this.refresh();
				}
			}

			return result;
		});

		// Hook into screen changes and room updates
		this.CRABS.hookFunction("CommonSetScreen", 10, (functionArguments, next) => {
			const result = next(functionArguments);

			if (this.isOpen && !this.showingHelp && ChatRoomData) {
				const currentAdminList = (ChatRoomData.Admin || []).join(",");
				if (currentAdminList !== this.lastAdminList) {
					this.refresh();
				}
			}

			return result;
		});

		// Hook into map draw to detect key changes
		this.CRABS.hookFunction("ChatRoomMapViewDraw", 5, (functionArguments, next) => {
			const result = next(functionArguments);

			if (this.isOpen && !this.showingHelp && (window as any).ChatRoomMapViewIsActive?.()) {
				const currentKeys = [
					Player.MapData.PrivateState?.HasKeyBronze,
					Player.MapData.PrivateState?.HasKeySilver,
					Player.MapData.PrivateState?.HasKeyGold
				].join(",");

				if (currentKeys !== this.lastKeys) {
					this.refresh();
				}
			}

			return result;
		});
	}

	/**
	 * Creates and attaches the drawer element to the DOM.
	 * 
	 * @returns {void}
	 */
	private setupElement(): void {
		if (this.instance) return; // already initialized

		const templateVars = {
			Help: Assets.printimage({
				key: "help",
				css_class_override: "CRABS_Drawer_Help_Icon"
			}),
			Settings: Assets.printimage({
				key: "settings",
				css_class_override: "CRABS_Drawer_Settings_Icon"
			}),
			TabIcon: Assets.printimage({
				key: "animated_logo"
			}),
			TitleBar: `CRABS: Roster`,
			Close: Assets.printimage({
				key: "close",
				css_class_override: "CRABS_Drawer_Close_Icon"
			}),
		};

		const html = this.template(drawertemplate, templateVars, false);
		const container = document.createElement("div");
		container.innerHTML = html;
		const element = container.firstElementChild as HTMLElement;

		if (element) {
			// Ensure it is hidden by default and added to body
			element.style.display = "none";
			document.body.appendChild(element);
			this.instance = element;
			this.bindEvents();
		}
	}

	/**
	 * Magnetically locks the drawer to the exact dimensions of the game's chat log.
	 * 
	 * @returns {void}
	 */
	private syncToChat(): void {
		const chatLog = document.getElementById("TextAreaChatLog");
		if (!chatLog || !this.instance) return;

		// Get the precise pixel coordinates of the chat box
		const rect = chatLog.getBoundingClientRect();

		// If rect has no size, wait for UI to settle
		if (rect.width === 0 || rect.height === 0) {
			// Fallback: if in room but no chat log yet, try to be at right edge
			this.instance.style.top = "0px";
			this.instance.style.height = "100%";
			this.instance.style.width = "400px";
			this.instance.style.right = "0px";
			return;
		}

		// Apply dimensions directly to the drawer to perfectly cover the chat log
		this.instance.style.top = `${rect.top}px`;
		this.instance.style.width = `${rect.width}px`;

		// Handle compact height setting (77% of chat height)
		if (Settings.instance.data.compactDrawer) {
			this.instance.style.height = `${rect.height * 0.77}px`;
		} else {
			this.instance.style.height = `${rect.height}px`;
		}

		// Calculate the exact right offset to account for letterboxing
		const rightOffset = document.documentElement.clientWidth - rect.right;
		this.instance.style.right = `${rightOffset}px`;
	}

	/**
	 * Shows or hides the entire drawer container based on room status.
	 * 
	 * @returns {void}
	 */
	public updateVisibility(): void {
		if (!this.instance) return;

		// Respect the disableDrawer setting
		if (Settings.instance.data.disableDrawer) {
			this.instance.style.display = "none";
			this.close();
			return;
		}

		// The drawer should only be visible when actually in a chat room screen AND no character is focused
		const inChatRoom = typeof ChatRoomData !== 'undefined' &&
			ChatRoomData !== null &&
			(typeof CurrentScreen === 'undefined' || CurrentScreen === "ChatRoom") &&
			(window as any).CurrentCharacter === null;

		if (!inChatRoom) {
			this.instance.style.display = "none";
			this.close();

			// Clean up the observer when leaving a room
			if (this.resizeObserver) {
				this.resizeObserver.disconnect();
				this.resizeObserver = null;
			}
		} else {
			this.instance.style.display = "flex";

			// Handle tab visibility based on settings
			const tab = this.instance.querySelector("#drawer-tab") as HTMLElement;
			if (tab) {
				const shouldHideTab = Settings.instance.data.hideDrawerTab && Settings.instance.data.rosterOpensDrawer;
				tab.style.display = shouldHideTab ? "none" : "flex";
			}

			// --- NEW: Attach observer only when entering a room ---
			if (!this.resizeObserver) {
				const chatLog = document.getElementById("TextAreaChatLog");
				if (chatLog) {
					this.resizeObserver = new ResizeObserver(() => this.syncToChat());
					this.resizeObserver.observe(chatLog);
					this.syncToChat(); // Force an immediate sync
				}
			} else {
				// Observer exists, but maybe UI shifted
				this.syncToChat();
			}
			// ------------------------------------------------------

			this.refresh();
		}
	}

	/**
	 * Re-renders and updates the content within the drawer.
	 * 
	 * @returns {void}
	 */
	public refresh(): void {
		const content = this.instance?.querySelector("#CRABS_Drawer_Roster");
		const title = this.instance?.querySelector("#drawer-title") as HTMLElement;
		const helpIconContainer = this.instance?.querySelector(".CRABS_Drawer_Help_Icon");

		// ADDED CHECK: Ensure ChatRoomData exists and isn't null before trying to refresh
		const isRoomReady = typeof ChatRoomData !== 'undefined' && ChatRoomData !== null;

		if (content && isRoomReady) {
			// Update state caches
			this.lastCharacterCount = ChatRoomData.Character.length;
			this.lastAdminList = (ChatRoomData.Admin || []).join(",");
			this.lastKeys = [
				Player.MapData?.PrivateState?.HasKeyBronze,
				Player.MapData?.PrivateState?.HasKeySilver,
				Player.MapData?.PrivateState?.HasKeyGold
			].join(",");

			if (this.showingHelp) {
				if (title) title.textContent = "CRABS: Help";
				if (helpIconContainer) {
					helpIconContainer.innerHTML = Assets.printimage({
						key: "roster",
						css_class_override: "CRABS_Drawer_Help_Icon"
					});
				}
				content.innerHTML = this.helpModule.showHelp(false);
			} else {
				if (title) title.textContent = "CRABS: Roster";
				if (helpIconContainer) {
					helpIconContainer.innerHTML = Assets.printimage({
						key: "help",
						css_class_override: "CRABS_Drawer_Help_Icon"
					});
				}
				// Build roster WITHOUT its own wrapper since the drawer IS the wrapper
				content.innerHTML = this.rosterModule.buildroster("all", false);
				this.rosterModule.initScrollingOverflow();

				// Re-attach all events scoped strictly to this drawer instance
				if (this.instance) {
					this.rosterModule.buildui(undefined, undefined, this.instance);
					this.whisperPlusModule.buildui(undefined, undefined, this.instance);
				}
			}
			// Re-bind header buttons as they might have been part of the refresh
			this.bindHeaderButtons();
			this.syncToChat(); // Keep aligned
		}
	}

	/**
	 * Overrides the base openSettings method to close the drawer before navigating.
	 * 
	 * @returns {Promise<void>}
	 */
	public override async openSettings(): Promise<void> {
		// Close drawer first
		this.close();
		// Then call base settings logic
		await super.openSettings();
	}

	/**
	 * Binds events to the buttons in the drawer header.
	 * 
	 * @returns {void}
	 */
	private bindHeaderButtons(): void {
		if (!this.instance) return;

		// Bind Help icon inside the drawer header
		const helpBtn = this.instance.querySelector(".CRABS_Drawer_Help_Icon") as HTMLElement;
		if (helpBtn) {
			helpBtn.replaceWith(helpBtn.cloneNode(true));
			const newHelpBtn = this.instance.querySelector(".CRABS_Drawer_Help_Icon") as HTMLElement;
			newHelpBtn.addEventListener("click", () => {
				this.showingHelp = !this.showingHelp;
				this.refresh();
			});
		}

		// Bind Settings icon inside the drawer header
		const settingsBtn = this.instance.querySelector(".CRABS_Drawer_Settings_Icon") as HTMLElement;
		if (settingsBtn) {
			settingsBtn.replaceWith(settingsBtn.cloneNode(true));
			const newSettingsBtn = this.instance.querySelector(".CRABS_Drawer_Settings_Icon") as HTMLElement;
			newSettingsBtn.addEventListener("click", () => {
				this.openSettings();
			});
		}

		// Bind Close icon inside the drawer header
		const closeBtn = this.instance.querySelector(".CRABS_Drawer_Close_Icon") as HTMLElement;
		if (closeBtn) {
			closeBtn.replaceWith(closeBtn.cloneNode(true));
			const newCloseBtn = this.instance.querySelector(".CRABS_Drawer_Close_Icon") as HTMLElement;
			newCloseBtn.addEventListener("click", (event) => {
				event.stopPropagation();
				if (this.showingHelp) {
					this.showingHelp = false;
					this.refresh();
				} else {
					this.close();
				}
			});
		}
	}

	/**
	 * Binds events to the drawer tab and other interactive elements.
	 * 
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

		this.bindHeaderButtons();
	}

	/**
	 * Toggles the drawer between open and closed states.
	 * 
	 * @returns {void}
	 */
	public toggle(): void {
		this.isOpen ? this.close() : this.open();
	}

	/**
	 * Opens the drawer with an animation.
	 * 
	 * @returns {void}
	 */
	public open(): void {
		if (!this.instance) return;
		this.isOpen = true;
		this.instance.classList.replace("drawer-closed", "drawer-open");
	}

	/**
	 * Closes the drawer with an animation.
	 * 
	 * @returns {void}
	 */
	public close(): void {
		if (!this.instance) return;
		this.isOpen = false;
		this.instance.classList.replace("drawer-open", "drawer-closed");
	}
}
