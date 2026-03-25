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


import bcModSdk, { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Assets } from "./assets";
import { Notification } from "./notifications";
import DOMPurify from "dompurify";
import "./templates/base.css";
import wrappertemplate from "./templates/wrapper.html";

export abstract class CRABS_Base {
	declare CRABS: ModSDKModAPI;

	protected static subscreenDef: any = null;

	constructor(CRABS: ModSDKModAPI) {
		this.CRABS = CRABS;
	}

	/**
	 * Fakes a roster command as if the user ran the command themselves.
	 *
	 * @param {string} action - String that determines what the roster should print.
	 * @returns void
	 */
	public fakePlayerCommand(action: string = "all"): void {
		for (let [_, command] of Commands.entries()) {
			if (command.Tag === `crabs`) {
				command.Action(action);
				break;
			}
		}
	}

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


	/** Takes a string target mod name and returns a true if found.
	 *  @param {string} targetmod - String name of the mod.
	 *  @returns {boolean} True if found, false if not.
	 */
	protected detectMod(targetmod: string): boolean {
		let modlist = bcModSdk.getModsInfo();
		return modlist.filter((x) => x.name == targetmod).length > 0;
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
			Notification.send(`"${data}" copied to clipboard.`)
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
	 * Navigates to the CRABS settings page directly, bypassing the Extensions list.
	 */
	public async openSettings(): Promise<void> {
		const w = window as any;

		// 1. Force the game into the Preferences screen state
		if (w.CurrentModule !== "Character" || w.CurrentScreen !== "Preference") {
			w.InformationSheetLoadCharacter(w.Player);
			await w.CommonSetScreen("Character", "Preference");
		}

		// 2. Unload whatever subscreen is currently active
		if (typeof w.PreferenceSubscreenUnload === "function") {
			w.PreferenceSubscreenUnload();
		}

		// 3. Inject our stored subscreen using the STATIC reference
		if (CRABS_Base.subscreenDef) {
			w.PreferenceSubscreen = CRABS_Base.subscreenDef;
			w.PreferencePageCurrent = 1;
			w.PreferenceMessage = "";

			if (typeof w.PreferenceSubscreenCreateSubscreen === "function") {
				w.PreferenceSubscreenCreateSubscreen("CRABS");
			}

			if (typeof CRABS_Base.subscreenDef.load === "function") CRABS_Base.subscreenDef.load();
			if (typeof w.PreferenceResize === "function") w.PreferenceResize(true);
		}
	}

	/**
	 * Attaches an event listener to any object matching the supplied class or id.
	 * @param {string} selectorName - Name of the class or id you are looking for.
	 * @param {function} callback - The function to execute.
	 * @param {string} [data] - camelcase dataset key (e.g., "userid" for data-user-id).
	 * @param {any} [arg] - [optional] Direct argument to pass, mutually exclusive with data.
	 * @param {string} [event="click"] - Type of event you wish this to trigger on.
	 * @param {"class" | "id"} [findBy="class"] - Optional: Whether to search by class or id. Defaults to class.
	 * @param {HTMLElement} [root] - Optional: Root element to search within. Defaults to TextAreaChatLog.
	 * @returns {void}
	 */
	public attachEvent(
		selectorName: string,
		callback: (val?: any) => void,
		data?: string,
		arg?: any,
		event: string = "click",
		findBy: "class" | "id" = "class",
		root?: HTMLElement
	): void {
		const searchRoot = root || document.getElementById("TextAreaChatLog");
		if (!searchRoot) return;

		const elements: HTMLElement[] = [];

		if (findBy === "id") {
			const el = root ? root.querySelector(`#${selectorName}`) : document.getElementById(selectorName);
			if (el) elements.push(el as HTMLElement);
		} else {
			const classElements = searchRoot.getElementsByClassName(selectorName);
			elements.push(...Array.from(classElements as HTMLCollectionOf<HTMLElement>));
		}

		for (let element of elements) {
			element.addEventListener(event, (e: Event) => {
				if (event === "contextmenu") e.preventDefault();

				const target = e.currentTarget as HTMLElement;

				if (arg !== undefined) callback(arg);
				else if (data) callback(target.dataset[data]);
				else callback(e);
			});
		}
	}

	/**
	 * Prints HTMLElement objects into the DOM (Chat Window) and scroll to bottom of chat window.
	 *
	 * @param {string} [output] - Optional: HTML string to print
	 * @param {string} [elementId] - Optional: Name of the element
	 * @param {HTMLElement} [root] - Optional: Root element for event attachment
	 * @returns {void}
	 */
	public buildui(output?: string, elementId?: string, root?: HTMLElement): void {
		if (output) {
			const template = document.createElement("template");
			const cleanHtml = DOMPurify.sanitize(output, {
				USE_PROFILES: { html: true },
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
			}
		}
		this.attachEvent("CRABS_Help_Icon", this.fakePlayerCommand, undefined, "help", "click", "class", root);
		this.attachEvent("CRABS_Settings_Icon", () => this.openSettings(), undefined, undefined, "click", "class", root);
		this.attachEvent("CRABS_close", this.closeElement, "elementid", undefined, "click", "class", root);
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
				.replace("{{Settings}}", Assets.printimage({ key: "settings" }))
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

	// Cache the raw brightness value (0-255)
	protected colorBrightnessCache = new Map<string, number>();
	protected colorCanvas = document.createElement("canvas");
	protected colorCtx = this.colorCanvas.getContext("2d", { willReadFrequently: true });

	// Returns a value from 0 (darkest) to 255 (brightest)
	// Returns a value from 0 (darkest) to 255 (brightest)
	protected getColorBrightness(color: string): number {
		if (!color) return 255; // Default fallback

		if (this.colorBrightnessCache.has(color)) return this.colorBrightnessCache.get(color)!;
		if (!this.colorCtx) return 255;

		try {
			this.colorCanvas.width = 1;
			this.colorCanvas.height = 1;
			this.colorCtx.clearRect(0, 0, 1, 1);
			this.colorCtx.fillStyle = color;
			this.colorCtx.fillRect(0, 0, 1, 1);

			const data = this.colorCtx.getImageData(0, 0, 1, 1).data;
			const brightness = (data[0] * 299 + data[1] * 587 + data[2] * 114) / 1000;

			this.colorBrightnessCache.set(color, brightness);
			return brightness;
		} catch (e) {
			// Fallback to prevent canvas crashes
			this.colorBrightnessCache.set(color, 255);
			return 255;
		}
	}

}
