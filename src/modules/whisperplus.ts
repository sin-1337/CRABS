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

export class WhisperPlus extends CRABS_Base {
	private drawerModule: any = null;

	constructor(CRABS: ModSDKModAPI) {
		super(CRABS);
	}

	public setDrawer(drawer: any): void {
		this.drawerModule = drawer;
	}

	/**
	 * Initializes the hooks for constant WhisperPlus conversation flow
	 */
	public setupHooks(): void {
		/**
		 * Hook: ChatRoomMessageNameClick
		 * Intercepts clicks on a character's name or the quick-reply arrow in the chat log.
		 * @param {HTMLElement} this
		 * @param {any[]} args
		 * @param {Function} next
		 */
		this.CRABS.hookFunction("ChatRoomMessageNameClick" as any, 10, function (this: HTMLElement, args: any[], next: (args: any[]) => void) {
			// Get ALL message contents in this bubble and check the LAST one (the actual message, not the quote)
			const contents = this.parentElement?.querySelectorAll('.chat-room-message-content');
			const contentNode = contents ? contents[contents.length - 1] : null;
			const isWhisperPlus = contentNode?.textContent?.includes("+:");

			next(args); // Let the base game populate "/whisper 1234 "

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
		 * @param {any[]} args
		 * @param {Function} next
		 */
		this.CRABS.hookFunction("ChatRoomMessageSetReply" as any, 10, (args: any[], next: (args: any[]) => void) => {
			const msgId = args[0];
			// The msgId directly targets the exact span containing the text
			const contentNode = document.querySelector(`[msgid="${msgId}"]`);
			const isWhisperPlus = contentNode?.textContent?.includes("+:");

			next(args); // Let the base game populate "/whisper 1234 "

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
				 * @param {any[]} args 
				 * @param {Function} next 
				 */
		this.CRABS.hookFunction("ChatRoomMessageDisplay" as any, 10, (args: any[], next: (args: any[]) => HTMLDivElement) => {
			const data = args[0];
			const msg = args[1] as string;

			// Let the base game generate and append the HTML element
			const div = next(args);

			if (div && data?.Type === "Whisper" && msg?.includes("+:")) {
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
	}

	/**
	 * Registers message handlers to stylize Whisper+ messages in the chat log.
	 */
	public setupMessageHandlers(): void {
		ChatRoomRegisterMessageHandler({
			Description: "Stylize Whisper+ messages",
			Priority: 450, // Runs late in the pipeline, just before display
			Callback: (data: any, _sender: any, msg: string, _metadata: any) => {
				if (data.Type === "Whisper" && msg.includes("+:")) {
					// Replaces the raw "+:" with a stylized tag and hides the original
					const stylizedTag = '<span style="color: #ff99bb; font-weight: bold; text-shadow: 1px 1px 2px #000;">[W+]<span style="display:none;">+:</span></span>';
					return { msg: msg.replace("+:", stylizedTag) };
				}
				return false;
			}
		});
	}

	/**
	 * Parses the command arguments to extract member number and message
	 *
	 * @param {string} args - The arguments string passed to the command
	 * @param {string} command - The full command string
	 * @returns {Object} Parsed member number and message
	 */
	private parseArguments(args: string, command: string): { memberNumber: number, message: string } {
		// Extract member number (first part of the args)
		const firstSpaceIndex = args.indexOf(" ");
		let memberNumber: number;
		let message: string;

		if (firstSpaceIndex !== -1) {
			// If there's a space, parse the member number from the beginning
			const memberNumberStr = args.slice(0, firstSpaceIndex);
			memberNumber = parseInt(memberNumberStr);
			message = args.slice(firstSpaceIndex + 1);
		} else {
			// If no space, try to parse the entire args string
			memberNumber = parseInt(args);
			message = "";
		}

		// If parsing failed, try alternative approach using command string
		if (isNaN(memberNumber)) {
			const commandParts = command.trim().split(/\s+/);
			if (commandParts.length >= 2) {
				memberNumber = parseInt(commandParts[1]);
				message = commandParts.slice(2).join(" ");
			}
		}

		return { memberNumber, message };
	}

	/**
	 * Validates that the target member exists
	 *
	 * @param {any} target - The target (either member number or character object)
	 * @returns {Object|null} Validated target character or null if invalid
	 */
	private validateTarget(target: any): any {
		if (typeof target === 'object' && target !== null) {
			return target;
		}

		const memberNumber = parseInt(target);
		if (isNaN(memberNumber)) {
			return null;
		}

		return ChatRoomCharacter.find(C => C.MemberNumber === memberNumber);
	}

	/**
	 * Sends a whisper message to a target character
	 *
	 * @param {any} target - The target character or member number
	 * @param {string} msg - The message to send
	 * @returns {boolean} Whether the message was sent successfully
	 */
	private sendWhisperMessage(target: any, msg: string): boolean {
		if (!msg) {
			return false;
		}

		const targetMember = this.validateTarget(target);
		if (!targetMember) {
			ChatRoomSendLocal(`${TextGet("CommandNoWhisperTarget")} ${target}.`, 30_000);
			return false;
		}

		// Auto-stow drawer if enabled
		// We use a global settings check or similar if available
		if (this.drawerModule && (window as any).SETTINGS?.data.closeDrawerOnWhisper) {
			this.drawerModule.close();
		}

		// Handle self whispers with gray text and memo emoji
		if (targetMember.MemberNumber === Player.MemberNumber) {
			const SELFMESSAGE = `<span style="color:#989898">${Assets.printimage({ key: "thought" })} Note to </span><span style="color:${Player.LabelColor}">self</span><span style="color:#989898">: ${msg}</span>`;
			ChatRoomSendLocal(SELFMESSAGE);
			return false;
		}

		// Replace normal brackets with fake ones in the message
		let formattedMsg = msg.replace(/\(/g, "❪").replace(/\)/g, "❫");

		// Check if target and player are the same
		if (target.MemberNumber === Player.MemberNumber) {
			addChatMessage(formattedMsg);
			return true;
		} else {
			// Add parentheses if needed for range checking
			if (ChatRoomMapViewIsActive() && !ChatRoomMapViewCharacterOnWhisperRange(target) && formattedMsg[0] !== "(") {
				formattedMsg = `(${formattedMsg})`;
			}

			// Prepare the message with the +: prefix
			formattedMsg = `+: ${formattedMsg}`;

			// Build data payload
			const data = ChatRoomGenerateChatRoomChatMessage("Whisper", formattedMsg);
			if (!data) {
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
	 * This starts /whisper+ if you click on the roster.
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
	 * This runs when a player enters the /whisper+ command or clicks the roster.
	 *
	 * @param {string} args - arguments passed from player (message).
	 * @param {string} command - arguments passed as command (BC quirk).
	 * @returns {number} 0 indicates success, 1 is an error.
	 */
	public whisperplus(args: string, command: string): number {
		// Parse arguments
		const { memberNumber, message } = this.parseArguments(args, command);

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
			(C: any) => C.MemberNumber == memberNumber
		);

		// Send the whisper message
		const success = this.sendWhisperMessage(target || memberNumber, message);
		return success ? 0 : 1;
	}
	public override buildui(output?: string, elementId?: string, root?: HTMLElement): void {
		this.attachEvent("CRABS_player-id", this.sendWhisper, "playerNumber", undefined, "click", "class", root);
	}
}
