import { CRABS_Base } from "./base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Settings } from "./settings";
import type { Roster } from "./roster";
import "./templates/chat.css";

/**
 * CRABS Chat Manager Module
 * Handles all modifications, parsing, and enhancements to the base game's 
 * chat log and message rendering pipeline. This includes hovering interactions
 * and dynamic message highlighting (background and inline name coloring).
 */
export class ChatManager extends CRABS_Base {
	/** Reference to the Roster instance to sync hover states. */
	private roster: Roster;

	/** Tracks the MemberNumber of the player currently being hovered over in the chat log. */
	public chatLogHoveredPlayer: number | null = null;

	/**
	 * Initializes the Chat Manager, setting up UI event listeners and message rendering hooks.
	 * @param CRABS - The Mod SDK API instance.
	 * @param rosterInstance - The active Roster instance for cross-component state synchronization.
	 */
	constructor(CRABS: ModSDKModAPI, rosterInstance: Roster) {
		super(CRABS);
		this.roster = rosterInstance;

		this.setupMessageHooks();
		this.setupChatLogHover();
	}

	/**
	 * Injects event listeners into the document to track when a user hovers 
	 * over a player's name in the chat log. Synchronizes this state with the 
	 * Roster and Map views.
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

	/**
	 * Intercepts chat messages during the base game's rendering pipeline.
	 * Applies dynamic highlighting based on user preferences, including inline 
	 * coloring of the player's name and full-line background highlighting.
	 */
	private setupMessageHooks(): void {
		this.safeHook("ChatRoomMessageDisplay", 10, (args: any, next: Function) => {
			const data = args[0];
			const sender = args[2];

			// 1. Let the base game generate the final HTML div first
			const div = next(args);

			try {
				if (!div || !(div instanceof HTMLElement)) return div;

				const globalWindow = window as any;
				const player = globalWindow.Player;
				if (!player) return div;

				// Bail out early if both features are disabled to save processing time
				if (Settings.instance?.data?.highlightMentions === false && !Settings.instance?.data?.colorMatchNames) return div;

				// Ignore Server Messages, Activities, and Entry/Leave/Disconnect notifications
				if (data && (data.Type === "ServerMessage")) return div;
				if (div.classList.contains("ChatMessageEnterLeave")) return div;

				// Ignore messages sent by the player themselves
				if (sender && sender.MemberNumber === player.MemberNumber) return div;

				// Build the list of names/words to trigger a highlight
				const wordsToMatch = [
					player.Name,
					player.Nickname,
					...(Settings.instance?.data?.customHighlightWords || "").split(',')
				].map(w => w ? String(w).trim() : "").filter(w => w.length > 0);

				if (wordsToMatch.length === 0) return div;

				// Sort by length (descending) so complex names like "Rose Red" evaluate before "Rose"
				wordsToMatch.sort((a, b) => b.length - a.length);

				// Escape symbols and create a boundary-aware Regex
				// \W handles boundaries like spaces, punctuation, AND apostrophes (e.g., Rose's)
				const escapedWords = wordsToMatch.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
				const mentionRegex = new RegExp(`(^|\\W)(${escapedWords.join('|')})(?=\\W|$)`, 'gi');

				const playerColor = player.LabelColor || "#FF00FF";
				const doInlineColor = !!Settings.instance?.data?.colorMatchNames;
				const doCapitalize = !!Settings.instance?.data?.capitalizeNames;

				let isMentioned = false;

				/**
				 * Safe DOM walker: Recursively traverses an element to find raw text nodes.
				 * Replaces text matching the player's name with styled HTML spans, while 
				 * explicitly avoiding native UI elements to prevent breaking the game interface.
				 * @param node - The DOM node to evaluate.
				 */
				const searchAndHighlight = (node: Node) => {
					// Convert childNodes to a static array to prevent infinite loops when injecting new elements
					const childNodes = Array.from(node.childNodes);
					for (const child of childNodes) {
						if (child.nodeType === 3) { // TEXT_NODE
							const text = child.nodeValue;
							if (text && mentionRegex.test(text)) {
								isMentioned = true;
								if (doInlineColor || doCapitalize) {
									mentionRegex.lastIndex = 0; // Reset regex state before replacement
									const span = document.createElement("span");

									span.innerHTML = text.replace(mentionRegex, (_match: string, p1: string, p2: string) => {
										let nameText = p2;

										if (doCapitalize) {
											nameText = nameText.replace(/\b\w/g, (char) => char.toUpperCase());
										}

										if (doInlineColor) {
											return `${p1}<span style="color: ${playerColor} !important; font-weight: bold !important;">${nameText}</span>`;
										} else {
											// If color is off, just return the (capitalized) text cleanly
											return `${p1}${nameText}`;
										}
									});

									child.parentNode?.replaceChild(span, child);
								}
							}
						} else if (child.nodeType === 1) { // ELEMENT_NODE
							const el = child as HTMLElement;
							// Skip metadata and UI elements (sender names, reply buttons)
							if (el.classList.contains("ChatMessageName") ||
								el.classList.contains("chat-room-metadata") ||
								el.classList.contains("chat-room-message-reply")) {
								continue;
							}
							searchAndHighlight(child);
						}
					}
				};

				// Execute the safe search on the generated message container
				searchAndHighlight(div);

				// Apply background and border highlighting if a mention was detected
				if (isMentioned && Settings.instance?.data?.highlightMentions !== false) {
					div.classList.add("CRABS_mention_highlight");

					const userHex = Settings.instance?.data?.highlightColor || "#FFFF00";

					// !important overrides native base game CSS enforcing default chat colors
					div.style.setProperty("background-color", this.convertColor(userHex, 0.02), "important");
					div.style.setProperty("border-left", `4px solid ${this.convertColor(userHex, 0.8)}`, "important");

					// Ensure the chat log scrolls to the bottom if the player was already at the bottom
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
