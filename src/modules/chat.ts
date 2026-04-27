import { CRABS_Base } from "./base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";

/**
 * CRABS Chat Manager Module
 * * Handles all modifications, parsing, and enhancements to the base game's 
 * chat log and message rendering pipeline.
 */
export class ChatManager extends CRABS_Base {

	constructor(CRABS: ModSDKModAPI) {
		super(CRABS);
		this.setupMessageHooks();
	}

	/**
	 * Intercepts chat messages immediately after the base game parses them 
	 * into HTML elements, allowing for safe DOM injections without breaking text formatting.
	 */
	private setupMessageHooks(): void {

		this.safeHook("ChatRoomMessageDisplay", 10, (args: any, next: Function) => {
			const msg = args[1];
			const sender = args[2];

			// Let the base game compile the HTML safely
			const div = next(args);

			// Validate the element
			if (!div || !(div instanceof HTMLElement)) return div;

			// Ignore the player's own messages
			if (sender && sender.MemberNumber === (window as any).Player.MemberNumber) return div;

			// Apply mention highlighting
			if ((window as any).ChatRoomMessageMentionsCharacter((window as any).Player, msg)) {
				div.classList.add("CRABS_mention_highlight");
			}

			return div;
		});

	}
}
