/**
 * CRABS Whisper+ Module
 *
 * This module implements the enhanced whisper functionality for the CRABS mod.
 * It extends the base whisper command with additional features including:
 * - Range-based whisper handling
 * - Enhanced message formatting
 * - Self-whisper support with visual indicators
 * - Bracket replacement for better visual distinction
 * - Integration with the CRABS asset system for icons
 *
 * The module provides both command-line and roster-based interfaces for sending
 * whispers to other players in the chat room.
 */

import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { CRABS_Base } from "./base";
import { Assets } from "./assets";
import { CrossMod } from "./crossmod";
import { Notification } from "./notifications";
import { Settings } from "./settings";

import { Drawer } from "./drawer";

/**
 * Class representing the Whisper+ enhanced messaging system.
 */
export class WhisperPlus extends CRABS_Base {

	/**
	 * Creates an instance of the WhisperPlus module.
	 * 
	 * @param {ModSDKModAPI} CRABS - The ModSDK API instance.
	 */
	constructor(CRABS: ModSDKModAPI) {
		super(CRABS);
	}

	/**
	 * Initializes the hooks for constant WhisperPlus conversation flow.
	 * 
	 * @returns {void}
	 */
	public setupHooks(): void {
		/**
		 * Hook: ChatRoomMessageNameClick
		 * Intercepts clicks on a character's name or the quick-reply arrow in the chat log.
		 */
		this.CRABS.hookFunction("ChatRoomMessageNameClick" as any, 10, function (this: HTMLElement, functionArguments: any[], next: (functionArguments: any[]) => void) {
			// Get ALL message contents in this bubble and check the LAST one (the actual message, not the quote)
			const contents = this.parentElement?.querySelectorAll('.chat-room-message-content');
			const contentNode = contents ? contents[contents.length - 1] : null;
			const isWhisperPlus = contentNode?.textContent?.includes("+:");

			next(functionArguments); // Let the base game populate "/whisper 1234 "

			if (isWhisperPlus) {
				const chatInput = document.getElementById("InputChat") as HTMLTextAreaElement;
				if (chatInput && chatInput.value.startsWith("/whisper ")) {
					chatInput.value = chatInput.value.replace(/^\/whisper /, "/whisper+ ");
					chatInput.dispatchEvent(new Event("input", { bubbles: true })); // Force BC to recognize the change
				}
			}
		});

		/**
		 * Hook: ChatRoomMessageSetReply
		 * Intercepts the action of selecting "Reply" from a message's three-dot context menu.
		 */
		this.CRABS.hookFunction("ChatRoomMessageSetReply" as any, 10, (functionArguments: any[], next: (functionArguments: any[]) => void) => {
			const messageId = functionArguments[0];
			// The messageId directly targets the exact span containing the text
			const contentNode = document.querySelector(`[msgid="${messageId}"]`);
			const isWhisperPlus = contentNode?.textContent?.includes("+:");

			next(functionArguments); // Let the base game populate "/whisper 1234 "

			if (isWhisperPlus) {
				const chatInput = document.getElementById("InputChat") as HTMLTextAreaElement;
				if (chatInput && chatInput.value.startsWith("/whisper ")) {
					chatInput.value = chatInput.value.replace(/^\/whisper /, "/whisper+ ");
					chatInput.dispatchEvent(new Event("input", { bubbles: true })); // Force BC to recognize the change
				}
			}
		});

		/**
		 * Hook: ChatRoomMessageDisplay
		 * Intercepts the final rendering of chat messages. If a Whisper+ message is detected,
		 * we safely update the "Whisper" text node to "Whisper+" and hide the prefix.
		 */
		this.CRABS.hookFunction("ChatRoomMessageDisplay" as any, 10, (functionArguments: any[], next: (functionArguments: any[]) => HTMLDivElement) => {
			const data = functionArguments[0];
			const message = functionArguments[1] as string;

			// Let the base game generate and append the HTML element
			const div = next(functionArguments);

			if (div && data?.Type === "Whisper" && message?.includes("+:")) {
				// 1. Hide the "+:" (and the space after it) in the message body
				const contents = div.querySelectorAll('.chat-room-message-content');
				const contentNode = contents[contents.length - 1];

				if (contentNode && contentNode.innerHTML) {
					// Regex \+:\s? catches "+:" and an optional trailing space
					contentNode.innerHTML = contentNode.innerHTML.replace(/\+:\s?/, '<span style="display:none;">$&</span>');
				}

				// 2. Safely change the "Whisper to/from" text without breaking event listeners
				div.childNodes.forEach(node => {
					if (node.nodeType === Node.TEXT_NODE && node.textContent) {
						if (node.textContent.includes("Whisper")) {
							node.textContent = node.textContent.replace("Whisper", "Whisper+");
						}
					}
				});
			}

			return div;
		});

		// Global delegated listener for Whisper+ clicks
		document.addEventListener("click", (event) => {
			const target = event.target as HTMLElement;
			const nameElement = target.closest(".CRABS_player-name") as HTMLElement;

			if (nameElement) {
				const memberNumStr = nameElement.getAttribute("data-player-number");
				if (memberNumStr) {
					// Kill the event here so the Roster card doesn't jump!
					event.stopPropagation();
					event.preventDefault();

					const memberNumber = parseInt(memberNumStr, 10);
					if (!isNaN(memberNumber)) {
						this.sendWhisper(memberNumber);
					}
				}
			}
		}, { capture: true });
	}

