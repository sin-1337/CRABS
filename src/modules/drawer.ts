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
	private static _instance: Drawer | null = null;
	private isOpen: boolean = false;
	private instance: HTMLElement | null = null;
	private rosterModule: Roster;
	private helpModule: Help;
	private whisperPlusModule: WhisperPlus;
	private resizeObserver: ResizeObserver | null = null;
	private showingHelp: boolean = false;

	// State Tracking for Optimized UI Refreshes
	private lastRoster: string = "";
	private lastAdminList: string = "";
	private lastKeys: string = "";
	private lastFriends: string = "";

	constructor(CRABS: ModSDKModAPI, roster: Roster, help: Help, whisperPlus: WhisperPlus) {
		super(CRABS);
		Drawer._instance = this;
		this.rosterModule = roster;
		this.helpModule = help;
		this.whisperPlusModule = whisperPlus;
		this.init();
	}

	public static toggle(): void { Drawer._instance?.toggle(); }
	public static open(): void { Drawer._instance?.open(); }
	public static close(): void { Drawer._instance?.close(); }
	public static updateVisibility(): void { Drawer._instance?.updateVisibility(); }
	public static refresh(): void { Drawer._instance?.refresh(); }
	public static isShowingHelp(): boolean { return Drawer._instance?.showingHelp ?? false; }
	public static setShowingHelp(value: boolean): void { if (Drawer._instance) Drawer._instance.showingHelp = value; }
	public static RaveTab(): void { Drawer._instance?.RaveTab(); }

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
	 * Dirty-check to see if the game state has actually changed.
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

		if (currentRoster !== this.lastRoster ||
			currentAdmins !== this.lastAdminList ||
			currentKeys !== this.lastKeys ||
			currentFriends !== this.lastFriends) {

			this.lastRoster = currentRoster;
			this.lastAdminList = currentAdmins;
			this.lastKeys = currentKeys;
			this.lastFriends = currentFriends;
			return true;
		}
		return false;
	}

	private setupDynamicUpdates(): void {
		// Single optimized hook driven by state changes
		this.CRABS.hookFunction("ChatRoomUpdateDisplay", 10, (functionArguments, next) => {
			const result = next(functionArguments);

			if (this.isOpen && !this.showingHelp && this.hasStateChanged()) {
				this.refresh();
			}

			return result;
		});
	}

	private setupElement(): void {
		if (this.instance) return;

		const templateVars = {
			Help: Assets.printimage({ key: "help", css_class_override: "CRABS_Drawer_Help_Icon" }),
			Settings: Assets.printimage({ key: "settings", css_class_override: "CRABS_Drawer_Settings_Icon" }),
			TabIcon: Assets.printimage({ key: "animated_logo" }),
			TitleBar: `CRABS: Roster`,
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

			this.refresh();
		}
	}

	public refresh(): void {
		const content = this.instance?.querySelector("#CRABS_Drawer_Roster");
		const title = this.instance?.querySelector("#drawer-title") as HTMLElement;
		const helpIconContainer = this.instance?.querySelector(".CRABS_Drawer_Help_Icon");

		const isRoomReady = typeof ChatRoomData !== 'undefined' && ChatRoomData !== null;

		if (content && isRoomReady) {
			if (this.showingHelp) {
				if (title && title.textContent !== "CRABS: Help") title.textContent = "CRABS: Help";

				if (helpIconContainer && helpIconContainer.getAttribute("data-icon") !== "roster") {
					helpIconContainer.innerHTML = Assets.printimage({
						key: "roster",
						css_class_override: "CRABS_Drawer_Help_Icon"
					});
					helpIconContainer.setAttribute("data-icon", "roster");
				}

				content.innerHTML = this.helpModule.showHelp(false);
			} else {
				if (title && title.textContent !== "CRABS: Roster") title.textContent = "CRABS: Roster";

				if (helpIconContainer && helpIconContainer.getAttribute("data-icon") !== "help") {
					helpIconContainer.innerHTML = Assets.printimage({
						key: "help",
						css_class_override: "CRABS_Drawer_Help_Icon"
					});
					helpIconContainer.setAttribute("data-icon", "help");
				}

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

	public override async openSettings(): Promise<void> {
		this.close();
		await super.openSettings();
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

	public toggle(): void {
		this.isOpen ? this.close() : this.open();
	}

	public open(): void {
		if (!this.instance) return;
		this.refresh();
		this.isOpen = true;
		this.instance.classList.replace("drawer-closed", "drawer-open");
	}

	public close(): void {
		if (!this.instance) return;
		this.isOpen = false;
		this.instance.classList.replace("drawer-open", "drawer-closed");
	}
}
