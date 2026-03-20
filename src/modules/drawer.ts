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
			document.body.appendChild(element);
			this.instance = element;
			this.bindEvents();

			// Check visibility immediately on load
			this.updateVisibility();
		}
	}

	/**
	 * Shows or hides the entire drawer container based on room status
	 */
	public updateVisibility(): void {
		if (!this.instance) return;

		// If not in a room, hide the element entirely
		if (Player.LastChatRoom === null) {
			this.instance.style.display = "none";
			this.close(); // Force close if they leave while it's open
		} else {
			this.instance.style.display = "flex";
			this.refresh();
		}
	}

	public refresh(): void {
		const content = this.instance?.querySelector("#CRABS_Roster");
		if (content && Player.LastChatRoom !== null) {
			content.innerHTML = this.rosterModule.buildroster("all");
			this.rosterModule.initScrollingOverflow();
		}
	}

	private bindEvents(): void {
		const tab = this.instance?.querySelector("#drawer-tab") as HTMLElement;
		if (tab) {
			tab.addEventListener("click", () => {
				if (!this.isOpen) this.refresh();
				this.toggle();
			});
		}

		// Close button listener
		const closeBtn = this.instance?.querySelector(".CRABS_close") as HTMLElement;
		if (closeBtn) {
			closeBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				this.close();
			});
		}
	}

	public toggle(): void { this.isOpen ? this.close() : this.open(); }

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
