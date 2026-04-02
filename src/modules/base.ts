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

export enum PerformanceLevel {
	NORMAL = 0,   // > 30 FPS
	LOW = 1,      // 15 - 30 FPS
	CRITICAL = 2, // < 15 FPS
}

/**
 * Abstract base class for all CRABS modules, providing shared utilities and core functionality.
 */
export abstract class CRABS_Base {
	/** The ModSDK API instance for the CRABS mod. */
	declare CRABS: ModSDKModAPI;

	public static debugMode: boolean = false;

	/** Static reference to the subscreen definition for the game's preference menu. */
	protected static subscreenDef: any = null;

	protected currentPerformanceLevel: PerformanceLevel = PerformanceLevel.NORMAL;


	/**
	 * Creates an instance of a CRABS module.
	 * 
	 * @param {ModSDKModAPI} CRABS - The ModSDK API instance.
	 */
	constructor(CRABS: ModSDKModAPI) {
		this.CRABS = CRABS;
	}

	/**
	 * Fakes a roster command as if the user ran the command themselves.
	 *
	 * @param {string} action - String that determines what the roster should print.
	 * @returns {void}
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
	 * Determines if the drawer should render in mobile mode.
	 * Checks physical screen width first, then falls back to User-Agent detection.
	 * @returns {boolean} True if the device is a phone or the window is very small.
	 */
	protected isMobileView(): boolean {
		// Check physical window width (Catch shrinking desktop windows & most phones)
		if (window.innerWidth <= 768) {
			return true;
		}

		// Check the modern User-Agent Data API (Catch phones reporting accurately)
		const nav = navigator as any;
		if (nav.userAgentData && nav.userAgentData.mobile) {
			return true;
		}

		// Fallback to classic User-Agent string parsing (Catch Safari/iOS and older browsers)
		const ua = navigator.userAgent || (window as any).opera;
		return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase());
	}

	/**
	 * Takes a member number and opens that player's "focus" screen.
	 * This function is setup to be exposed to the global DOM.
	 *
	 * @param {number} MemberNumber - The member number for the player in question.
	 * @returns {void}
	 */
	public showPlayerFocus(MemberNumber: number): void {
		// Check if the person is still in the room
		const character = ChatRoomCharacter.find(
			(characterItem) => characterItem.MemberNumber == MemberNumber,
		);
		if (character) {
			ChatRoomStatusUpdate("Preference");
			ChatRoomFocusCharacter(character);
		} else {
			ChatRoomSendLocal("This person is no longer in the room.");
		}
	}


	/** 
	 * Takes a string target mod name and returns true if found.
	 * 
	 * @param {string} targetmod - String name of the mod.
	 * @returns {boolean} True if found, false if not.
	 */
	protected detectMod(targetmod: string): boolean {
		let modlist = bcModSdk.getModsInfo();
		return modlist.filter((modInfo) => modInfo.name == targetmod).length > 0;
	}

	/**
	 * Takes some data as input and copies it to the user's clipboard.
	 * 
	 * @param {string} data - String representing the data to copy to clipboard.
	 * @returns {Promise<void>}
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
	 * Removes an element from the DOM by its ID.
	 *
	 * @param {string} elementId - ID of the HTML element to remove.
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
	 * 
	 * @returns {Promise<void>}
	 */
	public async openSettings(): Promise<void> {
		const screen = window as any;

		// 1. Force the game into the Preferences screen state
		if (screen.CurrentModule !== "Character" || screen.CurrentScreen !== "Preference") {
			screen.InformationSheetLoadCharacter(screen.Player);
			await screen.CommonSetScreen("Character", "Preference");
		}

		// 2. Unload whatever subscreen is currently active
		if (typeof screen.PreferenceSubscreenUnload === "function") {
			screen.PreferenceSubscreenUnload();
		}

		// 3. Inject our stored subscreen using the STATIC reference
		if (CRABS_Base.subscreenDef) {
			screen.PreferenceSubscreen = CRABS_Base.subscreenDef;
			screen.PreferencePageCurrent = 1;
			screen.PreferenceMessage = "";

			if (typeof screen.PreferenceSubscreenCreateSubscreen === "function") {
				screen.PreferenceSubscreenCreateSubscreen("");
			}

			if (typeof CRABS_Base.subscreenDef.load === "function") CRABS_Base.subscreenDef.load();
			if (typeof screen.PreferenceResize === "function") screen.PreferenceResize(true);
		}
	}

	/**
	 * Attaches an event listener to any object matching the supplied class or ID.
	 * 
	 * @param {string} selectorName - Name of the class or id you are looking for.
	 * @param {function} callback - The function to execute.
	 * @param {string} [data] - camelcase dataset key (e.g., "userid" for data-user-id).
	 * @param {any} [callbackArgument] - Optional direct argument to pass to the callback.
	 * @param {string} [event="click"] - Type of event to trigger on.
	 * @param {"class" | "id"} [findBy="class"] - Optional: Whether to search by class or ID. Defaults to class.
	 * @param {HTMLElement} [root] - Optional: Root element to search within. Defaults to TextAreaChatLog.
	 * @returns {void}
	 */
	public attachEvent(
		selectorName: string,
		callback: (val?: any) => void,
		data?: string,
		callbackArgument?: any,
		event: string = "click",
		findBy: "class" | "id" = "class",
		root?: HTMLElement
	): void {
		const searchRoot = root || document.getElementById("TextAreaChatLog");
		if (!searchRoot) return;

		const elements: HTMLElement[] = [];

		if (findBy === "id") {
			const element = root ? root.querySelector(`#${selectorName}`) : document.getElementById(selectorName);
			if (element) elements.push(element as HTMLElement);
		} else {
			const classElements = searchRoot.getElementsByClassName(selectorName);
			elements.push(...Array.from(classElements as HTMLCollectionOf<HTMLElement>));
		}

		for (let element of elements) {
			element.addEventListener(event, (eventObject: Event) => {
				if (event === "contextmenu") eventObject.preventDefault();

				const target = eventObject.currentTarget as HTMLElement;

				if (callbackArgument !== undefined) callback(callbackArgument);
				else if (data) callback(target.dataset[data]);
				else callback(eventObject);
			});
		}
	}

	/**
	 * Renders HTMLElement objects into the DOM (Chat Window) and scrolls to the bottom.
	 *
	 * @param {string} [output] - Optional: HTML string to print.
	 * @param {string} [elementId] - Optional: ID for the element.
	 * @param {HTMLElement} [root] - Optional: Root element for event attachment.
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
	 * Processes a template by replacing variables with provided arguments.
	 *
	 * @param {string} template - Name of the HTML file, or the template string itself.
	 * @param {Record<string, string>} templateArguments - A dictionary of variable names and their replacement values.
	 * @param {boolean} wrapper - A boolean that determines if the content should be wrapped.
	 * @param {Record<string, string>} [wrapperArgs] - Optional dictionary for populating the wrapper template.
	 * @returns {string} The processed HTML string.
	 */
	protected template(
		template: string,
		templateArguments: Record<string, string>,
		wrapper: boolean = true,
		wrapperArgs?: Record<string, string>, // ignored when wrapper == false
	): string {
		let regularExpression: RegExp;

		for (const [key, value] of Object.entries(templateArguments)) {
			regularExpression = new RegExp(`{{${key}}}`, "g");
			template = template.replace(regularExpression, value);
		}

		if (wrapper) {
			template = wrappertemplate
				.replace("{{Help}}", Assets.printimage({ key: "help" }))
				.replace("{{Settings}}", Assets.printimage({ key: "settings" }))
				.replace("{{content}}", template);
			if (wrapperArgs) {
				for (const [key, value] of Object.entries(wrapperArgs)) {
					regularExpression = new RegExp(`{{${key}}}`, "g");
					template = template.replace(regularExpression, value);
				}
			}
		}

		return template;
	}

	/**
	 * Converts a hex color string to an RGBA string with the specified transparency.
	 *
	 * @param {string} hex - The hex color code (e.g., "#FFFFFF").
	 * @param {number} [alpha=0] - The transparency value from -1 to 1 (0 is fully opaque, -1 is invisible).
	 * @returns {string} The resulting RGBA color string.
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

	/** Cache for storing raw brightness values (0-255). */
	protected colorBrightnessCache = new Map<string, number>();
	/** Canvas element used for color calculations. */
	protected colorCanvas = document.createElement("canvas");
	/** Canvas 2D context for color calculations. */
	protected canvasContext = this.colorCanvas.getContext("2d", { willReadFrequently: true });

	/**
	 * Calculates the perceived brightness of a color.
	 * 
	 * @param {string} color - The color string to analyze.
	 * @returns {number} A value from 0 (darkest) to 255 (brightest).
	 */
	protected getColorBrightness(color: string): number {
		if (!color) return 255; // Default fallback

		if (this.colorBrightnessCache.has(color)) return this.colorBrightnessCache.get(color)!;
		if (!this.canvasContext) return 255;

		try {
			this.colorCanvas.width = 1;
			this.colorCanvas.height = 1;
			this.canvasContext.clearRect(0, 0, 1, 1);
			this.canvasContext.fillStyle = color;
			this.canvasContext.fillRect(0, 0, 1, 1);

			const data = this.canvasContext.getImageData(0, 0, 1, 1).data;
			const brightness = (data[0] * 299 + data[1] * 587 + data[2] * 114) / 1000;

			this.colorBrightnessCache.set(color, brightness);
			return brightness;
		} catch (error) {
			// Fallback to prevent canvas crashes
			this.colorBrightnessCache.set(color, 255);
			return 255;
		}
	}

	/**
	 * Generates a brightly saturated version of a color for the text outline.
	 * * @param {string} color - The base color to brighten.
	 * @returns {string} RGBA string of the brightened color.
	 */
	protected getBrightOutlineColor(color: string): string {
		if (!this.canvasContext) return "rgba(255,255,255,0.8)"; // fallback

		try {
			this.colorCanvas.width = 1;
			this.colorCanvas.height = 1;
			this.canvasContext.clearRect(0, 0, 1, 1);
			this.canvasContext.fillStyle = color;
			this.canvasContext.fillRect(0, 0, 1, 1);

			const data = this.canvasContext.getImageData(0, 0, 1, 1).data;
			let r = data[0], g = data[1], b = data[2];

			// If the color is basically pitch black, return a visible white/gray outline
			if (r < 30 && g < 30 && b < 30) {
				return "rgba(200, 200, 200, 0.9)";
			}

			// Find the strongest color channel and scale it mathematically
			const max = Math.max(r, g, b);
			const multiplier = 255 / max;

			const brightR = Math.min(255, r * multiplier);
			const brightG = Math.min(255, g * multiplier);
			const brightB = Math.min(255, b * multiplier);

			// Mix the bright neon color 50/50 with pure white to create a soft, high-contrast pastel halo
			r = Math.round((brightR + 255) / 2);
			g = Math.round((brightG + 255) / 2);
			b = Math.round((brightB + 255) / 2);

			return `rgba(${r}, ${g}, ${b}, 0.9)`;
		} catch (error) {
			return "rgba(255,255,255,0.8)";
		}
	}

	private applyTieredOptimizations(): void {
		const root = document.documentElement;
		// Target the specific container for the tab icon
		const tabContainer = document.getElementById("drawer-tab");

		switch (this.currentPerformanceLevel) {
			case PerformanceLevel.NORMAL:
				root.style.setProperty("--crabs-blur", "10px");
				if (tabContainer && tabContainer.getAttribute("data-mode") !== "animated") {
					tabContainer.innerHTML = Assets.printimage({ key: "animated_logo" });
					tabContainer.setAttribute("data-mode", "animated");
				}
				break;

			case PerformanceLevel.LOW:
				root.style.setProperty("--crabs-blur", "3px");
				// Stay animated in LOW mode
				if (tabContainer && tabContainer.getAttribute("data-mode") !== "animated") {
					tabContainer.innerHTML = Assets.printimage({ key: "animated_logo" });
					tabContainer.setAttribute("data-mode", "animated");
				}
				break;

			case PerformanceLevel.CRITICAL:
				root.style.setProperty("--crabs-blur", "1px");
				// Swap to static in CRITICAL mode
				if (tabContainer && tabContainer.getAttribute("data-mode") !== "static") {
					tabContainer.innerHTML = Assets.printimage({ key: "logo" });
					tabContainer.setAttribute("data-mode", "static");
				}
				break;
		}
		if (CRABS_Base.debugMode) console.log(`CRABS Performance mode: %{currentPerformanceLevel}`);
	}

	/**
	 * Checks game performance and toggles a low-quality mode if FPS stays low.
	 * Call this inside your main draw/run loop.
	 */
	protected updatePerformanceState(): void {
		const fps = Math.round(10000 / (window as any).TimerRunInterval / 10);
		let targetLevel = PerformanceLevel.NORMAL;

		if (fps < 15) {
			targetLevel = PerformanceLevel.CRITICAL;
		} else if (fps < 30) {
			targetLevel = PerformanceLevel.LOW;
		}

		// Only update if the level actually changed
		if (targetLevel !== this.currentPerformanceLevel) {
			this.currentPerformanceLevel = targetLevel;
			this.applyTieredOptimizations();
		}
	}

}
