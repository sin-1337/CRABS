import { CRABS_Base } from "./base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Settings } from "./settings";

/**
 * CRABS Chat Manager Module
 * Handles all modifications, parsing, and enhancements to the base game's 
 * chat log and message rendering pipeline.
 */
export class ChatManager extends CRABS_Base {

	constructor(CRABS: ModSDKModAPI) {
		super(CRABS);
		this.injectCSS();
		this.setupMessageHooks();
	}

	/**
	 * Injects layout-only CSS. Colors are now handled dynamically via inline styles
	 * to respect user settings and alpha transparency requirements.
	 */
	private injectCSS(): void {
		if (document.getElementById("CRABS-chat-styles")) return;

		const style = document.createElement("style");
		style.id = "CRABS-chat-styles";
		style.innerHTML = `
            .CRABS_mention_highlight {
                border-left-style: solid !important;
                border-left-width: 4px !important;
                border-radius: 4px;
                padding-left: 6px;
                margin-top: 2px;
                margin-bottom: 2px;
            }
        `;
		document.head.appendChild(style);
	}

	/**
	 * Custom mention detector that handles both Name, Nickname,
	 * and a user-defined list of custom words.
	 */
	private isPlayerMentioned(msg: string): boolean {
		const player = (window as any).Player;
		if (!player || !msg) return false;

		const namesToMatch: string[] = [];
		const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

		if (player.Name && player.Name.trim() !== "") {
			namesToMatch.push(escapeRegExp(player.Name.trim()));
		}
		if (player.Nickname && player.Nickname.trim() !== "") {
			namesToMatch.push(escapeRegExp(player.Nickname.trim()));
		}

		const customWordsSetting = Settings.instance.data.customHighlightWords;
		if (customWordsSetting && customWordsSetting.trim() !== "") {
			const customWords = String(customWordsSetting || "")
				.split(',')
				.map((w: string) => w.trim())
				.filter((w: string) => w !== "");
			for (const word of customWords) {
				namesToMatch.push(escapeRegExp(word));
			}
		}

		if (namesToMatch.length === 0) return false;

		const regex = new RegExp(`(?:^|\\W)(${namesToMatch.join('|')})(?:$|\\W)`, 'i');
		return regex.test(msg);
	}

	/**
	 * Intercepts chat messages and applies dynamic highlighting based on user preferences.
	 */
	private setupMessageHooks(): void {

		this.safeHook("ChatRoomMessageDisplay", 10, (args: any, next: Function) => {
			const data = args[0];
			const msg = args[1];
			const sender = args[2];

			const globalWindow = window as any;
			const isAtBottom = typeof globalWindow.ElementIsScrolledToEnd === "function"
				? globalWindow.ElementIsScrolledToEnd("TextAreaChatLog")
				: true;

			const div = next(args);

			if (!div || !(div instanceof HTMLElement)) return div;
			if (!Settings.instance.data.highlightMentions) return div;

			if (data && (data.Type === "ServerMessage" || data.Type === "Activity")) return div;
			if (sender && sender.MemberNumber === globalWindow.Player.MemberNumber) return div;

			if (msg && this.isPlayerMentioned(String(msg))) {
				div.classList.add("CRABS_mention_highlight");

				// --- DYNAMIC COLOR APPLICATION ---
				// Grabs the user's hex choice and converts it using the base class helper
				const userHex = Settings.instance.data.highlightColor || "#FFFF00";

				// Set the border to 0.8 alpha and background to 0.01 alpha as requested
				div.style.borderLeftColor = this.convertColor(userHex, 0.8);
				div.style.backgroundColor = this.convertColor(userHex, 0.01);

				if (isAtBottom && typeof globalWindow.ElementScrollToEnd === "function") {
					setTimeout(() => {
						globalWindow.ElementScrollToEnd("TextAreaChatLog");
					}, 0);
				}
			}

			return div;
		});
	}
}
