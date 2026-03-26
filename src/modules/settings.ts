import { CRABS_Base } from "./base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";

const DEFAULT_SETTINGS: CRABS_Settings = {
	showBanner: true,
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
};

/**
 * Combined Settings and UI Manager for CRABS.
 */
export class Settings extends CRABS_Base {
	/** Singleton instance of the Settings module. */
	public static instance: Settings;
	/** The current settings data. */
	public data: CRABS_Settings;
	/** List of UI elements to be rendered in the settings screen. */
	private elements: UIElement[] = [];
	/** Key used for storing settings in local storage. */
	private readonly STORAGE_KEY = "CRABS_Settings";

	// Layout Constants
	/** X coordinate for the left column of settings. */
	private readonly LEFT_COL_X = 550;
	/** X coordinate for the right column of settings. */
	private readonly RIGHT_COL_X = 1250;
	/** X offset for checkboxes within a column. */
	private readonly CHECKBOX_X_OFFSET = 30;
	/** X offset for labels within a column. */
	private readonly LABEL_X_OFFSET = 120;
	/** Width and height of checkboxes. */
	private readonly CHECKBOX_WIDTH = 64;
	/** Vertical spacing between settings elements. */
	private readonly SPACING_Y = 75;

	/**
	 * Creates an instance of the Settings module.
	 * 
	 * @param {ModSDKModAPI} CRABS - The ModSDK API instance.
	 */
	constructor(CRABS: ModSDKModAPI) {
		super(CRABS);
		Settings.instance = this;
		this.data = this.load();
		this.setupUI();
		this.registerExtension();
	}

	/**
	 * Loads settings from local storage, falling back to defaults if necessary.
	 * 
	 * @returns {CRABS_Settings} The loaded settings.
	 */
	private load(): CRABS_Settings {
		const saved = localStorage.getItem(this.STORAGE_KEY);
		if (saved) {
			try {
				return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
			} catch (error) {
				console.error("CRABS: Failed to parse settings", error);
			}
		}
		return { ...DEFAULT_SETTINGS };
	}

	/**
	 * Saves the current settings to local storage.
	 * 
	 * @returns {void}
	 */
	public save(): void {
		localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
	}

	/**
	 * Checks if the player is currently restricted (restrained).
	 * 
	 * @returns {boolean} True if restrained, false otherwise.
	 */
	private isRestricted(): boolean {
		return (window as any).Player.IsRestrained?.() || false;
	}

	/**
	 * Initializes the list of UI elements for the settings screen.
	 * 
	 * @returns {void}
	 */
	private setupUI(): void {
		this.elements = [];

		// Category: Banner
		this.addCheckbox(
			"Show Banner on Entry",
			"showBanner",
			"Automatically display the room information banner whenever you join a new chat room.",
			{ category: "Banner" }
		);

		// Category: Drawer
		this.addCheckbox(
			"Disable Drawer UI",
			"disableDrawer",
			"Completely disable the drawer interface and hide the side tab.",
			{ category: "Drawer" }
		);

		const drawerDisabled = () => this.data.disableDrawer;

		this.addCheckbox(
			"/roster toggles drawer",
			"rosterOpensDrawer",
			"The standard /roster command will toggle the drawer instead of printing to chat.",
			{ category: "Drawer", grayedOut: drawerDisabled }
		);
		this.addCheckbox(
			"Hide Drawer Tab",
			"hideDrawerTab",
			"Hide the physical tab on the side of the screen. You can still open the drawer with /roster.",
			{ category: "Drawer", grayedOut: () => drawerDisabled() || !this.data.rosterOpensDrawer }
		);
		this.addCheckbox(
			"Compact Height",
			"compactDrawer",
			"Limit drawer height to 77% so some of the chat remains visible.",
			{ category: "Drawer", grayedOut: drawerDisabled }
		);
		this.addCheckbox(
			"Auto-stow on Whisper+",
			"closeDrawerOnWhisper",
			"Automatically close the drawer after you successfully send a /whisper+ message.",
			{ category: "Drawer", grayedOut: drawerDisabled }
		);
		this.addCheckbox(
			"Auto-stow on Chat",
			"closeDrawerOnChat",
			"Automatically close the drawer when you send a normal chat message.",
			{ category: "Drawer", grayedOut: drawerDisabled }
		);

		// Category: Immersion
		this.addCheckbox(
			"Hardcore Lock",
			"lockImmersive",
			"Locks immersive settings in the ON position while you are bound. You must be free to disable them.",
			{ category: "Immersion", grayedOut: () => this.data.lockImmersive && this.isRestricted() }
		);

		const isLocked = (setting: keyof CRABS_Settings) => {
			return () => this.data.lockImmersive && this.isRestricted() && this.data[setting] === true;
		};

		this.addCheckbox(
			"Respect Blindness",
			"immersiveBlind",
			"Roster visibility will be blurred based on your character's blindness level.",
			{ category: "Immersion", grayedOut: isLocked("immersiveBlind") }
		);
		this.addCheckbox(
			"Respect Gags",
			"immersiveGag",
			"Prevent sending Whisper+ messages if your character is gagged.",
			{ category: "Immersion", grayedOut: isLocked("immersiveGag") }
		);
		this.addCheckbox(
			"Respect BCX Rules",
			"respectBcxRules",
			"Allow supported BCX rules to impact CRABS functionality.",
			{ category: "Immersion", grayedOut: isLocked("respectBcxRules") }
		);
	}

