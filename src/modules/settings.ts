/**
 * CRABS Settings Module
 *
 * This module implements the configuration interface for the CRABS mod.
 * It provides:
 * - A custom in-game preference subscreen
 * - Persistent storage of user configurations
 * - Dynamic UI generation for various setting types (checkboxes, cycle buttons)
 * - Integration with the Bondage Club Mod SDK
 * - State synchronization with base game variables
 */

import { CRABS_Base } from "./base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";

/** Default configuration values applied if no local storage data is found. */
const DEFAULT_SETTINGS: CRABS_Settings = {
	showBanner: true,
	checkForUpdates: true,
	rosterOpensDrawer: true,
	hideDrawerTab: false,
	immersiveBlind: false,
	immersiveGag: false,
	respectBcxRules: false,
	compactDrawer: true,
	closeDrawerOnWhisper: false,
	closeDrawerOnChat: false,
	disableDrawer: false,
	lockImmersive: false,
	showMapCompass: true,
	mapSuperZoom: false,
	pageShiftMode: "delay",
};

/**
 * Class representing the mod settings menu and configuration manager.
 * Handles rendering, user interaction, and data persistence for mod preferences.
 */
export class Settings extends CRABS_Base {
	public static instance: Settings;
	public data: CRABS_Settings;

	/** Array containing the structured definitions of all UI elements to be rendered. */
	private elements: any[] = [];
	private readonly STORAGE_KEY = "CRABS_Settings";

	private readonly LEFT_COL_X = 550;
	private readonly RIGHT_COL_X = 1250;
	private readonly CHECKBOX_X_OFFSET = 30;
	private readonly LABEL_X_OFFSET = 120;
	private readonly CHECKBOX_WIDTH = 64;

	private scrollOffset: number = 0;
	private readonly MAX_SCROLL: number = 600; // Expanded to accommodate the new height
	private readonly SCROLL_STEP: number = 100;

	/**
	 * Initializes the settings manager, loads saved data, constructs the UI layout,
	 * and registers the subscreen with the base game.
	 * @param {ModSDKModAPI} CRABS - The ModSDK API instance.
	 */
	constructor(CRABS: ModSDKModAPI) {
		super(CRABS);
		Settings.instance = this;
		this.data = this.load();
		this.setupUI();
		this.registerExtension();

		window.addEventListener("wheel", this.handleWheel);
	}

	/**
	 * Retrieves and parses saved configuration data from local storage, 
	 * merging it with default fallback values to ensure all properties exist.
	 * @returns {CRABS_Settings} The compiled settings object.
	 */
	private load(): CRABS_Settings {
		const savedData = localStorage.getItem(this.STORAGE_KEY);
		if (savedData) {
			try { return { ...DEFAULT_SETTINGS, ...JSON.parse(savedData) }; }
			catch (error) { console.error("CRABS: Load failed", error); }
		}
		return { ...DEFAULT_SETTINGS };
	}

	/**
	 * Serializes and commits the current configuration state to local storage.
	 */
	public save(): void {
		localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
	}

	/**
	 * Evaluates if the player character is currently bound or restrained.
	 * @returns {boolean} True if the player is restricted.
	 */
	private isRestricted(): boolean {
		return (window as any).Player?.IsRestrained?.() || false;
	}

	/**
	 * Determines if a specific UI element should be locked and unclickable 
	 * based on hardcore immersion rules and the player's restraint status.
	 * @param {any} element - The UI element configuration object to evaluate.
	 * @returns {boolean} True if the element should be locked out.
	 */
	private isSettingLocked(element: any): boolean {
		if (!this.isRestricted() || !this.data.lockImmersive) return false;

		if (element.setting === "lockImmersive") return true;

		if (element.category === "Immersion" && this.data[element.setting as keyof CRABS_Settings] === true) return true;

		return false;
	}

