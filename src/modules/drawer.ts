/**
 * CRABS Drawer Module
 *
 * This module implements the sliding drawer interface for the CRABS mod.
 * It provides:
 * - A persistent UI container for the roster and help screens
 * - Automatic visibility management based on game state
 * - Integration with the game's chat log dimensions
 * - Event handling for navigation and interaction
 * - Event-driven rendering based on the Roster module's state
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
 * @extends CRABS_Base
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
	/** Counter used to throttle frame updates based on performance tier. */
	private updateTick: number = 0;
	/** Cached reference to the tab element to prevent DOM queries in the render loop */
	private tabElement: HTMLElement | null = null;
	/** Cached reference to the chat log element */
	private chatLogElement: HTMLElement | null = null;

	/**
	 * Initializes the Drawer module and sets up the Singleton instance.
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
	 * @returns {void}
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
	 * @private
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
	 * Swaps visual assets and CSS variables based on performance needs.
	 * @param {boolean} lowPerf - Indicates if the system is currently under heavy load.
	 * @private
	 * @returns {void}
	 */
	private optimizeVisuals(lowPerf: boolean): void {
		if (!this.instance) return;

		const tab = this.tabElement;
		// Target the root instance so the class persists across roster redrawing
		const root = this.instance;
		if (!tab) return;

		const currentMode = tab.getAttribute("data-mode");
		if (currentMode === "rave") return;

		// 1. Surgical Logo Swap
		if (lowPerf && currentMode !== "static") {
			tab.innerHTML = Assets.printimage({ key: "logo" });
			tab.setAttribute("data-mode", "static");
		}
		else if (!lowPerf && currentMode !== "animated") {
			tab.innerHTML = Assets.printimage({ key: "animated_logo" });
			tab.setAttribute("data-mode", "animated");
		}

		// 2. Class-Based Performance Toggling
		// Adding the class to the drawer instance itself ensures it affects 
		// all child cards, even if those cards are surgically updated later!
		if (lowPerf && !root.classList.contains("CRABS_perf_low")) {
			root.classList.add("CRABS_perf_low");
		} else if (!lowPerf && root.classList.contains("CRABS_perf_low")) {
			root.classList.remove("CRABS_perf_low");
		}

		// 3. CSS Variable Sync
		const blurVal = lowPerf ? "3px" : "10px";
		if (document.documentElement.style.getPropertyValue("--crabs-blur") !== blurVal) {
			document.documentElement.style.setProperty("--crabs-blur", blurVal);
		}
	}

	/**
		 * Hooks into the game's render loop to process updates.
		 * * This version implements "Surgical Updates": instead of redrawing the entire 
		 * drawer when the roster is dirty, it attempts to target and update specific 
		 * DOM elements. It only falls back to a full refresh if the roster structure 
		 * itself is missing.
		 *
		 * @private
		 * @returns {void}
		 */
	private setupDynamicUpdates(): void {
		this.safeHook("ChatRoomRun", 10, (functionArguments: any, next: (args: any[]) => any) => {
			const result = next(functionArguments);

			this.updatePerformanceState();

			let threshold = 5;
			if (this.currentPerformanceLevel === PerformanceLevel.LOW) {
				threshold = 30;
			} else if (this.currentPerformanceLevel === PerformanceLevel.CRITICAL) {
				threshold = 120;
			}

			this.updateTick++;
			if (this.updateTick >= threshold) {
				this.updateTick = 0;

				this.updateVisibility();

				if (this.isOpen && !this.showingHelp) {
					// 1. ALWAYS run the surgical update if the drawer is open.
					// Because updateRosterUI has its own internal "is dirty" checks 
					// for counters and map-keys, this will now catch map toggles instantly.
					const rosterRoot = this.instance?.querySelector(".CRABS_roster_center_table") as HTMLElement;

					if (rosterRoot) {
						this.rosterModule.updateRosterUI(this.instance!);
					} else if (this.rosterModule.isDirty) {
						// Fallback only if the roster is physically missing from DOM
						this.refresh();
					}

					// 2. Reset the dirty flag
					this.rosterModule.isDirty = false;
				}
			}

			return result;
		});
	}

	/**
	 * Compiles the drawer HTML template and injects it into the document body.
	 * Binds internal events once the element is created.
	 * @private
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

			// NEW: Cache the elements immediately after creating them
			this.tabElement = element.querySelector("#drawer-tab") as HTMLElement;
			this.chatLogElement = document.getElementById("TextAreaChatLog");

			this.bindEvents();
		}
	}

	/**
	 * Aligns the drawer UI to the dimensions and position of the native game chat log.
	 * Adapts dynamically to window resizing and user settings.
	 * @private
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
	 * @returns {void}
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

			const tab = this.tabElement;
			if (tab) {
				const shouldHideTab = Settings.instance.data.hideDrawerTab && Settings.instance.data.rosterOpensDrawer;
				tab.style.display = (shouldHideTab || isFocused) ? "none" : "flex";
			}

			if (!this.resizeObserver) {
				const chatLog = this.chatLogElement; // Use the cache!
				if (chatLog) {
					this.resizeObserver = new ResizeObserver(() => this.syncToChat());
					this.resizeObserver.observe(chatLog);
					this.syncToChat();
				}
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
	 * @override
	 * @returns {Promise<void>}
	 */
	public override async openSettings(): Promise<void> {
		this.close();
		await super.openSettings();
	}

	/**
	 * Attaches click event listeners to the interactive elements within the drawer header.
	 * Delegates handling for the Tab, Help, Settings, and Close buttons.
	 * @private
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
	 * @returns {void}
	 */
	public toggle(): void {
		this.isOpen ? this.close() : this.open();
	}

	/**
	 * Opens the drawer by updating the CSS classes and triggering a content refresh.
	 * @returns {void}
	 */
	public open(): void {
		if (!this.instance) return;
		this.refresh();
		this.isOpen = true;
		this.instance.classList.replace("drawer-closed", "drawer-open");
	}

	/**
	 * Closes the drawer by updating the CSS classes.
	 * @returns {void}
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

