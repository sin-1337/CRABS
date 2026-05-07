import { CRABS_Base } from "./base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Drawer } from "./drawer";
import { Settings } from "./settings";
import { Roster } from "./roster";
import { Banner } from "./banner";

export class Setup extends CRABS_Base {
	private crabsLastRoomID: number | null = null;
	private rosterModule: Roster;
	private bannerModule: Banner;

	constructor(CRABS: ModSDKModAPI, roster: Roster, banner: Banner) {
		super(CRABS);
		this.rosterModule = roster;
		this.bannerModule = banner;
		this.initHooks();
		this.hookNativeExit();
	}

	private initHooks(): void {

		// Auto-stow Drawer on Chat
		this.safeHook("ChatRoomSendChat", 10, (args, next) => {
			const chatInput = document.getElementById("InputChat") as HTMLTextAreaElement;
			const message = chatInput?.value?.toLowerCase().trim() || "";
			const result = next(args);

			if (Settings.instance?.data.closeDrawerOnChat) {
				if (!message.startsWith("/roster") && !message.startsWith("/crabs")) {
					Drawer.close();
				}
			}
			return result;
		});

		// Handle Room Joins and UI Recovery
		this.safeHook("ChatRoomUpdateDisplay", 10, (args, next) => {
			const result = next(args);

			const inChatRoom = typeof ChatRoomData !== "undefined" && ChatRoomData !== null &&
				(typeof CurrentScreen === "undefined" || CurrentScreen === "ChatRoom");

			if (inChatRoom) {
				// Just joined a new room
				if (ChatRoomData.ID !== this.crabsLastRoomID) {
					this.crabsLastRoomID = ChatRoomData.ID;
					Drawer.updateVisibility();
					Settings.instance?.syncGameState();

					if (Settings.instance?.data.showBanner) {
						this.drawbanner();
					}
				}

				// Returned from Wardrobe/Profile
				const isFocused = (window as any).CurrentCharacter !== null;
				const drawerElement = document.getElementById("crabs-drawer");

				if (!isFocused && drawerElement && drawerElement.style.display === "none" && !Settings.instance?.data.enableDrawer) {
					Drawer.updateVisibility();
				}
			} else {
				this.crabsLastRoomID = null; // Left the room
			}

			return result;
		});

		// Auto-stow Drawer on Screen Change
		this.safeHook("CommonSetScreen", 0, (args, next) => {
			const result = next(args);
			Drawer.updateVisibility();
			return result;
		});

		// Auto-stow Drawer on Character Focus
		this.safeHook("ChatRoomFocusCharacter", 0, (args, next) => {
			const result = next(args);
			Drawer.updateVisibility();
			return result;
		});

		// Recover Drawer on Dialog Leave
		this.safeHook("DialogLeave", 0, (args, next) => {
			const result = next(args);
			Drawer.updateVisibility();
			return result;
		});
	}

	private hookNativeExit(): void {
		const nativeChatRoomExit = window.ChatRoomExit;
		window.ChatRoomExit = function () {
			if (typeof nativeChatRoomExit === "function") {
				nativeChatRoomExit();
			}
			Drawer.updateVisibility();
		};
	}

	public drawbanner(): void | boolean {
		if (typeof Player === 'undefined' || Player.LastChatRoom === null) return false;

		const extraData = {
			RosterCounters: this.rosterModule.buildroster("count", false),
		};
		this.bannerModule.drawBanner(extraData);
	}
}