	/**
	 * Processes mouse wheel interactions to scroll the internal settings area.
	 * Validates that the interaction occurs within the designated clipping bounds.
	 * @param {WheelEvent} event - The native wheel event triggered by the DOM.
	 */
	private handleWheel = (event: WheelEvent): void => {
		const globalWindow = window as any;

		if (globalWindow.CurrentScreen !== "Preference" || globalWindow.PreferenceSubscreen !== "CRABS") return;

		if (globalWindow.MouseX >= 500 && globalWindow.MouseX <= 1780 && globalWindow.MouseY >= 180 && globalWindow.MouseY <= 900) {
			if (event.deltaY > 0) {
				this.scrollOffset = Math.min(this.MAX_SCROLL, this.scrollOffset + 50);
			} else if (event.deltaY < 0) {
				this.scrollOffset = Math.max(0, this.scrollOffset - 50);
			}
		}
	};

	/**
	 * Populates the internal element array with the structural definition of 
	 * all setting toggles and buttons, organizing them by category and vertical position.
	 */
	private setupUI(): void {
		this.elements = [];

		// CATEGORY: General
		this.addCheckbox("Show Banner on Entry", "showBanner", "Display info banner on room join.", { category: "General", yPos: 280 });
		this.addCheckbox("Check for Updates", "checkForUpdates", "Periodically check GitHub for mod updates.", { category: "General", yPos: 355 });

		const isDrawerDisabled = () => this.data.disableDrawer;

		// CATEGORY: Drawer (All yPos shifted down by 75px to fit General expansion)
		this.addCheckbox("Disable Drawer UI", "disableDrawer", "Disable the drawer, use inline chat roster only.", { category: "Drawer", yPos: 500 });
		this.addCheckbox("/roster toggles drawer", "rosterOpensDrawer", "Toggle drawer via /roster or /crabs commands.", { category: "Drawer", yPos: 575, grayedOut: isDrawerDisabled });
		this.addCheckbox("Hide Drawer Tab", "hideDrawerTab", "Hide the CRABS drawer tab.", { category: "Drawer", yPos: 650, grayedOut: () => isDrawerDisabled() || !this.data.rosterOpensDrawer });
		this.addCheckbox("Compact Height", "compactDrawer", "Drawer has a 77% height limit.", { category: "Drawer", yPos: 725, grayedOut: isDrawerDisabled });
		this.addCheckbox("Auto-stow on Whisper+", "closeDrawerOnWhisper", "Close drawer after sending a whisper+ message.", { category: "Drawer", yPos: 800, grayedOut: isDrawerDisabled });
		this.addCheckbox("Auto-stow on Chat", "closeDrawerOnChat", "Close drawer after sending a message.", { category: "Drawer", yPos: 875, grayedOut: isDrawerDisabled });
		this.addCycle("Roster Shift Mode", "pageShiftMode", ["hover", "delay", "click"], "How to switch pages to targeted players.", { category: "Drawer", yPos: 950, grayedOut: isDrawerDisabled });

		// CATEGORY: Immersion
		this.addCheckbox("Hardcore Lock", "lockImmersive", "Locks settings ON while bound.", { category: "Immersion", yPos: 280 });
		this.addCheckbox("Respect Blindness", "immersiveBlind", "Blurred roster when blind.", { category: "Immersion", yPos: 355 });
		this.addCheckbox("Respect Gags", "immersiveGag", "No Whisper+ when gagged.", { category: "Immersion", yPos: 430 });
		this.addCheckbox("Respect BCX Rules", "respectBcxRules", "BCX integration.", { category: "Immersion", yPos: 505 });

		// CATEGORY: Maps
		this.addCheckbox("Show Map Compass", "showMapCompass", "Show a directional arrow on map.", { category: "Maps", yPos: 725 });

		const isSuperZoomBlocked = () => {
			const perceptionValue = (window as any).ChatRoomMapViewPerceptionRangeMax;
			return perceptionValue !== undefined && perceptionValue !== 7 && perceptionValue !== 50;
		};
		this.addCheckbox("SuperZoom", "mapSuperZoom", "Unlock map zoom limits.", { category: "Maps", yPos: 800, grayedOut: isSuperZoomBlocked });
	}

