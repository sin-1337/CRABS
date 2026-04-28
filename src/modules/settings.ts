/**
 * CRABS Settings Module
 *
 * Provides the configuration UI for the CRABS mod.
 *
 * Responsibilities:
 * - Render settings UI
 * - Handle user interaction
 * - Persist settings to localStorage
 * - Maintain logical relationships between settings
 */

import { CRABS_Base } from "./base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";

/** Default configuration values applied when no saved data exists */
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
	highlightMentions: true,
	customHighlightWords: "",
	highlightColor: "#FFFF00",
};

/** Supported UI component types */
type ComponentType = "Checkbox" | "TextInput" | "ColorPicker";

/** Logical grouping categories */
type ComponentCategory = "General" | "Drawer" | "Immersion" | "Maps" | "Chat";

/**
 * Declarative definition of a UI component
 */
interface UIComponent {
	category: ComponentCategory;
	type: ComponentType;
	setting: keyof CRABS_Settings;
	label: string;
	hint: string;
	indent?: number;
	disabled?: () => boolean;
	onChange?: (value: any) => void;
}

/**
 * Settings manager class
 */
export class Settings extends CRABS_Base {
	public static instance: Settings;
	public data: CRABS_Settings;

	private readonly STORAGE_KEY = "CRABS_Settings";

	// Layout constants
	private readonly LEFT_COLUMN_X = 550;
	//	private readonly RIGHT_COLUMN_X = 1250;
	private readonly CHECKBOX_OFFSET_X = 30;
	private readonly LABEL_OFFSET_X = 120;
	private readonly INDENT_WIDTH = 40;
	private readonly ROW_HEIGHT = 75;

	private scrollOffset: number = 0;
	private readonly MAX_SCROLL: number = 800;
	private readonly SCROLL_STEP: number = 100;

	private isMenuOpen: boolean = false;

	/**
	 * Declarative registry of all settings
	 */
	private registry: UIComponent[] = [];

	/**
	 * Creates a new Settings instance
	 * @param CRABS The mod API instance
	 */
	constructor(CRABS: ModSDKModAPI) {
		super(CRABS);
		Settings.instance = this;

		this.data = this.load();
		this.buildRegistry();
		this.registerExtension();

		window.addEventListener("wheel", this.handleMouseWheelScroll, { passive: false });
	}