	/**
	 * Registers message handlers to stylize Whisper+ messages in the chat log.
	 * 
	 * @returns {void}
	 */
	public setupMessageHandlers(): void {
		ChatRoomRegisterMessageHandler({
			Description: "Stylize Whisper+ messages",
			Priority: 450, // Runs late in the pipeline, just before display
			Callback: (data: any, _sender: any, message: string, _metadata: any) => {
				if (data.Type === "Whisper" && message.includes("+:")) {
					// Replaces the raw "+:" with a stylized tag and hides the original
					const stylizedTag = '<span style="color: #ff99bb; font-weight: bold; text-shadow: 1px 1px 2px #000;">[W+]<span style="display:none;">+:</span></span>';
					return { msg: message.replace("+:", stylizedTag) };
				}
				return false;
			}
		});
	}

	/**
	 * Parses the command arguments to extract member number and message.
	 *
	 * @param {string} commandArguments - The arguments string passed to the command.
	 * @param {string} command - The full command string.
	 * @returns {{ memberNumber: number, message: string }} Parsed member number and message.
	 */
	private parseArguments(commandArguments: string, command: string): { memberNumber: number, message: string } {
		let memberNumber: number = NaN;
		let message: string = "";

		// The raw command string retains the pristine case and spacing.
		if (command) {
			const commandParts = command.trim().split(/\s+/);
			if (commandParts.length >= 2) {
				memberNumber = parseInt(commandParts[1]);

				if (!isNaN(memberNumber)) {
					// Extract exactly what comes after the member number to preserve casing
					const prefix = `${commandParts[0]} ${commandParts[1]} `;
					const prefixIndex = command.indexOf(prefix);

					if (prefixIndex !== -1) {
						message = command.substring(prefixIndex + prefix.length);
						return { memberNumber, message };
					}
				}
			}
		}

		// Fallback to original logic if the raw command string is missing or malformed
		const firstSpaceIndex = commandArguments.indexOf(" ");
		if (firstSpaceIndex !== -1) {
			memberNumber = parseInt(commandArguments.slice(0, firstSpaceIndex));
			message = commandArguments.slice(firstSpaceIndex + 1);
		} else {
			memberNumber = parseInt(commandArguments);
		}

		return { memberNumber, message };
	}

	/**
	 * Validates that the target member exists.
	 *
	 * @param {any} target - The target (either member number or character object).
	 * @returns {any | null} Validated target character or null if invalid.
	 */
	private validateTarget(target: any): any {
		if (typeof target === 'object' && target !== null) {
			return target;
		}

		const memberNumber = parseInt(target);
		if (isNaN(memberNumber)) {
			return null;
		}

		return ChatRoomCharacter.find(character => character.MemberNumber === memberNumber);
	}