	/**
	 * Registers a boolean toggle element to be rendered in the settings view.
	 * @param {string} text - The display label for the setting.
	 * @param {string} setting - The key mapped to CRABS_Settings data property.
	 * @param {string} hint - Tooltip description shown on hover.
	 * @param {any} options - Optional configuration parameters including category, layout overrides, and disabling logic.
	 */
	private addCheckbox(text: string, setting: keyof CRABS_Settings & string, hint: string, options?: any) {
		this.elements.push({
			type: 'Checkbox', text, setting, hint,
			yPos: options?.yPos || 280,
			width: this.CHECKBOX_WIDTH, height: this.CHECKBOX_WIDTH,
			category: options?.category,
			grayedOut: options?.grayedOut
		});
	}

	/**
	 * Registers a multi-state cycle button to be rendered in the settings view.
	 * @param {string} text - The display label for the setting.
	 * @param {string} setting - The key mapped to CRABS_Settings data property.
	 * @param {string[]} cycleOptions - Array of string values the setting will loop through on click.
	 * @param {string} hint - Tooltip description shown on hover.
	 * @param {any} options - Optional configuration parameters including category, layout overrides, and disabling logic.
	 */
	private addCycle(text: string, setting: keyof CRABS_Settings & string, cycleOptions: string[], hint: string, options?: any) {
		this.elements.push({
			type: 'Cycle', text, setting, cycleOptions, hint,
			yPos: options?.yPos || 280,
			category: options?.category,
			grayedOut: options?.grayedOut
		});
	}

