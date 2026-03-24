import { CRABS_Base } from "./base";
import { Assets } from "./assets";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Roster } from "./roster";
import "./templates/drawer.css";
import drawertemplate from "./templates/drawer.html";

import { Help } from "./help";
import { WhisperPlus } from "./whisperplus";
import { Settings } from "./Settings";

export class Drawer extends CRABS_Base {
	private isOpen: boolean = false;
	private readonly DRAWER_ID: string = "crabs-drawer";
	private instance: HTMLElement | null = null;
	private rosterModule: Roster;
	private helpModule: Help;
	private whisperPlusModule: WhisperPlus;
	private settingsModule: Settings;
	private resizeObserver: ResizeObserver | null = null;
	private showingHelp: boolean = false;

	constructor(CRABS: ModSDKModAPI, roster: Roster, help: Help, whisperPlus: WhisperPlus, settings: Settings) {
		super(CRABS);
		this.rosterModule = roster;
		this.helpModule = help;
		this.whisperPlusModule = whisperPlus;
		this.settingsModule = settings;
		this.init();
	}

	private init(): void {
		if (document.body) {
			this.setupElement();
		} else {
			document.addEventListener("DOMContentLoaded", () => this.setupElement());
		}

		// Global ESC key listener using capture phase to intercept before game handlers
		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && this.isOpen) {
				this.close();
			}
		}, true);
	}

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
	 * Magnetically locks the drawer to the exact dimensions of the game's chat log
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
		if (this.settingsModule.data.compactDrawer) {
			this.instance.style.height = `${rect.height * 0.77}px`;
		} else {
			this.instance.style.height = `${rect.height}px`;
		}

		// Calculate the exact right offset to account for letterboxing
		const rightOffset = document.documentElement.clientWidth - rect.right;
		this.instance.style.right = `${rightOffset}px`;
	}

	/**
	 * Shows or hides the entire drawer container based on room status
	 */
	public updateVisibility(): void {
		if (!this.instance) return;

		// Respect the disableDrawer setting
		if (this.settingsModule.data.disableDrawer) {
			this.instance.style.display = "none";
			this.close();
			return;
		}

		// The drawer should only be visible when actually in a chat room screen
		const inChatRoom = typeof ChatRoomData !== 'undefined' && 
						   ChatRoomData !== null && 
						   (typeof CurrentScreen === 'undefined' || CurrentScreen === "ChatRoom");

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

	public refresh(): void {
		const content = this.instance?.querySelector("#CRABS_Drawer_Roster");
		const title = this.instance?.querySelector("#drawer-title") as HTMLElement;

		// ADDED CHECK: Ensure ChatRoomData exists and isn't null before trying to refresh
		const isRoomReady = typeof ChatRoomData !== 'undefined' && ChatRoomData !== null;

		if (content && isRoomReady) {
			if (this.showingHelp) {
				if (title) title.textContent = "CRABS: Help";
				content.innerHTML = this.helpModule.showHelp(false);
			} else {
				if (title) title.textContent = "CRABS: Roster";
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

	public override openSettings(): void {
		// Close drawer first
		this.close();
		// Then call base settings logic
		super.openSettings();
	}

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
			newCloseBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				if (this.showingHelp) {
					this.showingHelp = false;
					this.refresh();
				} else {
					this.close();
				}
			});
		}
	}

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

	public toggle(): void {
		this.isOpen ? this.close() : this.open();
	}

	public open(): void {
		if (!this.instance) return;
		this.isOpen = true;
		this.instance.classList.replace("drawer-closed", "drawer-open");
	}

	public close(): void {
		if (!this.instance) return;
		this.isOpen = false;
		this.instance.classList.replace("drawer-open", "drawer-closed");
	}
}
