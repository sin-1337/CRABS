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
		document.addEventListener("mouseover", (mouseEvent) => {
			if (Settings.instance?.data?.chatLogHover === false) return;
			const target = mouseEvent.target as HTMLElement;
			const nameElement = target.closest(".ChatMessageName");

			if (nameElement) {
				const messageElement = nameElement.closest(".ChatMessage") as HTMLElement;
				if (messageElement) {
					// Determine the correct ID to highlight
					const senderID = parseInt(messageElement.dataset.sender || "", 10);
					const targetID = parseInt(messageElement.dataset.target || "", 10);
					const isWhisper = messageElement.classList.contains("ChatMessageWhisper");

					const player = (window as any).Player;
					let memberNumber = senderID;

					// Logic Fix: If it's a whisper and WE sent it, highlight the target instead
					if (isWhisper && senderID === player.MemberNumber && !isNaN(targetID)) {
						memberNumber = targetID;
					}

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

		document.addEventListener("mouseout", (mouseEvent) => {
			if (Settings.instance?.data?.chatLogHover === false) return;
			const target = mouseEvent.target as HTMLElement;

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
		this.safeHook("ChatRoomMessageDisplay", 10, (hookArguments: any, nextFunction: Function) => {
			const messageData = hookArguments[0];
			const senderData = hookArguments[2];
			const messageDiv = nextFunction(hookArguments);

			const globalWindow = window as any;
			let wasAtBottom = true;

			try {
				if (!messageDiv || !(messageDiv instanceof HTMLElement)) return messageDiv;

				const globalWindow = window as any;
				const player = globalWindow.Player;
				if (!player) return messageDiv;

				// Check scroll state right after the base game appended the message
				wasAtBottom = typeof globalWindow.ElementIsScrolledToEnd === "function"
					? globalWindow.ElementIsScrolledToEnd("TextAreaChatLog")
					: true;

				if (Settings.instance?.data?.highlightMentions === false && !Settings.instance?.data?.colorMatchNames) return messageDiv;

				if (messageData && (messageData.Type === "ServerMessage")) return messageDiv;
				if (messageDiv.classList.contains("ChatMessageEnterLeave")) return messageDiv;
				if (senderData && senderData.MemberNumber === player.MemberNumber) return messageDiv;

				// --- COMPILE IGNORE PHRASES ---
				const rawIgnorePhrases = (Settings.instance?.data?.ignorePhrases || "")
					.split('\n')
					.map((rawString: string) => rawString ? String(rawString).trim() : "")
					.filter((trimmedString: string) => trimmedString.length > 0);

				let ignoreRegex: RegExp | null = null;
				if (rawIgnorePhrases.length > 0) {
					// Sort by length descending to prevent overlapping wildcard bugs
					rawIgnorePhrases.sort((firstPhrase: string, secondPhrase: string) => secondPhrase.length - firstPhrase.length);

					const escapeRegExp = (textToEscape: string) => textToEscape.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
					const ignorePatterns = rawIgnorePhrases.map((validPhrase: string) => escapeRegExp(validPhrase).replace(/\\\*/g, '.*?'));

					// Capturing group ( ) is CRITICAL here so .split() preserves the phrase
					ignoreRegex = new RegExp(`(${ignorePatterns.join('|')})`, 'gi');
				}

				// --- COMPILE MENTION REGEX ---
				const wordsToMatch = [
					player.Name,
					player.Nickname,
					...(Settings.instance?.data?.customHighlightWords || "").split(',')
				].map((rawInput: any) => rawInput ? String(rawInput).trim() : "")
					.filter((validInput: string) => validInput.length > 0);

				if (wordsToMatch.length === 0) return messageDiv;

				wordsToMatch.sort((firstName: string, secondName: string) => secondName.length - firstName.length);
				const escapedWords = wordsToMatch.map((nameToEscape: string) => nameToEscape.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
				const mentionRegex = new RegExp(`(^|\\W)(${escapedWords.join('|')})(?=\\W|$)`, 'gi');

				const playerColor = player.LabelColor || "#FF00FF";
				const doInlineColor = !!Settings.instance?.data?.colorMatchNames;
				const doCapitalize = !!Settings.instance?.data?.capitalizeNames;
				let isMentioned = false;

				const processTextChunk = (textChunk: string): string => {
					mentionRegex.lastIndex = 0;
					if (mentionRegex.test(textChunk)) isMentioned = true;
					if (!doInlineColor && !doCapitalize) return textChunk;

					mentionRegex.lastIndex = 0;
					return textChunk.replace(mentionRegex, (_match: string, precedingBoundary: string, matchedName: string) => {
						let formattedName = matchedName;

						if (doCapitalize) {
							formattedName = formattedName.replace(/\b\w/g, (firstLetter: string) => firstLetter.toUpperCase());
						}

						if (doInlineColor) {
							return `${precedingBoundary}<span style="color: ${playerColor} !important; font-weight: bold !important;">${formattedName}</span>`;
						}

						return `${precedingBoundary}${formattedName}`;
					});
				};

				const searchAndHighlight = (domNode: Node) => {
					const childNodesArray = Array.from(domNode.childNodes);
					for (const childNode of childNodesArray) {

						if (childNode.nodeType === 3) { // TEXT_NODE
							const rawTextValue = childNode.nodeValue;
							if (!rawTextValue) continue;

							let newlyGeneratedHTML = "";
							let hasModifications = false;

							if (ignoreRegex) {
								ignoreRegex.lastIndex = 0;
								const textPartsArray = rawTextValue.split(ignoreRegex);

								for (let partIndex = 0; partIndex < textPartsArray.length; partIndex++) {
									if (partIndex % 2 === 0) { // Standard text
										const processedText = processTextChunk(textPartsArray[partIndex]);
										if (processedText !== textPartsArray[partIndex]) hasModifications = true;
										newlyGeneratedHTML += processedText;
									} else { // Ignored phrase (leave completely untouched)
										newlyGeneratedHTML += textPartsArray[partIndex];
									}
								}
							} else {
								const processedText = processTextChunk(rawTextValue);
								if (processedText !== rawTextValue) hasModifications = true;
								newlyGeneratedHTML += processedText;
							}

							if (hasModifications) {
								const replacementSpan = document.createElement("span");
								replacementSpan.innerHTML = newlyGeneratedHTML;
								childNode.parentNode?.replaceChild(replacementSpan, childNode);
							}

						} else if (childNode.nodeType === 1) { // ELEMENT_NODE
							const htmlElement = childNode as HTMLElement;

							if (htmlElement.classList.contains("ChatMessageName") ||
								htmlElement.classList.contains("chat-room-metadata") ||
								htmlElement.classList.contains("chat-room-message-reply")) {
								continue;
							}
							searchAndHighlight(childNode);
						}
					}
				};

				searchAndHighlight(messageDiv);

				if (isMentioned) {

					// Browser Notification
					if (Settings.instance?.data?.browserNotifications && document.hidden) {
						if ("Notification" in window && Notification.permission === "granted") {
							const senderIdentity = senderData?.nickname && senderData?.playerNumber
								? `${senderData.nickname}(${senderData.playerNumber})`
								: (senderData?.Name || "Someone");

							new Notification("Mentioned!", {
								body: `${senderIdentity} mentioned you!`
							});
						}
					}

					// Highlight Logic
					if (Settings.instance?.data?.highlightMentions !== false) {
						messageDiv.classList.add("CRABS_mention_highlight");
						const userHexColor = Settings.instance?.data?.highlightColor || "#FFFF00";

						messageDiv.style.setProperty("background-color", this.convertColor(userHexColor, 0.02), "important");
						messageDiv.style.setProperty("border-left", `4px solid ${this.convertColor(userHexColor, 0.8)}`, "important");

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
			} finally {
				// Apply the scroll fix if we were at the bottom
				if (wasAtBottom && typeof globalWindow.ElementScrollToEnd === "function") {
					setTimeout(() => {
						globalWindow.ElementScrollToEnd("TextAreaChatLog");
					}, 0);
				}
			}

			return messageDiv;
		});
	}
}
