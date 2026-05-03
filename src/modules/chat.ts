import { CRABS_Base } from "./base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Settings } from "./settings";
import type { Roster } from "./roster";
import "./templates/chat.css";

/**
 * CRABS Chat Manager Module
 * Handles all modifications, parsing, and enhancements to the base game's 
 * chat log and message rendering pipeline.
 */
export class ChatManager extends CRABS_Base {
	private roster: Roster;
	public chatLogHoveredPlayer: number | null = null;

	constructor(CRABS: ModSDKModAPI, rosterInstance: Roster) {
		super(CRABS);
		this.roster = rosterInstance;

		this.setupMessageHooks();
		this.setupChatLogHover();
	}

	/**
	 * Hooks into the base game's chat log to pass hover states to the roster.
	 */
	private setupChatLogHover(): void {
		document.addEventListener("mouseover", (e) => {
			// bail out if user turned this off
			if (Settings.instance?.data?.chatLogHover === false) return;

			const target = e.target as HTMLElement;
			const nameEl = target.closest(".ChatMessageName");

			if (nameEl) {
				const messageEl = nameEl.closest(".ChatMessage") as HTMLElement;
				if (messageEl && messageEl.dataset.sender) {
					const memberNumber = parseInt(messageEl.dataset.sender, 10);
					if (!isNaN(memberNumber) && this.chatLogHoveredPlayer !== memberNumber) {
						this.chatLogHoveredPlayer = memberNumber;

						// Pass the state to the roster instead of forcing the DOM
						if (this.roster) {
							this.roster.chatLogHoveredPlayer = memberNumber;
							this.roster.hoveredMapPlayer = memberNumber;
						}
					}
				}
			}
		});

		document.addEventListener("mouseout", (e) => {

			//bail out if user turned this off
			if (Settings.instance?.data?.chatLogHover === false) return;

			const target = e.target as HTMLElement;
			if (target.closest(".ChatMessageName")) {
				this.chatLogHoveredPlayer = null;

				if (this.roster) {
					this.roster.chatLogHoveredPlayer = null;
					this.roster.hoveredMapPlayer = null;
				}
			}
		});
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

		const customWordsSetting = Settings.instance?.data?.customHighlightWords;
		if (customWordsSetting && customWordsSetting.trim() !== "") {
			const customWords = String(customWordsSetting)
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

			const div = next(args);

			// Wrap in try/catch so safeHook doesn't double-print on failure
			try {
				if (!div || !(div instanceof HTMLElement)) return div;

				// Bail out early if both features are disabled
				if (Settings.instance?.data?.highlightMentions === false && !Settings.instance?.data?.colorMatchNames) return div;

				const globalWindow = window as any;

				// Ignore Server Messages, Activities, and Entry/Leave/Disconnect notifications
				if (data && (data.Type === "ServerMessage" || data.Type === "Activity")) return div;
				if (div.classList.contains("ChatMessageEnterLeave")) return div;

				// Ignore messages sent by the player themselves
				if (sender && sender.MemberNumber === globalWindow.Player?.MemberNumber) return div;

				const msgString = String(msg);
				const isMentioned = this.isPlayerMentioned(msgString);

				// Inline Name Coloring
				// Target the message content so we don't break the native UI elements
				const contentSpan = div.querySelector('.chat-room-message-content');

				if (contentSpan && Settings.instance?.data?.colorMatchNames && isMentioned) {
					const playerColor = globalWindow.Player?.LabelColor || "#FFFFFF";

					const words = [
						globalWindow.Player?.Name,
						globalWindow.Player?.Nickname,
						...(Settings.instance?.data?.customHighlightWords || "").split(',')
					].map(w => w?.trim()).filter(Boolean);

					if (words.length > 0) {
						const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
						const escapedWords = words.map(escapeRegExp);

						const regex = new RegExp(`\\b(${escapedWords.join('|')})\\b`, 'gi');
						contentSpan.innerHTML = contentSpan.innerHTML.replace(regex, `<span style="color: ${playerColor}; font-weight: bold;">$1</span>`);
					}
				}
				// Background Highlight 
				if (isMentioned && Settings.instance?.data?.highlightMentions !== false) {
					div.classList.add("CRABS_mention_highlight");

					const userHex = Settings.instance?.data?.highlightColor || "#FFFF00";

					// Force the border to show up on Action messages using important
					div.style.setProperty("border-left", `4px solid ${this.convertColor(userHex, 0.8)}`, "important");

					// Kept your low opacity design
					div.style.backgroundColor = this.convertColor(userHex, 0.01);

					const isAtBottom = typeof globalWindow.ElementIsScrolledToEnd === "function"
						? globalWindow.ElementIsScrolledToEnd("TextAreaChatLog")
						: true;

					if (isAtBottom && typeof globalWindow.ElementScrollToEnd === "function") {
						setTimeout(() => {
							globalWindow.ElementScrollToEnd("TextAreaChatLog");
						}, 0);
					}
				}
			} catch (err) {
				console.error("[CRABS] Error in chat highlight hook", err);
			}

			return div;
		});
	}
}