	/**
	 * Calculates the Y position for a new element within a specific category.
	 * 
	 * @param {string} [category] - The category of the setting.
	 * @returns {number} The calculated Y position.
	 */
	private getNewYPos(category?: string): number {
		const catElements = this.elements.filter(element => element.category === category);
		if (catElements.length === 0) {
			if (category === "Banner") return 280;
			if (category === "Drawer") return 425;
			if (category === "Immersion") return 280;
			return 280;
		}
		const lastElement = catElements[catElements.length - 1];
		return lastElement.yPos + this.SPACING_Y;
	}

	/**
	 * Adds a checkbox element to the settings UI list.
	 * 
	 * @param {string} text - The label text for the checkbox.
	 * @param {keyof CRABS_Settings & string} setting - The setting key associated with this checkbox.
	 * @param {string} hint - The tooltip/hint text for the setting.
	 * @param {Partial<CheckboxElement>} [options] - Additional configuration options for the checkbox.
	 * @returns {void}
	 */
	private addCheckbox(text: string, setting: keyof CRABS_Settings & string, hint: string, options?: Partial<CheckboxElement>) {
		const category = options?.category;
		const element: CheckboxElement = {
			type: 'Checkbox',
			text,
			setting,
			hint,
			yPos: this.getNewYPos(category),
			width: this.CHECKBOX_WIDTH,
			height: this.CHECKBOX_WIDTH,
			xModifier: 0,
			yModifier: 0,
			...options
		};
		this.elements.push(element);
	}

	/**
	 * Registers the CRABS settings screen as an extension in the game.
	 * 
	 * @returns {void}
	 */
	private registerExtension(): void {
		// Assign the definition directly to the shared static base property
		CRABS_Base.subscreenDef = {
			Identifier: "CRABS",
			ButtonText: "CRABS",
			Image: "https://sin-1337.github.io/CRABS/images/CRABS_Logo.png",
			click: () => this.click(),
			run: () => this.draw(),
			exit: () => {
				const globalWindow = window as any;
				globalWindow.PreferenceMessage = "";
				if (typeof globalWindow.PreferenceSubscreenExtensionsClear === "function") {
					try { globalWindow.PreferenceSubscreenExtensionsClear(); } catch (error) { }
				}

				// Send the user back to the Extensions menu
				if (typeof globalWindow.PreferenceOpenSubscreen === "function") {
					globalWindow.PreferenceOpenSubscreen("Extensions");
				}
				return false; // Blocks the default exit
			},
			load: () => {
				(window as any).PreferenceMessage = "";
			}
		};

		const waitForFunc = () => {
			const globalWindow = window as any;
			if (typeof globalWindow.PreferenceRegisterExtensionSetting === "function") {
				// Pass the static object to the game
				globalWindow.PreferenceRegisterExtensionSetting(CRABS_Base.subscreenDef);
			} else {
				setTimeout(waitForFunc, 1000);
			}
		};
		waitForFunc();
	}

