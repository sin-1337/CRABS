import { CRABS_Base } from "./base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Settings } from "./settings";
import type { Roster } from "./roster";
import "./templates/chat.css";

/**
 * CRABS Chat Manager Module
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

	private setupChatLogHover(): void {
		document.addEventListener("mouseover", (e) => {
			if (Settings.instance?.data?.chatLogHover === false) return;

			const target = e.target as HTMLElement;
			const nameEl = target.closest(".ChatMessageName");

			if (nameEl) {
				const messageEl = nameEl.closest(".ChatMessage") as HTMLElement;
				if (messageEl && messageEl.dataset.sender) {
					const memberNumber = parseInt(messageEl.dataset.sender, 10);
					if (!isNaN(memberNumber) && this.chatLogHoveredPlayer !== memberNumber) {
						this.chatLogHoveredPlayer = memberNumber;

						if (this.roster) {
							this.roster.chatLogHoveredPlayer = memberNumber;
							this.roster.hoveredMapPlayer = memberNumber;
						}
					}
				}
			}
		});

		document.addEventListener("mouseout", (e) => {
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

	private setupMessageHooks(): void {
		this.safeHook("ChatRoomMessageDisplay", 10, (args: any, next: Function) => {
			const data = args[0];
			const sender = args[2];
			const div = next(args);

			try {
				if (!div || !(div instanceof HTMLElement)) return div;

				const globalWindow = window as any;
				const player = globalWindow.Player;
				if (!player) return div;

				if (Settings.instance?.data?.highlightMentions === false && !Settings.instance?.data?.colorMatchNames) return div;

				// Ignore Server Messages and Entry/Leave/Disconnect notifications
				if (data && data.Type === "ServerMessage") return div;
				if (div.classList.contains("ChatMessageEnterLeave")) return div;

				// Ignore messages sent by the player themselves
				if (sender && sender.MemberNumber === player.MemberNumber) return div;

				// Extract the FINAL translated text exactly as the player sees it
				const contentSpan = div.querySelector('.chat-room-message-content') as HTMLElement;
				if (!contentSpan) return div;

				const originalText = contentSpan.innerHTML;

				// Build the list of names
				const wordsToMatch = [
					player.Name,
					player.Nickname,
					...(Settings.instance?.data?.customHighlightWords || "").split(',')
				].map(w => w ? String(w).trim() : "").filter(w => w.length > 0);

				if (wordsToMatch.length === 0) return div;

				wordsToMatch.sort((a, b) => b.length - a.length);
				const escapedWords = wordsToMatch.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

				// \b handles boundaries like spaces, punctuation, AND the apostrophe in Rose's!
				const mentionRegex = new RegExp(`\\b(${escapedWords.join('|')})\\b`, 'gi');

				const playerColor = player.LabelColor || "#FF00FF";

				// Do the replacement FIRST to avoid any regex state bugs
				const newText = originalText.replace(mentionRegex, `<span style="color: ${playerColor}; font-weight: bold;">$1</span>`);

				// If the text changed, your name was mentioned!
				const isMentioned = originalText !== newText;

				if (isMentioned) {
					// --- INLINE NAME COLORING ---
					if (Settings.instance?.data?.colorMatchNames) {
						contentSpan.innerHTML = newText;
					}

					// --- BACKGROUND HIGHLIGHTING ---
					if (Settings.instance?.data?.highlightMentions !== false) {
						div.classList.add("CRABS_mention_highlight");

						const userHex = Settings.instance?.data?.highlightColor || "#FFFF00";
						div.style.setProperty("background-color", this.convertColor(userHex, 0.15), "important");
						div.style.setProperty("border-left", `4px solid ${this.convertColor(userHex, 0.8)}`, "important");

						const isAtBottom = typeof globalWindow.ElementIsScrolledToEnd === "function"
							? globalWindow.ElementIsScrolledToEnd("TextAreaChatLog")
							: true;

						if (isAtBottom && typeof globalWindow.ElementScrollToEnd === "function") {
							setTimeout(() => {
								globalWindow.ElementScrollToEnd("TextAreaChatLog");
							}, 0);
						}
					}
				}
			} catch (err) {
				console.error("[CRABS] Error in chat highlight hook", err);
			}

			return div;
		});
	}
}
