/**
 * CRABS Settings Module
 *
 * This module implements the configuration interface for the CRABS mod.
 * It provides:
 * - A custom in-game preference subscreen
 * - Persistent storage of user configurations
 * - Dynamic UI generation for various setting types (checkboxes, cycle buttons)
 * - Visual hierarchy via indentation for dependent settings
 * - State synchronization with base game variables
 */

import { CRABS_Base } from "./base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";

/** Default configuration values applied if no local storage data is found. */
const DEFAULT_SETTINGS: CRABS_Settings = {
	showBanner: true,
	checkForUpdates: true,
	rosterOpensDrawer: true,
	showDrawerTab: true,
	immersiveBlind: false,
	immersiveGag: false,
	respectBcxRules: false,
	compactDrawer: true,
	closeDrawerOnWhisper: false,
	closeDrawerOnChat: false,
	enableDrawer: true,
	lockImmersive: false,
	showMapCompass: true,
	mapSuperZoom: false,
	pageFocusHover: true,
	animatedCrabsLogo: true,
	highlightMentions: true, // <-- NEW SETTING
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
	private readonly INDENT_WIDTH = 40;

	private scrollOffset: number = 0;
	private readonly MAX_SCROLL: number = 700; // Bumped up slightly to accommodate the new column length
	private readonly SCROLL_STEP: number = 100;
	private isMenuOpen: boolean = false;

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

		window.addEventListener("wheel", this.handleWheel, { passive: false });
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
		if (!this.isMenuOpen) return;

		const globalWindow = window as any;

		if (globalWindow.MouseX >= 500 && globalWindow.MouseX <= 1780 && globalWindow.MouseY >= 180 && globalWindow.MouseY <= 900) {
			if (event.cancelable) event.preventDefault();

			if (event.deltaY > 0) {
				this.scrollOffset = Math.min(this.MAX_SCROLL, this.scrollOffset + this.SCROLL_STEP);
			} else if (event.deltaY < 0) {
				this.scrollOffset = Math.max(0, this.scrollOffset - this.SCROLL_STEP);
			}
		}
	};

	/**
	 * Populates the internal element array with the structural definition of 
	 * all setting toggles and buttons, organizing them by category, position, and indentation.
	 */
	private setupUI(): void {
		this.elements = [];

		this.addCheckbox("Show Banner on Entry", "showBanner", "Display info banner on room join.", { category: "General", yPos: 280 });
		this.addCheckbox("Notify me about updates", "checkForUpdates", "Periodically check for CRABS updates, and notify me.", { category: "General", yPos: 355 });

		const isDrawerDisabled = () => !this.data.enableDrawer;

		this.addCheckbox("Enable Drawer UI", "enableDrawer", "Enable the sliding drawer interface on the edge of the screen.", { category: "Drawer", yPos: 500 });

		// Drawer Tabs - Cascading visual hierarchy
		this.addCheckbox("/roster toggles drawer", "rosterOpensDrawer", "Toggle drawer via /roster or /crabs commands.", { category: "Drawer", yPos: 575, grayedOut: isDrawerDisabled, indent: 1 });
		this.addCheckbox("Show Drawer Tab", "showDrawerTab", "Display the CRABS drawer tab on the edge of the screen.", { category: "Drawer", yPos: 650, grayedOut: () => isDrawerDisabled() || !this.data.rosterOpensDrawer, indent: 2 });
		this.addCheckbox("Animated Tab Logo", "animatedCrabsLogo", "Use the animated logo when performance is optimal.", { category: "Drawer", yPos: 725, grayedOut: () => isDrawerDisabled() || !this.data.showDrawerTab, indent: 3 });

		this.addCheckbox("Compact Height", "compactDrawer", "Drawer has a 77% height limit.", { category: "Drawer", yPos: 800, grayedOut: isDrawerDisabled, indent: 1 });
		this.addCheckbox("Auto-stow on Whisper+", "closeDrawerOnWhisper", "Close drawer after sending a whisper+ message.", { category: "Drawer", yPos: 875, grayedOut: isDrawerDisabled, indent: 1 });
		this.addCheckbox("Auto-stow on Chat", "closeDrawerOnChat", "Close drawer after sending a message.", { category: "Drawer", yPos: 950, grayedOut: isDrawerDisabled, indent: 1 });
		this.addCheckbox("Focus follows mouse", "pageFocusHover", "When you mouse over a player's card, change the page they are on.", { category: "Drawer", yPos: 1025, grayedOut: isDrawerDisabled, indent: 1 });

		this.addCheckbox("Hardcore Lock", "lockImmersive", "Locks settings ON while bound.", { category: "Immersion", yPos: 280 });
		this.addCheckbox("Respect Blindness", "immersiveBlind", "Blurred roster when blind.", { category: "Immersion", yPos: 355 });
		this.addCheckbox("Respect Gags", "immersiveGag", "No Whisper+ when gagged.", { category: "Immersion", yPos: 430 });
		this.addCheckbox("Respect BCX Rules", "respectBcxRules", "BCX integration.", { category: "Immersion", yPos: 505 });

		this.addCheckbox("Show Map Compass", "showMapCompass", "Show a directional arrow on map.", { category: "Maps", yPos: 725 });

		const isSuperZoomBlocked = () => {
			const perceptionValue = (window as any).ChatRoomMapViewPerceptionRangeMax;
			return perceptionValue !== undefined && perceptionValue !== 7 && perceptionValue !== 50;
		};
		this.addCheckbox("SuperZoom", "mapSuperZoom", "Unlock map zoom limits.", { category: "Maps", yPos: 800, grayedOut: isSuperZoomBlocked });

		// <-- NEW CHAT CATEGORY -->
		this.addCheckbox("Highlight Mentions", "highlightMentions", "Highlights chat messages containing your name or nickname.", { category: "Chat", yPos: 975 });
	}

	/**
	 * Registers a boolean toggle element to be rendered in the settings view.
	 * @param {string} text - The display label for the setting.
	 * @param {string} setting - The key mapped to CRABS_Settings data property.
	 * @param {string} hint - Tooltip description shown on hover.
	 * @param {any} options - Configuration parameters including category, layout overrides, indentation, and disabling logic.
	 */
	private addCheckbox(text: string, setting: keyof CRABS_Settings & string, hint: string, options?: any) {
		this.elements.push({
			type: 'Checkbox', text, setting, hint,
			yPos: options?.yPos || 280,
			width: this.CHECKBOX_WIDTH, height: this.CHECKBOX_WIDTH,
			category: options?.category,
			grayedOut: options?.grayedOut,
			indent: options?.indent || 0
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

			canvasContext.save();
			canvasContext.beginPath();
			canvasContext.rect(500, 180, 1280, 720);
			canvasContext.clip();

			const leftColumnX = this.LEFT_COL_X - 20;
			const rightColumnX = this.RIGHT_COL_X - 20;
			const currentScrollOffset = this.scrollOffset;

			DrawRect(leftColumnX, 200 - currentScrollOffset, 650, 200, "#00000011"); DrawText("General", leftColumnX + 325, 220 - currentScrollOffset, "Black", "Gray");
			DrawRect(leftColumnX, 420 - currentScrollOffset, 650, 650, "#00000011"); DrawText("Drawer", leftColumnX + 325, 440 - currentScrollOffset, "Black", "Gray");

			DrawRect(rightColumnX, 200 - currentScrollOffset, 650, 375, "#00000011"); DrawText("Immersion", rightColumnX + 325, 220 - currentScrollOffset, "Black", "Gray");
			DrawRect(rightColumnX, 650 - currentScrollOffset, 650, 200, "#00000011"); DrawText("Maps", rightColumnX + 325, 670 - currentScrollOffset, "Black", "Gray");

			// <-- NEW CHAT PANEL -->
			DrawRect(rightColumnX, 900 - currentScrollOffset, 650, 200, "#00000011"); DrawText("Chat", rightColumnX + 325, 920 - currentScrollOffset, "Black", "Gray");

			let tooltipHintToDraw = "";

			for (const element of this.elements) {
				const isRightColumn = element.category === "Immersion" || element.category === "Maps" || element.category === "Chat";
				const columnX = isRightColumn ? this.RIGHT_COL_X : this.LEFT_COL_X;

				// Calculate horizontal shifts based on assigned indentation level
				const indentShift = (element.indent || 0) * this.INDENT_WIDTH;
				const finalCheckboxX = columnX + this.CHECKBOX_X_OFFSET + indentShift;
				const finalTextX = columnX + this.LABEL_X_OFFSET + indentShift;

				const renderPositionY = element.yPos - currentScrollOffset;

				const isManuallyDisabled = typeof element.grayedOut === 'function' ? element.grayedOut() : element.grayedOut;
				const isHardcoreLocked = this.isSettingLocked(element);
				const isElementLocked = isManuallyDisabled || isHardcoreLocked;

				if (element.type === 'Checkbox') {
					DrawCheckbox(finalCheckboxX, renderPositionY - 32, 64, 64, "", this.data[element.setting as keyof CRABS_Settings], isElementLocked);
					canvasContext.textAlign = "left";
					DrawText(element.text, finalTextX, renderPositionY, isElementLocked ? "#888888" : "Black", "");

					if (MouseIn(finalTextX, renderPositionY - 18, 450, 36) || MouseIn(finalCheckboxX, renderPositionY - 32, 64, 64)) {
						tooltipHintToDraw = element.hint;
						if (element.setting === "mapSuperZoom" && isManuallyDisabled) {
							tooltipHintToDraw = "Disabled: Another mod or script is controlling this setting.";
						}
					}
				}
			}
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
			this.isMenuOpen = false;
			PreferenceSubscreenExtensionsClear?.();
			return;
		}

		const isInChatRoom = typeof ChatRoomData !== "undefined" && ChatRoomData !== null;
		if (MouseIn(1710, 75, 90, 90) && isInChatRoom) {
			this.isMenuOpen = false;
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
			const isRightColumn = element.category === "Immersion" || element.category === "Maps" || element.category === "Chat";
			const columnX = isRightColumn ? this.RIGHT_COL_X : this.LEFT_COL_X;

			// Adjust the clickable hitbox region using the same indentation math
			const indentShift = (element.indent || 0) * this.INDENT_WIDTH;
			const finalCheckboxX = columnX + this.CHECKBOX_X_OFFSET + indentShift;

			const renderPositionY = element.yPos - this.scrollOffset;

			const isManuallyDisabled = typeof element.grayedOut === 'function' ? element.grayedOut() : element.grayedOut;
			const isHardcoreLocked = this.isSettingLocked(element);

			if (isManuallyDisabled || isHardcoreLocked || renderPositionY < 180 || renderPositionY > 900) continue;

			if (element.type === 'Checkbox') {
				if (MouseIn(finalCheckboxX, renderPositionY - 32, 450, 64)) {
					const settingsKey = element.setting as keyof CRABS_Settings;
					(this.data as any)[settingsKey] = !(this.data as any)[settingsKey];

					if (settingsKey === "enableDrawer" && !this.data.enableDrawer) {
						this.data.rosterOpensDrawer = false;
						this.data.showDrawerTab = false;
					}
					if (settingsKey === "rosterOpensDrawer" && !this.data.rosterOpensDrawer) {
						this.data.showDrawerTab = true;
					}
					if (settingsKey === "showDrawerTab" && !this.data.showDrawerTab) {
						this.data.animatedCrabsLogo = false;
					}

					this.save();
					this.syncGameState();
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
				this.isMenuOpen = false;
				globalWindow.PreferenceMessage = "";
				globalWindow.PreferenceSubscreenExtensionsClear?.();
				globalWindow.PreferenceOpenSubscreen?.("Extensions");
				return false;
			},
			load: () => {
				this.isMenuOpen = true;
				globalWindow.PreferenceMessage = "";
			}
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
		if (perceptionValue !== undefined && perceptionValue !== 7 && perceptionValue !== 50) return;
		(window as any).ChatRoomMapViewPerceptionRangeMax = this.data.mapSuperZoom ? 50 : 7;
	}
}
