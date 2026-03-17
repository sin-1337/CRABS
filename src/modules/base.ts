/**
 * CRABS Base Module
 *
 * This is the base class for all CRABS mod modules. It provides:
 * - Core functionality that all modules inherit
 * - Utility methods for chat room interactions
 * - Common helper functions for mod operations
 * - Base initialization and setup procedures
 *
 * All other CRABS modules should extend this class to inherit common functionality.
 */


import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Assets } from "./assets";
import DOMPurify from "dompurify";
import "./templates/base.css";
import wrappertemplate from "./templates/wrapper.html";

export abstract class CRABS_Base {
	declare crabs: ModSDKModAPI;

	constructor(CRABS: ModSDKModAPI) {
		this.crabs = CRABS;
	}

	/**
	 * Fakes a roster command as if the user ran the command themselves.
	 *
	 * @param {string} action - String that determines what the roster should print.
	 * @returns void
	 */
	// public fakePlayerCommand(action: string = "all"): void {
	// 	for (let [_, command] of Commands.entries()) {
	// 		if (command.Tag === `crabs`) {
	// 			command.Action(action);
	// 			break;
	// 		}
	// 	}
	// }

	/**
	 * Takes a member number and opens that player's  "focus" screen.
	 * This function is setup up to be exposed to the global DOM.
	 *
	 * @param {number} MemberNumber - The member number for the player in question.
	 * @returns {void}
	 */
	public showPlayerFocus(MemberNumber: number): void {
		// Check if the person is still in the room
		const PLAYER = ChatRoomCharacter.find(
			(C) => C.MemberNumber == MemberNumber,
		);
		if (PLAYER) {
			ChatRoomStatusUpdate("Preference");
			ChatRoomFocusCharacter(PLAYER);
		} else {
			ChatRoomSendLocal("This person is no longer in the room.");
		}
	}

	/**
	 * Takes some data as input and copies it to the user's clipboard
	 * @param {string} data - string representing whatever data to copy to clipbard.
	 *
	 * @returns {void} Don't return anything
	 */
	public async copyToClipboard(data: string): Promise<void> {
		try {
			await navigator.clipboard.writeText(data);
			// console.log("DEBUG: Text copied to clipboard: ", data);
			return;
		} catch (error) {
			console.error("Copy to clipboard failed", error);
			return;
		}
	}

	/**
	 * Removes an element from the DOM by id
	 *
	 * @param {string} elementId - ID of HTML element to remove
	 * @returns {void}
	 */
	public closeElement(elementId: string): void {
		if (elementId) {
			const existing = document.getElementById(elementId);
			if (existing) {
				existing.remove();
			}
		}
	}

	/**
	 * Attaches an event listener to any object matching the supplied class.
	 *
	 * @param {string} classname - Name of the class you are looking for.
	 * @param {string} action - Name of the function you want to call when the event is triggered.
	 * @param {string} [data] - [optional] Arguments to the function, MUST be camelcase... ex: playerNumber.
	 * @param {string} [arg] - [optional] Direct argument to pass, mutually exclusive with data, if passed, data ignored.
	 * @param {string} [event] - [default = click] Type of event you wish this to trigger on.
	 * @returns {void}
	 */
	public attachEvent(
		classname: string,
		action: string,
		data?: string,
		arg?: string,
		event: string = "click",
	): void {
		const chat = document.getElementById("TextAreaChatLog");

		if (!chat) return; // if chat is not found, bail
		// Select all roster links
		const elmements = chat.getElementsByClassName(
			classname,
		) as HTMLCollectionOf<HTMLElement>;

		// Attach event listeners to all roster links
		for (let element of elmements) {
			element.addEventListener(event, (e) => {
				// add listener
				const target = e.currentTarget as HTMLElement; // capture target
				if (arg) {
					(window as any)[action](arg);
					return;
				}
				if (data) {
					const parsed_data = target.dataset[data]; // parse data
					(window as any)[action](parsed_data);
					return;
				} else {
					(window as any)[action]();
					return;
				}
			});
		}
	}