	/**
	 * Renders the graphical user interface for the settings screen onto the main game canvas.
	 * Handles clipping boundaries, scrolling offset calculations, and interactive state rendering.
	 */
	public draw(): void {
		const { MouseIn, DrawText, DrawCheckbox, DrawCharacter, DrawRect, PreferenceMessage, DrawButton, Player } = window as any;
		const canvasContext = (document.getElementById("MainCanvas") as HTMLCanvasElement)?.getContext("2d");
		if (!canvasContext) return;

		canvasContext.save();
		const isInChatRoom = typeof ChatRoomData !== "undefined" && ChatRoomData !== null;

		try {
			DrawRect(40, 40, 420, 920, "#222222aa");
			DrawCharacter(Player, 50, 50, 0.9);

			canvasContext.textAlign = "center";
			canvasContext.textBaseline = "middle";
			DrawText("- CRABS Mod Settings -", 1200, 80, "Black", "Gray");
			DrawButton(1815, 75, 90, 90, "", "White", "Icons/Exit.png", "Back");
			DrawButton(1710, 75, 90, 90, "", isInChatRoom ? "White" : "#888888", "Icons/Chat.png", isInChatRoom ? "Return to Chat" : "Not in a Chat Room");

			DrawButton(1815, 200, 90, 90, "", this.scrollOffset > 0 ? "White" : "#888888", "Icons/Up.png", "Scroll Up");
			DrawButton(1815, 800, 90, 90, "", this.scrollOffset < this.MAX_SCROLL ? "White" : "#888888", "Icons/Down.png", "Scroll Down");

			if (PreferenceMessage) DrawText(PreferenceMessage, 1000, 150, "Red", "Black");
			else DrawText("Hover settings for details", 1200, 150, "Black", "Gray");

			// Isolate the scrolling area with a clipping path
			canvasContext.save();
			canvasContext.beginPath();
			canvasContext.rect(500, 180, 1280, 720);
			canvasContext.clip();

			const leftColumnX = this.LEFT_COL_X - 20;
			const rightColumnX = this.RIGHT_COL_X - 20;
			const currentScrollOffset = this.scrollOffset;

			// Render category backdrops factoring in the current scroll depth
			DrawRect(leftColumnX, 200 - currentScrollOffset, 650, 200, "#00000011"); DrawText("General", leftColumnX + 325, 220 - currentScrollOffset, "Black", "Gray");
			DrawRect(leftColumnX, 420 - currentScrollOffset, 650, 575, "#00000011"); DrawText("Drawer", leftColumnX + 325, 440 - currentScrollOffset, "Black", "Gray");
			DrawRect(rightColumnX, 200 - currentScrollOffset, 650, 375, "#00000011"); DrawText("Immersion", rightColumnX + 325, 220 - currentScrollOffset, "Black", "Gray");
			DrawRect(rightColumnX, 650 - currentScrollOffset, 650, 200, "#00000011"); DrawText("Maps", rightColumnX + 325, 670 - currentScrollOffset, "Black", "Gray");

			let tooltipHintToDraw = "";

			for (const element of this.elements) {
				const isRightColumn = element.category === "Immersion" || element.category === "Maps";
				const columnX = isRightColumn ? this.RIGHT_COL_X : this.LEFT_COL_X;
				const checkboxX = columnX + this.CHECKBOX_X_OFFSET;
				const textX = columnX + this.LABEL_X_OFFSET;
				const renderPositionY = element.yPos - currentScrollOffset;

				const isManuallyDisabled = typeof element.grayedOut === 'function' ? element.grayedOut() : element.grayedOut;
				const isHardcoreLocked = this.isSettingLocked(element);
				const isElementLocked = isManuallyDisabled || isHardcoreLocked;

				if (element.type === 'Checkbox') {
					DrawCheckbox(checkboxX, renderPositionY - 32, 64, 64, "", this.data[element.setting as keyof CRABS_Settings], isElementLocked);
					canvasContext.textAlign = "left";
					DrawText(element.text, textX, renderPositionY, isElementLocked ? "#888888" : "Black", "");

					if (MouseIn(textX, renderPositionY - 18, 450, 36) || MouseIn(checkboxX, renderPositionY - 32, 64, 64)) {
						tooltipHintToDraw = element.hint;
						if (element.setting === "mapSuperZoom" && isManuallyDisabled) {
							tooltipHintToDraw = "Disabled: Another mod or script is controlling this setting.";
						}
					}
				} else if (element.type === 'Cycle') {
					const currentValue = this.data[element.setting as keyof CRABS_Settings];
					const buttonWidth = 140;
					const buttonHeight = 44;
					const displayLabel = String(currentValue).toUpperCase();

					const cycleButtonX = columnX + 450;

					canvasContext.textAlign = "left";
					DrawText(element.text, textX, renderPositionY, isElementLocked ? "#888888" : "Black", "");

					DrawButton(cycleButtonX, renderPositionY - (buttonHeight / 2), buttonWidth, buttonHeight, displayLabel, isElementLocked ? "#888888" : "White", "");

					if (MouseIn(textX, renderPositionY - 18, 450, 36) || MouseIn(cycleButtonX, renderPositionY - (buttonHeight / 2), buttonWidth, buttonHeight)) {
						tooltipHintToDraw = element.hint;
					}
				}
			}
			// Release the clipping bounds so global UI elements can render normally
			canvasContext.restore();

			if (tooltipHintToDraw) {
				canvasContext.textAlign = "center";
				DrawText(tooltipHintToDraw, 1200, 920, "Black", "Gray");
			}

		} finally {
			canvasContext.restore();
		}
	}

