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
	 * Safely walks through an HTML element and colors specific words.
	 */
	private colorizeTextNodes(element: HTMLElement, names: string[], color: string) {
		if (!names || names.length === 0) return;

		// Sort names by length descending to match "Rose Red" before "Rose"
		names.sort((a, b) => b.length - a.length);

		const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const escapedWords = names.map(escapeRegExp);

		// \b ensures we match whole words and don't highlight "Rose" inside "Rosemary"
		const regex = new RegExp(`\\b(${escapedWords.join('|')})\\b`, 'gi');

		const walk = (node: Node) => {
			if (node.nodeType === Node.TEXT_NODE) {
				const text = node.nodeValue;
				if (text && regex.test(text)) {
					regex.lastIndex = 0; // Reset regex state just in case

					const span = document.createElement("span");
					span.innerHTML = text.replace(regex, `<span style="color: ${color}; font-weight: bold;">$1</span>`);

					// Safely swap the raw text node with our new HTML span
					node.parentNode?.replaceChild(span, node);
				}
			} else if (node.nodeType === Node.ELEMENT_NODE) {
				const el = node as HTMLElement;

				// CRITICAL: Ignore native UI elements that contain names so we don't break the game
				if (el.classList.contains("ChatMessageName") ||
					el.classList.contains("chat-room-message-reply") ||
					el.classList.contains("chat-room-metadata")) {
					return;
				}

				// Array.from freezes the list of children so our loop doesn't break when we inject new spans
				Array.from(node.childNodes).forEach(child => walk(child));
			}
		};

		walk(element);
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

		const regex = new RegExp(`\\b(${namesToMatch.join('|')})\\b`, 'i');
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

			try {
				if (!div || !(div instanceof HTMLElement)) return div;

				const globalWindow = window as any;

				// Ignore Server Messages, Activities, and Entry/Leave/Disconnect notifications
				if (data && (data.Type === "ServerMessage" || data.Type === "Activity")) return div;
				if (div.classList.contains("ChatMessageEnterLeave")) return div;

				// Ignore messages sent by the player themselves
				if (sender && sender.MemberNumber === globalWindow.Player?.MemberNumber) return div;

				const msgString = String(msg);
				const isMentioned = this.isPlayerMentioned(msgString);

				// --- INLINE NAME COLORING ---
				if (isMentioned && Settings.instance?.data?.colorMatchNames) {
					const playerColor = globalWindow.Player?.LabelColor || "#FFFFFF";
					const words = [
						globalWindow.Player?.Name,
						globalWindow.Player?.Nickname,
						...(Settings.instance?.data?.customHighlightWords || "").split(',')
					].map(w => w?.trim()).filter(Boolean);

					// Call our safe DOM walker
					this.colorizeTextNodes(div, words, playerColor);
				}

				// --- BACKGROUND HIGHLIGHTING ---
				if (isMentioned && Settings.instance?.data?.highlightMentions !== false) {
					div.classList.add("CRABS_mention_highlight");

					const userHex = Settings.instance?.data?.highlightColor || "#FFFF00";

					// Kept your background low opacity design, but added !important to ensure it applies
					div.style.setProperty("background-color", this.convertColor(userHex, 0.01), "important");
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
			} catch (err) {
				console.error("[CRABS] Error in chat highlight hook", err);
			}

			return div;
		});
	}

	/**
	 * Hooks into the base game's chat log to pass hover states to the roster.
	 */
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
}