	/**
	 * Sends a whisper message to a target character.
	 *
	 * @param {any} target - The target character or member number.
	 * @param {string} message - The message to send.
	 * @returns {boolean} Whether the message was sent successfully.
	 */
	private sendWhisperMessage(target: any, message: string): boolean {
		if (!message) {
			return false;
		}

		const targetMember = this.validateTarget(target);
		if (!targetMember) {
			ChatRoomSendLocal(`${TextGet("CommandNoWhisperTarget")} ${target}.`, 30_000);
			return false;
		}

		// Auto-stow drawer if enabled
		if (Settings.instance.data.closeDrawerOnWhisper) {
			Drawer.close();
		}

		// Handle self whispers with gray text and memo emoji
		if (targetMember.MemberNumber === Player.MemberNumber) {
			const SELFMESSAGE = `<span style="color:#989898">${Assets.printimage({ key: "thought" })} Note to </span><span style="color:${Player.LabelColor}">self</span><span style="color:#989898">: ${message}</span>`;
			ChatRoomSendLocal(SELFMESSAGE);
			return false;
		}

		// Replace normal brackets with fake ones in the message
		let formattedMsg = message.replace(/\(/g, "❪").replace(/\)/g, "❫");

		// Check if target and player are the same
		if (target.MemberNumber === Player.MemberNumber) {
			addChatMessage(formattedMsg);
			return true;
		} else {
			// Prepare the message with the +: prefix FIRST
			formattedMsg = `+: ${formattedMsg}`;

			// Add parentheses if needed for range checking AFTER prefixing
			// We check formattedMsg[0] to ensure we don't double-wrap if the player typed "(/whisper+)"
			if (ChatRoomMapViewIsActive() && !ChatRoomMapViewCharacterOnWhisperRange(target) && formattedMsg[0] !== "(") {
				// Check if the message contains a URL/link
				const hasUrl = /https?:\/\/[^\s]+/.test(formattedMsg);
				// If it has a URL, append a trailing space before the closing parenthesis to safeguard the link
				formattedMsg = `(${formattedMsg}${hasUrl ? " " : ""})`;
			}

			// Build data payload
			const data = ChatRoomGenerateChatRoomChatMessage("Whisper", formattedMsg);
			if (!data) {
				// Message was sent successfully
				return false;
			}

			// Set the whisper target
			data.Target = targetMember.MemberNumber;

			// Send the whisper to the server
			const serverData = { ...data, Type: "Whisper" };
			ServerSend("ChatRoomChat", serverData);

			// Tell it who we are
			data.Sender = Player.MemberNumber;

			// Send the chat to our window too
			ChatRoomMessage(data);

			// Message was sent successfully
			return true;
		}
	}

	/**
	 * Sets up the /whisper+ command for a given member number.
	 *
	 * @param {number} memberNumber - Member number of the target.
	 * @returns {void}
	 */
	public sendWhisper(memberNumber: number): void {
		for (const command of Commands) {
			if (command.Tag == "whisper+") {
				window.CommandSet(command.Tag + " " + memberNumber)
			}
		}
	}

	/**
	 * Returns the player's gag level from 0 to 4.
	 * 
	 * @returns {number} The current gag level.
	 */
	private getGagLevel(): number {
		if (Player.HasEffect("GagTotal") || Player.HasEffect("GagTotal2") || Player.HasEffect("GagTotal3") || Player.HasEffect("GagTotal4")) return 4;
		if (Player.HasEffect("GagHeavy") || Player.HasEffect("GagVeryHeavy")) return 3;
		if (Player.HasEffect("GagNormal") || Player.HasEffect("GagMedium")) return 2;
		if (Player.HasEffect("GagLight") || Player.HasEffect("GagVeryLight") || Player.HasEffect("GagEasy")) return 1;
		return 0;
	}

