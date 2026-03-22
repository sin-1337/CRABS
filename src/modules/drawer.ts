import { CRABS_Base } from "./base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Roster } from "./roster";
import "./templates/drawer.css";
import drawertemplate from "./templates/drawer.html";

export class Drawer extends CRABS_Base {
	private isOpen: boolean = false;
	private readonly DRAWER_ID: string = "crabs-drawer";
	private instance: HTMLElement | null = null;
	private rosterModule: Roster;
	private resizeObserver: ResizeObserver | null = null;

	constructor(CRABS: ModSDKModAPI, roster: Roster) {
		super(CRABS);
		this.rosterModule = roster;
		this.init();
	}

	private init(): void {
		const html = this.template(drawertemplate, {}, false);
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, 'text/html');
		const element = doc.getElementById(this.DRAWER_ID);

		if (element) {
			// Hide it by default before appending to body
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

		// Apply them directly to the drawer
		this.instance.style.top = `${rect.top}px`;
		this.instance.style.width = `${rect.width}px`;
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

		// Check if Player exists and if they are in a room
		const inRoom = typeof Player !== 'undefined' && Player?.LastChatRoom !== null;

		if (!inRoom) {
			this.instance.style.display = "none";
			this.close();
		} else {
			this.instance.style.display = "flex";
			this.refresh();
		}
	}

	public refresh(): void {
		const content = this.instance?.querySelector("#CRABS_Roster");

		// ADDED CHECK: Ensure ChatRoomData exists and isn't null before trying to refresh
		const isRoomReady = typeof ChatRoomData !== 'undefined' && ChatRoomData !== null;
		const isPlayerReady = typeof Player !== 'undefined' && Player?.LastChatRoom !== null;

		if (content && isPlayerReady && isRoomReady) {
			content.innerHTML = this.rosterModule.buildroster("all");
			this.rosterModule.initScrollingOverflow();
		}
	}

	private bindEvents(): void {
		if (!this.instance) return;

		// --- Start syncing to the chat box ---
		const chatLog = document.getElementById("TextAreaChatLog");
		if (chatLog) {
			this.resizeObserver = new ResizeObserver(() => this.syncToChat());
			this.resizeObserver.observe(chatLog);
			this.syncToChat(); // Run it once immediately
		}

		const tab = this.instance.querySelector("#drawer-tab") as HTMLElement;
		if (tab) {
			tab.addEventListener("click", () => {
				if (!this.isOpen) this.refresh();
				this.toggle();
			});
		}

		const closeBtn = this.instance.querySelector(".CRABS_close") as HTMLElement;
		if (closeBtn) {
			closeBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				this.close();
			});
		}
	} // <-- This was where the break happened!

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
