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
	 * Injects the highlighting CSS directly into the document head to guarantee 
	 * it loads regardless of webpack/bundler configurations.
	 */
	private injectCSS(): void {
		if (document.getElementById("CRABS-chat-styles")) return;

		const style = document.createElement("style");
		style.id = "CRABS-chat-styles";
		style.innerHTML = `
            .CRABS_mention_highlight {
			    background-color: rgba(255, 215, 0, 0.01) !important;
                border-left: 4px solid rgba(255, 215, 0, 0.8) !important;
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
	 * @param {string} msg - The text to scan for mentions.
	 * @returns {boolean} True if the player is mentioned.
	 */
	private isPlayerMentioned(msg: string): boolean {
		const player = (window as any).Player;
		if (!player || !msg) return false;

		const namesToMatch: string[] = [];

		// Helper to safely escape regex characters so a stray "?" doesn't break the engine
		const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

		// 1. Add standard Name and Nickname
		if (player.Name && player.Name.trim() !== "") {
			namesToMatch.push(escapeRegExp(player.Name.trim()));
		}
		if (player.Nickname && player.Nickname.trim() !== "") {
			namesToMatch.push(escapeRegExp(player.Nickname.trim()));
		}

		// 2. Add custom comma-separated words from settings
		const customWordsSetting = Settings.instance.data.customHighlightWords;
		if (customWordsSetting && customWordsSetting.trim() !== "") {
			// Split by comma, trim whitespace, and filter out empty strings
			const customWords = customWordsSetting.split(',').map(w => w.trim()).filter(w => w !== "");
			for (const word of customWords) {
				namesToMatch.push(escapeRegExp(word));
			}
		}

		// If we somehow have no names at all, abort
		if (namesToMatch.length === 0) return false;

		// Build the regex: Matches word boundaries, is case-insensitive
		const regex = new RegExp(`(?:^|\\W)(${namesToMatch.join('|')})(?:$|\\W)`, 'i');

		return regex.test(msg);
	}

	/**
		 * Intercepts chat messages immediately after the base game parses them 
		 * into HTML elements, allowing for safe DOM injections.
		 */
	private setupMessageHooks(): void {

		this.safeHook("ChatRoomMessageDisplay", 10, (args: any, next: Function) => {
			const data = args[0]; // Raw message data
			const msg = args[1];  // Formatted message string
			const sender = args[2]; // Sender character object

			// Snapshot the scroll state BEFORE the base game modifies the DOM
			const globalWindow = window as any;
			const isAtBottom = typeof globalWindow.ElementIsScrolledToEnd === "function"
				? globalWindow.ElementIsScrolledToEnd("TextAreaChatLog")
				: true;

			// Let the base game compile the HTML safely
			const div = next(args);

			// Validate the returned element and check user settings
			if (!div || !(div instanceof HTMLElement)) return div;
			if (!Settings.instance.data.highlightMentions) return div;

			// Prevent automatic server messages/activities from glowing
			if (data && (data.Type === "ServerMessage" || data.Type === "Activity")) return div;

			// Do not highlight messages that the player sent themselves
			if (sender && sender.MemberNumber === globalWindow.Player.MemberNumber) return div;

			// Check the exact text payload
			if (msg && this.isPlayerMentioned(String(msg))) {
				div.classList.add("CRABS_mention_highlight");

				// Fix for Layout Thrashing: Adding the class changes the element's height. 
				// If they were at the bottom, force the browser to scroll to the NEW bottom.
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