	/**
	 * Processes the Whisper+ command.
	 *
	 * @param {string} commandArguments - Arguments passed from player (message).
	 * @param {string} command - Arguments passed as command (BC quirk).
	 * @returns {number} 0 indicates success, 1 is an error.
	 */
	public whisperplus(commandArguments: string, command: string): number {
		// Immersive Gag Check
		if (Settings.instance.data.immersiveGag && this.getGagLevel() > 0) {
			if (typeof ToastManager !== "undefined") {
				Notification.send({ message: "You cannot use Whisper+ while gagged.", title: "Whisper+ Blocked" });
			} else {
				ChatRoomSendLocal("You cannot use Whisper+ while gagged.", 10_000);
			}
			return 1;
		}

		// BCX Rule Check: speech_restrict_whisper_send
		if (Settings.instance.data.respectBcxRules) {
			const ruleState = CrossMod.getBCXRuleState("speech_restrict_whisper_send");
			if (ruleState?.isEnforced) {
				const { memberNumber } = this.parseArguments(commandArguments, command);
				ruleState.triggerAttempt(memberNumber);
				// BCX handles its own notifications/logs when triggerAttempt is called.
				return 1; // Blocked by BCX rule
			}
		}

		// Parse arguments
		const { memberNumber, message } = this.parseArguments(commandArguments, command);

		// Validate member number
		if (isNaN(memberNumber)) {
			ChatRoomSendLocal("Member number is invalid.", 30_000);
			return 1;
		}

		// Validate message
		if (!message) {
			ChatRoomSendLocal("Message was blank", 30_000);
			return 1;
		}

		// Find player based on member number
		const target = ChatRoomCharacter.find(
			(character: any) => character.MemberNumber == memberNumber
		);

		// Auto-Beep Fallback: If player isn't in the room
		if (!target) {
			let beepFailed = false;

			if (Settings.instance.data.autoBeepOnLeave) {
				const playerWindow = (window as any).Player;

				// Use a loose equality check (==) to prevent String vs Number strict mismatch failures
				const isFriend = playerWindow.FriendList?.some((id: any) => id == memberNumber);
				const isBestFriend = CrossMod.detectMod("BCTweaks") && playerWindow.BCT?.bctSettings?.bestFriendsList?.some((id: any) => id == memberNumber);

				// If they are in either list, send the beep!
				if (isFriend || isBestFriend) {
					ServerSend("AccountBeep", { MemberNumber: memberNumber, BeepType: "", Message: message });

					// Try to pull their cached name from the FriendList map, fallback to "Member" if not found
					const targetName = playerWindow.FriendNames?.get?.(memberNumber) || "Member";

					if (typeof ToastManager !== "undefined") {
						Notification.send({ message: `Whisper+ sent as beep.`, title: "Whisper+" });
					}
					ChatRoomSendLocal(`Beep to ${targetName} (${memberNumber}): ${message}`);

					return 0; // Success
				} else {
					beepFailed = true; // They had the setting on, but the target wasn't a friend
				}
			}

			// If fallback fails or is disabled, show detailed error
			let errorMsg = "Player left or became unavailable";
			if (beepFailed) {
				errorMsg += " (Auto-beep failed: Target is not on your friend list.)";
			}

			if (typeof ToastManager !== "undefined") {
				Notification.send({ message: errorMsg, title: "Whisper+ Failed" });
			}
			ChatRoomSendLocal(errorMsg, 50_000);

			return 1; // Error
		}

		// Send the whisper message
		const success = this.sendWhisperMessage(target || memberNumber, message);
		return success ? 0 : 1;
	}

	/**
	 * Builds the user interface for Whisper+ and attaches necessary events.
	 * 
	 * @param {string} [output] - The HTML string to be displayed.
	 * @param {string} [elementId] - Optional ID for the element.
	 * @param {HTMLElement} [root] - Optional root element for event attachment.
	 * @returns {void}
	 */
	// public override buildui(output?: string, elementId?: string, root?: HTMLElement): void {
	// 	this.attachEvent("CRABS_player-name", this.sendWhisper, "playerNumber", undefined, "click", "class", root);
	// }
}