	/**
	 * Processes click events within the settings screen.
	 * Determines element intersections, updates internal configuration states, 
	 * handles interdependent setting logic, and commits changes.
	 */
	public click(): void {
		const { MouseIn, PreferenceSubscreenExtensionsClear, CommonSetScreen } = window as any;

		if (MouseIn(1815, 75, 90, 90)) {
			PreferenceSubscreenExtensionsClear?.();
			return;
		}

		const isInChatRoom = typeof ChatRoomData !== "undefined" && ChatRoomData !== null;
		if (MouseIn(1710, 75, 90, 90) && isInChatRoom) {
			if (typeof CommonSetScreen === "function") CommonSetScreen("Online", "ChatRoom");
			PreferenceSubscreenExtensionsClear?.();
			(window as any).PreferenceMessage = "";
			return;
		}

		if (MouseIn(1815, 200, 90, 90)) {
			this.scrollOffset = Math.max(0, this.scrollOffset - this.SCROLL_STEP);
			return;
		}
		if (MouseIn(1815, 800, 90, 90)) {
			this.scrollOffset = Math.min(this.MAX_SCROLL, this.scrollOffset + this.SCROLL_STEP);
			return;
		}

		for (const element of this.elements) {
			const isRightColumn = element.category === "Immersion" || element.category === "Maps";
			const columnX = isRightColumn ? this.RIGHT_COL_X : this.LEFT_COL_X;
			const checkboxX = columnX + this.CHECKBOX_X_OFFSET;
			const renderPositionY = element.yPos - this.scrollOffset;

			const isManuallyDisabled = typeof element.grayedOut === 'function' ? element.grayedOut() : element.grayedOut;
			const isHardcoreLocked = this.isSettingLocked(element);

			// Skip interaction checks if the element is conceptually locked or physically outside the visible clipped area
			if (isManuallyDisabled || isHardcoreLocked || renderPositionY < 180 || renderPositionY > 900) continue;

			if (element.type === 'Checkbox') {
				if (MouseIn(checkboxX, renderPositionY - 32, 450, 64)) {
					const settingsKey = element.setting as keyof CRABS_Settings;
					(this.data as any)[settingsKey] = !(this.data as any)[settingsKey];

					// Interdependent setting enforcement
					if (settingsKey === "disableDrawer" && this.data.disableDrawer) {
						this.data.rosterOpensDrawer = false;
						this.data.hideDrawerTab = false;
					}
					if (settingsKey === "rosterOpensDrawer" && !this.data.rosterOpensDrawer) {
						this.data.hideDrawerTab = false;
					}

					this.save();
					this.syncGameState();
					return;
				}
			} else if (element.type === 'Cycle') {
				const buttonWidth = 140;
				const buttonHeight = 44;
				const cycleButtonX = columnX + 450;

				if (MouseIn(cycleButtonX, renderPositionY - (buttonHeight / 2), buttonWidth, buttonHeight)) {
					const settingsKey = element.setting as keyof CRABS_Settings;
					const cycleOptionsArray = element.cycleOptions as string[];
					const currentIndex = cycleOptionsArray.indexOf(this.data[settingsKey] as unknown as string);

					let nextIndex = currentIndex + 1;
					if (nextIndex >= cycleOptionsArray.length) nextIndex = 0;

					(this.data as any)[settingsKey] = cycleOptionsArray[nextIndex];
					this.save();
					return;
				}
			}
		}
	}

	/**
	 * Hooks the settings subscreen into the base game's preference menu system.
	 * Utilizes a recursive timeout check to ensure the base game API is fully loaded before injection.
	 */
	private registerExtension(): void {
		const globalWindow = window as any;
		CRABS_Base.subscreenDef = {
			Identifier: "CRABS", ButtonText: "CRABS",
			Image: "https://sin-1337.github.io/CRABS/images/CRABS_Logo.png",
			click: () => this.click(), run: () => this.draw(),
			exit: () => {
				globalWindow.PreferenceMessage = "";
				globalWindow.PreferenceSubscreenExtensionsClear?.();
				globalWindow.PreferenceOpenSubscreen?.("Extensions");
				return false;
			},
			load: () => { globalWindow.PreferenceMessage = ""; }
		};

		const registerHook = () => {
			if (globalWindow.PreferenceRegisterExtensionSetting) {
				globalWindow.PreferenceRegisterExtensionSetting(CRABS_Base.subscreenDef);
			} else {
				setTimeout(registerHook, 1000);
			}
		};
		registerHook();
	}

	/**
	 * Pushes specific configuration states directly into the base game's active variables.
	 * Built to yield control gracefully if another script is actively managing the same parameters.
	 */
	public syncGameState(): void {
		const perceptionValue = (window as any).ChatRoomMapViewPerceptionRangeMax;

		// Yield control if the variable is defined and currently set to a custom value outside our known defaults
		if (perceptionValue !== undefined && perceptionValue !== 7 && perceptionValue !== 50) return;

		(window as any).ChatRoomMapViewPerceptionRangeMax = this.data.mapSuperZoom ? 50 : 7;
	}
}