	/**
	 * Renders the settings screen UI.
	 * 
	 * @returns {void}
	 */
	public draw(): void {
		const isMouseIn = (window as any).MouseIn;
		const DrawText = (window as any).DrawText;
		const DrawCheckbox = (window as any).DrawCheckbox;
		const DrawCharacter = (window as any).DrawCharacter;
		const DrawRect = (window as any).DrawRect;
		const PreferenceMessage = (window as any).PreferenceMessage;
		const DrawButton = (window as any).DrawButton;

		const canvasElement = document.getElementById("MainCanvas") as HTMLCanvasElement;
		const canvasContext = canvasElement ? canvasElement.getContext("2d") : null;
		if (!canvasContext) return;

		// Draw character background card
		DrawRect(40, 40, 420, 920, "#222222aa");
		DrawCharacter((window as any).Player, 50, 50, 0.9);
		canvasContext.textAlign = "center";
		canvasContext.textBaseline = "middle";

		// Main Header
		DrawText("- CRABS Mod Settings -", 1000, 80, "Black", "Gray");
		DrawButton(1815, 75, 90, 90, "", "White", "Icons/Exit.png", "Back to Extensions");

		if (PreferenceMessage && PreferenceMessage !== "") {
			DrawText(PreferenceMessage, 1000, 150, "Red", "Black");
		} else {
			DrawText("Hover setting names for detailed descriptions", 1000, 150, "Black", "Gray");
		}

		const leftCenterX = (this.LEFT_COL_X - 20) + (650 / 2);
		const rightCenterX = (this.RIGHT_COL_X - 20) + (650 / 2);

		// Draw Section Cards
		DrawRect(this.LEFT_COL_X - 20, 200, 650, 125, "#00000011");
		DrawText("Banner Options", leftCenterX, 220, "Black", "Gray");

		DrawRect(this.LEFT_COL_X - 20, 345, 650, 500, "#00000011");
		DrawText("Drawer Options", leftCenterX, 365, "Black", "Gray");

		DrawRect(this.RIGHT_COL_X - 20, 200, 650, 350, "#00000011");
		DrawText("Immersion & Rules", rightCenterX, 220, "Black", "Gray");

		for (const element of this.elements) {
			const isImmersion = element.category === "Immersion";
			const cardX = isImmersion ? this.RIGHT_COL_X : this.LEFT_COL_X;
			const y = element.yPos;
			const checkboxX = cardX + this.CHECKBOX_X_OFFSET;
			const textX = cardX + this.LABEL_X_OFFSET;

			const isGrayedOut = typeof element.grayedOut === 'function' ? element.grayedOut() : element.grayedOut;

			if (element.type === 'Checkbox') {
				DrawCheckbox(checkboxX, y - 32, 64, 64, "", (this.data as any)[element.setting], isGrayedOut);

				// Align left, then use native DrawText so the theme mod can intercept "Black"
				canvasContext.textAlign = "left";
				DrawText(element.text, textX, y, isGrayedOut ? "gray" : "Black", "");

				if (isMouseIn(textX, y - 18, 450, 36) || isMouseIn(checkboxX, y - 32, 64, 64)) {
					canvasContext.textAlign = "center";
					DrawText(element.hint, 1100, 950, "Black", "Gray");
				}
			}
		}

		canvasContext.textAlign = "center";
		canvasContext.textBaseline = "alphabetic";
	}

	/**
	 * Handles click events on the settings screen.
	 * 
	 * @returns {void}
	 */
	public click(): void {
		const isMouseIn = (window as any).MouseIn;

		if (isMouseIn(1815, 75, 90, 90)) {
			(window as any).PreferenceMessage = "";
			(window as any).PreferenceSubscreenExtensionsClear();
			return;
		}

		for (const element of this.elements) {
			const isImmersion = element.category === "Immersion";
			const cardX = isImmersion ? this.RIGHT_COL_X : this.LEFT_COL_X;
			const y = element.yPos;
			const checkboxX = cardX + this.CHECKBOX_X_OFFSET;

			const isGrayedOut = typeof element.grayedOut === 'function' ? element.grayedOut() : element.grayedOut;
			if (isGrayedOut) continue;

			if (isMouseIn(checkboxX, y - 32, 450, 64)) {
				if (element.type === 'Checkbox') {
					(this.data as any)[element.setting] = !(this.data as any)[element.setting];

					if (element.setting === "disableDrawer" && this.data.disableDrawer) {
						this.data.rosterOpensDrawer = false;
						this.data.hideDrawerTab = false;
					}
					if (element.setting === "rosterOpensDrawer" && this.data.rosterOpensDrawer) {
						this.data.disableDrawer = false;
					}

					if (element.setting === "rosterOpensDrawer" && !this.data.rosterOpensDrawer) {
						this.data.hideDrawerTab = false;
					}

					this.save();
				}
				return;
			}
		}
	}
}