	/**
	 * Loads settings from localStorage and merges with defaults
	 * @returns The loaded settings object
	 */
	private load(): CRABS_Settings {
		const savedSettings = localStorage.getItem(this.STORAGE_KEY);

		if (savedSettings) {
			try {
				return { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
			} catch (error) {
				console.error("CRABS: Failed to load settings", error);
			}
		}

		return { ...DEFAULT_SETTINGS };
	}

	/**
	 * Saves current settings to localStorage
	 */
	public save(): void {
		localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
	}

	/**
	 * Determines whether the player is currently restrained
	 * @returns True if the player is restrained
	 */
	private isPlayerRestrained(): boolean {
		return (window as any).Player?.IsRestrained?.() || false;
	}

	/**
	 * Determines if a setting should be locked (disabled)
	 * @param component The UI component being evaluated
	 * @returns True if the setting is locked
	 */
	private isSettingLocked(component: UIComponent): boolean {
		if (component.disabled && component.disabled()) return true;

		if (this.isPlayerRestrained() && this.data.lockImmersive) {
			if (component.setting === "lockImmersive") return true;

			if (
				component.category === "Immersion" &&
				this.data[component.setting as keyof CRABS_Settings] === true
			) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Handles mouse wheel scrolling within the settings UI
	 * @param event The wheel event
	 */
	private handleMouseWheelScroll = (event: WheelEvent): void => {
		if (!this.isMenuOpen) return;

		const globalWindow = window as any;

		if (
			globalWindow.MouseX >= 500 &&
			globalWindow.MouseX <= 1780 &&
			globalWindow.MouseY >= 180 &&
			globalWindow.MouseY <= 900
		) {
			if (event.cancelable) event.preventDefault();

			if (event.deltaY > 0) {
				this.scrollOffset = Math.min(this.MAX_SCROLL, this.scrollOffset + this.SCROLL_STEP);
			} else {
				this.scrollOffset = Math.max(0, this.scrollOffset - this.SCROLL_STEP);
			}
		}
	};

	/**
	 * Builds the declarative registry of UI components
	 */
	private buildRegistry(): void {
		const isDrawerDisabled = () => !this.data.enableDrawer;

		this.registry.push(
			{
				category: "General",
				type: "Checkbox",
				setting: "showBanner",
				label: "Show Banner on Entry",
				hint: "Display info banner on room join."
			},
			{
				category: "General",
				type: "Checkbox",
				setting: "checkForUpdates",
				label: "Notify me about updates",
				hint: "Check for updates."
			},

			{
				category: "Drawer",
				type: "Checkbox",
				setting: "enableDrawer",
				label: "Enable Drawer UI",
				hint: "Enable drawer interface.",
				onChange: (enabled) => {
					if (!enabled) {
						this.data.rosterOpensDrawer = false;
						this.data.showDrawerTab = false;
					}
				}
			},
			{
				category: "Drawer",
				type: "Checkbox",
				setting: "rosterOpensDrawer",
				label: "/roster toggles drawer",
				hint: "Toggle drawer via command.",
				indent: 1,
				disabled: isDrawerDisabled
			},
			{
				category: "Drawer",
				type: "Checkbox",
				setting: "showDrawerTab",
				label: "Show Drawer Tab",
				hint: "Display drawer tab.",
				indent: 2,
				disabled: () => isDrawerDisabled() || !this.data.rosterOpensDrawer
			},
			{
				category: "Drawer",
				type: "Checkbox",
				setting: "animatedCrabsLogo",
				label: "Animated Tab Logo",
				hint: "Animated logo.",
				indent: 3,
				disabled: () => isDrawerDisabled() || !this.data.showDrawerTab
			}
		);
	}

	/**
	 * Draws the settings UI
	 */
	public draw(): void {
		const globalWindow = window as any;

		const {
			DrawText,
			DrawCheckbox,
			DrawCharacter,
			DrawRect,
			DrawButton,
			Player
		} = globalWindow;

		const canvasElement = document.getElementById("MainCanvas") as HTMLCanvasElement;
		const canvasContext = canvasElement?.getContext("2d");
		if (!canvasContext) return;

		canvasContext.save();

		try {
			DrawRect(40, 40, 420, 920, "#222222aa");
			DrawCharacter(Player, 50, 50, 0.9);

			canvasContext.textAlign = "center";
			canvasContext.textBaseline = "middle";

			DrawText("- CRABS Mod Settings -", 1200, 80, "Black", "Gray");

			DrawButton(1815, 75, 90, 90, "", "White", "Icons/Exit.png", "Back");

			let currentLeftColumnY = 200 - this.scrollOffset;

			for (const component of this.registry) {
				const indentOffset = (component.indent || 0) * this.INDENT_WIDTH;

				const checkboxX = this.LEFT_COLUMN_X + this.CHECKBOX_OFFSET_X + indentOffset;
				const labelX = this.LEFT_COLUMN_X + this.LABEL_OFFSET_X + indentOffset;

				const isLocked = this.isSettingLocked(component);

				DrawCheckbox(
					checkboxX,
					currentLeftColumnY - 32,
					64,
					64,
					"",
					this.data[component.setting],
					isLocked
				);

				canvasContext.textAlign = "left";

				DrawText(
					component.label,
					labelX,
					currentLeftColumnY,
					isLocked ? "#888888" : "Black",
					""
				);

				currentLeftColumnY += this.ROW_HEIGHT;
			}
		} finally {
			canvasContext.restore();
		}
	}

	/**
	 * Handles click interactions within the UI
	 */
	public click(): void {
		const globalWindow = window as any;

		let currentLeftColumnY = 200 - this.scrollOffset;

		for (const component of this.registry) {
			const indentOffset = (component.indent || 0) * this.INDENT_WIDTH;
			const checkboxX = this.LEFT_COLUMN_X + this.CHECKBOX_OFFSET_X + indentOffset;

			if (!this.isSettingLocked(component)) {
				if (globalWindow.MouseIn(checkboxX, currentLeftColumnY - 32, 450, 64)) {
					const newValue = !this.data[component.setting];

					(this.data as any)[component.setting] = newValue;

					if (component.onChange) {
						component.onChange(newValue);
					}

					this.save();
					return;
				}
			}

			currentLeftColumnY += this.ROW_HEIGHT;
		}
	}

	/**
	 * Registers the settings UI with the game
	 */
	private registerExtension(): void {
		const globalWindow = window as any;

		CRABS_Base.subscreenDef = {
			Identifier: "CRABS",
			ButtonText: "CRABS",
			Image: "https://sin-1337.github.io/CRABS/images/CRABS_Logo.png",

			click: () => this.click(),
			run: () => this.draw(),

			load: () => {
				this.isMenuOpen = true;
			},

			exit: () => {
				this.isMenuOpen = false;
				globalWindow.PreferenceSubscreenExtensionsClear?.();
				return false;
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
}
