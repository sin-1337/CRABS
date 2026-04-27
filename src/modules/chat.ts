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
			    background-color: rgba(255, 215, 0, 0.05) !important;
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
	 * Custom, bulletproof mention detector that handles both Name and Nickname,
	 * ignores case, and strictly matches word boundaries.
	 * @param {string} msg - The text to scan for mentions.
	 * @returns {boolean} True if the player is mentioned.
	 */
	private isPlayerMentioned(msg: string): boolean {
		const player = (window as any).Player;
		if (!player || !msg) return false;

		const name = player.Name;
		const nickname = player.Nickname;

		const namesToMatch: string[] = [];

		// Helper to safely escape regex characters in names (like if someone's name has a * or ? in it)
		const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

		// Add Name and Nickname to our search array if they exist
		if (name && name.trim() !== "") {
			namesToMatch.push(escapeRegExp(name.trim()));
		}
		if (nickname && nickname.trim() !== "") {
			namesToMatch.push(escapeRegExp(nickname.trim()));
		}

		// If we somehow have no names at all, abort
		if (namesToMatch.length === 0) return false;

		// Build the regex: Matches the beginning of the string or a non-word character,
		// then the name/nickname, then the end of the string or a non-word character.
		// The 'i' flag makes it case-insensitive.
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

			// 1. Snapshot the scroll state BEFORE the base game modifies the DOM
			const globalWindow = window as any;
			const isAtBottom = typeof globalWindow.ElementIsScrolledToEnd === "function"
				? globalWindow.ElementIsScrolledToEnd("TextAreaChatLog")
				: true;

			// 2. Let the base game compile the HTML safely
			const div = next(args);

			// 3. Validate the returned element and check user settings
			if (!div || !(div instanceof HTMLElement)) return div;
			if (!Settings.instance.data.highlightMentions) return div;

			// 4. Prevent automatic server messages/activities from glowing
			if (data && (data.Type === "ServerMessage" || data.Type === "Activity")) return div;

			// 5. Check the exact text payload
			if (msg && this.isPlayerMentioned(String(msg))) {
				div.classList.add("CRABS_mention_highlight");

				// 6. Fix for Layout Thrashing: Adding the class changes the element's height. 
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
