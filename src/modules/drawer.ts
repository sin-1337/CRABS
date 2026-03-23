import { CRABS_Base } from "./base";
import { Assets } from "./assets";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Roster } from "./roster";
import "./templates/drawer.css";
import drawertemplate from "./templates/drawer.html";

import { Help } from "./help";

export class Drawer extends CRABS_Base {
	private isOpen: boolean = false;
	private readonly DRAWER_ID: string = "crabs-drawer";
	private instance: HTMLElement | null = null;
	private rosterModule: Roster;
	private helpModule: Help;
	private resizeObserver: ResizeObserver | null = null;
	private showingHelp: boolean = false;

	constructor(CRABS: ModSDKModAPI, roster: Roster, help: Help) {
		super(CRABS);
		this.rosterModule = roster;
		this.helpModule = help;
		this.init();
	}

	private init(): void {
		if (document.body) {
			this.setupElement();
		} else {
			document.addEventListener("DOMContentLoaded", () => this.setupElement());
		}
	}

	private setupElement(): void {
		if (this.instance) return; // already initialized

		const templateVars = {
			Help: Assets.printimage({ key: "help" }),
			TitleBar: `CRABS: Roster`,
			Close: Assets.printimage({
				key: "close",
				data: ["elementid", this.DRAWER_ID], 
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

		// Calculate 100% of the chat log's width
		const targetWidth = rect.width;

		// Apply dimensions directly to the drawer to perfectly cover the chat log
		this.instance.style.top = `${rect.top}px`;
		this.instance.style.width = `${targetWidth}px`;
		this.instance.style.height = `${rect.height}px`;

		// Calculate the exact right offset to account for letterboxing
		const rightOffset = document.documentElement.clientWidth - rect.right;
		this.instance.style.right = `${rightOffset}px`;
	}

	/**
	 * Shows or hides the entire drawer container based on room status
	 */
	public updateVisibility(): void {
		if (!this.instance) return;

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
			}
			this.syncToChat(); // Keep aligned
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

		// Bind Help icon inside the drawer header
		const helpBtn = this.instance.querySelector(".CRABS_Help_Icon") as HTMLElement;
		if (helpBtn) {
			helpBtn.addEventListener("click", () => {
				this.showingHelp = !this.showingHelp;
				this.refresh();
			});
		}

		const closeBtn = this.instance.querySelector(".CRABS_close") as HTMLElement;
		if (closeBtn) {
			closeBtn.addEventListener("click", (e) => {
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