	/**
	 * Attach event listener to DOM object with callback
	 *
	 * @param {string} classname - name of the class
	 * @param {event} callback - callback event function
	 * @param {string} event - the event
	 */
	public attachEventWithCallback(
		classname: string,
		callback: (e: Event) => void,
		event: string = "click",
	): void {
		const CHAT = document.getElementById("TextAreaChatLog");
		if (!CHAT) return;

		const elements = CHAT.getElementsByClassName(
			classname,
		) as HTMLCollectionOf<HTMLElement>;
		for (let element of elements) {
			element.addEventListener(event, callback);
		}
	}

	/**
	 * Prints HTMLElement objects into the DOM (Chat Window) and scroll to bottom of chat window.
	 *
	 * @param {HTMLElement} output - Object to print
	 * @param {string} elementId - Name of the element
	 * @returns {void}
	 */
	public sendoutput(output: string, elementId?: string): void {
		const template = document.createElement("template");

		const cleanHtml = DOMPurify.sanitize(output, {
			USE_PROFILES: { html: true }, // Allow full HTML (but safe)
		});

		template.innerHTML = cleanHtml;

		let chat = document.getElementById("TextAreaChatLog");
		if (chat) {
			if (elementId) {
				this.closeElement(elementId);

				let wrapper = document.createElement("div");
				wrapper.id = elementId;
				wrapper.appendChild(template.content);

				chat.appendChild(wrapper);
			} else {
				chat.appendChild(template);
			}
			ElementScrollToEnd("TextAreaChatLog");
		} else {
			console.log("CRABS ERROR: Could not find chat element!");
		}
		this.attachEvent("CRABS_Help_Icon", "fakePlayerCommand", undefined, "help");
		this.attachEvent("CRABS_close", "crabsCloseItem", "elementid");
	}

	/**
	 * Takes a template name and outputs the filled out template string
	 *
	 * @param {string} template - Name of the HTML file, no extension or path
	 * @param {Record<string, string>} args - A dictionary where the key is a variable name to replace the template
	 * @param {boolean} wrapper -  A boolean that determines if we draw the wrapper or not
	 * @param {Record<string, string>} [wrapperArgs] - [optional] A dictionary of key/values that populate the wrapper
	 * @returns {string } HTML string
	 */
	protected template(
		template: string,
		args: Record<string, string>,
		wrapper: boolean = true,
		wrapperArgs?: Record<string, string>, // ignored when wrapper == false
	): string {
		let regex: RegExp;

		for (const [KEY, VALUE] of Object.entries(args)) {
			regex = new RegExp(`{{${KEY}}}`, "g");
			template = template.replace(regex, VALUE);
		}

		if (wrapper) {
			template = wrappertemplate
				.replace("{{Help}}", Assets.printimage({ key: "help" }))
				.replace("{{content}}", template);
			if (wrapperArgs) {
				for (const [KEY, VALUE] of Object.entries(wrapperArgs)) {
					regex = new RegExp(`{{${KEY}}}`, "g");
					template = template.replace(regex, VALUE);
				}
			}
		}

		return template;
	}

	/**
	 * Function to convert hex color to rgba and add transparency
	 *
	 * @param {string} hex - value of the color
	 * @param {number} [alpha] - for transparencey, bigger is more opaque. Optional, default 0
	 *  Alpha range: The alpha value ranges from -1 to 1:
	 *  alpha = 0: means fully opaque (no transparency).
	 *  alpha = -1: means fully transparent (completely invisible).
	 * @returns {string} RGBA value with alpha
	 */
	protected convertColor(hex: string, alpha: number = 0): string {
		// Remove the hash if it's there
		hex = hex.replace(/^#/, "");

		// Parse the red, green, and blue components
		const red = parseInt(hex.slice(0, 2), 16);
		const green = parseInt(hex.slice(2, 4), 16);
		const blue = parseInt(hex.slice(4, 6), 16);

		// Return the rgba value with alpha transparency
		return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
	}
}
