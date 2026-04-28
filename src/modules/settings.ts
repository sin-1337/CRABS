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
	highlightMentions: true,
	customHighlightWords: "",
};

// Define the types of UI controls we support
type ComponentType = "Checkbox" | "TextInput";
type ComponentCategory = "General" | "Drawer" | "Immersion" | "Maps" | "Chat";

// The master interface for a declarative setting
interface UIComponent {
	category: ComponentCategory;
	type: ComponentType;
	setting: keyof CRABS_Settings;
	label: string;
	hint: string;
	indent?: number;
	disabled?: () => boolean;
	onChange?: (newValue: any) => void;
}

/**
 * Class representing the mod settings menu and configuration manager.
 * Handles rendering, user interaction, and data persistence for mod preferences.
 */
export class Settings extends CRABS_Base {
	public static instance: Settings;
	public data: CRABS_Settings;

	/** Our declarative list of settings */
	private registry: UIComponent[] = [];

	private readonly STORAGE_KEY = "CRABS_Settings";
	private readonly LEFT_COL_X = 550;
	private readonly RIGHT_COL_X = 1250;
	private readonly CHECKBOX_X_OFFSET = 30;
	private readonly LABEL_X_OFFSET = 120;
	private readonly INDENT_WIDTH = 40;
	private readonly ROW_HEIGHT = 75;

	private scrollOffset: number = 0;
	private readonly MAX_SCROLL: number = 800;
	private readonly SCROLL_STEP: number = 100;
	private isMenuOpen: boolean = false;

	constructor(CRABS: ModSDKModAPI) {
		super(CRABS);
		Settings.instance = this;
		this.data = this.load();
		this.buildRegistry();
		this.registerExtension();

		window.addEventListener("wheel", this.handleWheel, { passive: false });
	}

	private load(): CRABS_Settings {
		const savedData = localStorage.getItem(this.STORAGE_KEY);
		if (savedData) {
			try { return { ...DEFAULT_SETTINGS, ...JSON.parse(savedData) }; }
			catch (error) { console.error("CRABS: Load failed", error); }
		}
		return { ...DEFAULT_SETTINGS };
	}

	public save(): void {
		localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
	}

	private isRestricted(): boolean {
		return (window as any).Player?.IsRestrained?.() || false;
	}

	/**
	 * Determines if a specific UI element should be locked based on hardcore immersion rules.
	 */
	private isSettingLocked(comp: UIComponent): boolean {
		if (!this.isRestricted() || !this.data.lockImmersive) return false;
		if (comp.setting === "lockImmersive") return true;
		if (comp.category === "Immersion" && this.data[comp.setting as keyof CRABS_Settings] === true) return true;

		// Also check manual disables
		if (comp.disabled && comp.disabled()) return true;

		return false;
	}

	private handleWheel = (event: WheelEvent): void => {
		if (!this.isMenuOpen) return;
		const globalWindow = window as any;
		if (globalWindow.MouseX >= 500 && globalWindow.MouseX <= 1780 && globalWindow.MouseY >= 180 && globalWindow.MouseY <= 900) {
			if (event.cancelable) event.preventDefault();
			if (event.deltaY > 0) this.scrollOffset = Math.min(this.MAX_SCROLL, this.scrollOffset + this.SCROLL_STEP);
			else if (event.deltaY < 0) this.scrollOffset = Math.max(0, this.scrollOffset - this.SCROLL_STEP);
		}
	};

	/**
	 * The Declarative Settings Engine. 
	 * Add, remove, or reorder settings here and the UI will automatically calculate the math!
	 */
	private buildRegistry(): void {
		const isDrawerDisabled = () => !this.data.enableDrawer;

		// --- GENERAL ---
		this.register({ category: "General", type: "Checkbox", setting: "showBanner", label: "Show Banner on Entry", hint: "Display info banner on room join." });
		this.register({ category: "General", type: "Checkbox", setting: "checkForUpdates", label: "Notify me about updates", hint: "Periodically check for CRABS updates, and notify me." });

		// --- DRAWER ---
		this.register({
			category: "Drawer", type: "Checkbox", setting: "enableDrawer", label: "Enable Drawer UI", hint: "Enable the sliding drawer interface on the edge of the screen.",
			onChange: (enabled) => {
				if (!enabled) {
					this.data.rosterOpensDrawer = false;
					this.data.showDrawerTab = false;
				}
			}
		});
		this.register({
			category: "Drawer", type: "Checkbox", setting: "rosterOpensDrawer", label: "/roster toggles drawer", hint: "Toggle drawer via /roster or /crabs commands.", indent: 1, disabled: isDrawerDisabled,
			onChange: (enabled) => { if (!enabled) this.data.showDrawerTab = true; }
		});
		this.register({
			category: "Drawer", type: "Checkbox", setting: "showDrawerTab", label: "Show Drawer Tab", hint: "Display the CRABS drawer tab on the edge of the screen.", indent: 2,
			disabled: () => isDrawerDisabled() || !this.data.rosterOpensDrawer,
			onChange: (enabled) => { if (!enabled) this.data.animatedCrabsLogo = false; }
		});
		this.register({ category: "Drawer", type: "Checkbox", setting: "animatedCrabsLogo", label: "Animated Tab Logo", hint: "Use the animated logo when performance is optimal.", indent: 3, disabled: () => isDrawerDisabled() || !this.data.showDrawerTab });
		this.register({ category: "Drawer", type: "Checkbox", setting: "compactDrawer", label: "Compact Height", hint: "Drawer has a 77% height limit.", indent: 1, disabled: isDrawerDisabled });
		this.register({ category: "Drawer", type: "Checkbox", setting: "closeDrawerOnWhisper", label: "Auto-stow on Whisper+", hint: "Close drawer after sending a whisper+ message.", indent: 1, disabled: isDrawerDisabled });
		this.register({ category: "Drawer", type: "Checkbox", setting: "closeDrawerOnChat", label: "Auto-stow on Chat", hint: "Close drawer after sending a message.", indent: 1, disabled: isDrawerDisabled });
		this.register({ category: "Drawer", type: "Checkbox", setting: "pageFocusHover", label: "Focus follows mouse", hint: "When you mouse over a player's card, change the page they are on.", indent: 1, disabled: isDrawerDisabled });

		// --- IMMERSION ---
		this.register({ category: "Immersion", type: "Checkbox", setting: "lockImmersive", label: "Hardcore Lock", hint: "Locks settings ON while bound." });
		this.register({ category: "Immersion", type: "Checkbox", setting: "immersiveBlind", label: "Respect Blindness", hint: "Blurred roster when blind." });
		this.register({ category: "Immersion", type: "Checkbox", setting: "immersiveGag", label: "Respect Gags", hint: "No Whisper+ when gagged." });
		this.register({ category: "Immersion", type: "Checkbox", setting: "respectBcxRules", label: "Respect BCX Rules", hint: "BCX integration." });

		// --- MAPS ---
		this.register({ category: "Maps", type: "Checkbox", setting: "showMapCompass", label: "Show Map Compass", hint: "Show a directional arrow on map." });
		this.register({
			category: "Maps", type: "Checkbox", setting: "mapSuperZoom", label: "SuperZoom", hint: "Unlock map zoom limits.",
			disabled: () => {
				const perceptionValue = (window as any).ChatRoomMapViewPerceptionRangeMax;
				return perceptionValue !== undefined && perceptionValue !== 7 && perceptionValue !== 50;
			}
		});

		// --- CHAT ---
		this.register({ category: "Chat", type: "Checkbox", setting: "highlightMentions", label: "Highlight Mentions", hint: "Highlights chat messages containing your name or nickname." });
		this.register({
			category: "Chat", type: "TextInput", setting: "customHighlightWords", label: "Custom", hint: "Comma-separated list of extra words to trigger highlights.", indent: 1,
			disabled: () => !this.data.highlightMentions
		});
	}

	private register(component: UIComponent): void {
		this.registry.push(component);
	}

	/**
	 * Auto-calculates layout and renders components sequentially.
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

			// Track Y positions dynamically
			let currentLeftY = 200 - this.scrollOffset;
			let currentRightY = 200 - this.scrollOffset;
			let tooltipHintToDraw = "";

			const categories: ComponentCategory[] = ["General", "Drawer", "Immersion", "Maps", "Chat"];

			for (const cat of categories) {
				const isRightColumn = cat === "Immersion" || cat === "Maps" || cat === "Chat";
				const baseX = isRightColumn ? this.RIGHT_COL_X : this.LEFT_COL_X;
				let currentY = isRightColumn ? currentRightY : currentLeftY;

				const categoryComponents = this.registry.filter(comp => comp.category === cat);
				if (categoryComponents.length === 0) continue;

				// Auto-calculate the height of the dark background box based on the number of items!
				const boxHeight = (categoryComponents.length * this.ROW_HEIGHT) + 40;
				DrawRect(baseX - 20, currentY, 650, boxHeight, "#00000011");

				canvasContext.textAlign = "center";
				DrawText(cat, baseX + 305, currentY + 20, "Black", "Gray");

				// Start drawing items slightly below the header
				currentY += 60;

				for (const comp of categoryComponents) {
					const indentShift = (comp.indent || 0) * this.INDENT_WIDTH;
					const finalCheckboxX = baseX + this.CHECKBOX_X_OFFSET + indentShift;
					const finalTextX = baseX + this.LABEL_X_OFFSET + indentShift;

					const isLocked = this.isSettingLocked(comp);

					if (currentY > 180 && currentY < 900) {

						if (comp.type === 'Checkbox') {
							DrawCheckbox(finalCheckboxX, currentY - 32, 64, 64, "", this.data[comp.setting], isLocked);
							canvasContext.textAlign = "left";
							DrawText(comp.label, finalTextX, currentY, isLocked ? "#888888" : "Black", "");

							if (MouseIn(finalTextX, currentY - 18, 450, 36) || MouseIn(finalCheckboxX, currentY - 32, 64, 64)) {
								tooltipHintToDraw = comp.hint;
								if (comp.setting === "mapSuperZoom" && isLocked) tooltipHintToDraw = "Disabled: Another mod or script is controlling this setting.";
							}
						}
						else if (comp.type === 'TextInput') {
							canvasContext.textAlign = "left";
							DrawText(comp.label, finalTextX, currentY, isLocked ? "#888888" : "Black", "");

							if (!isLocked && this.isMenuOpen) {
								const inputWidth = 260;
								const textWidth = canvasContext.measureText(comp.label).width;
								const centerX = finalTextX + textWidth + 20 + (inputWidth / 2);
								(window as any).ElementPosition(`CRABS_Input_${comp.setting}`, centerX, currentY, inputWidth, 36);
							} else {
								(window as any).ElementPosition(`CRABS_Input_${comp.setting}`, -1000, -1000, 0, 0);
							}

							if (MouseIn(finalTextX, currentY - 18, 450, 36)) {
								tooltipHintToDraw = comp.hint;
							}
						}
					}
					currentY += this.ROW_HEIGHT;
				}

				// Push the next category down dynamically!
				if (isRightColumn) currentRightY += boxHeight + 20;
				else currentLeftY += boxHeight + 20;
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
	 * Auto-calculates hitboxes and fires declarative hooks.
	 */
	public click(): void {
		const { MouseIn, PreferenceSubscreenExtensionsClear, CommonSetScreen } = window as any;

		if (MouseIn(1815, 75, 90, 90) || (MouseIn(1710, 75, 90, 90) && ChatRoomData)) {
			this.isMenuOpen = false;
			this.cleanupDOMInputs();
			if (MouseIn(1710, 75, 90, 90)) CommonSetScreen("Online", "ChatRoom");
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

		let currentLeftY = 200 - this.scrollOffset;
		let currentRightY = 200 - this.scrollOffset;
		const categories: ComponentCategory[] = ["General", "Drawer", "Immersion", "Maps", "Chat"];

		for (const cat of categories) {
			const isRightColumn = cat === "Immersion" || cat === "Maps" || cat === "Chat";
			const baseX = isRightColumn ? this.RIGHT_COL_X : this.LEFT_COL_X;
			let currentY = isRightColumn ? currentRightY : currentLeftY;

			const categoryComponents = this.registry.filter(comp => comp.category === cat);
			if (categoryComponents.length === 0) continue;

			const boxHeight = (categoryComponents.length * this.ROW_HEIGHT) + 40;
			currentY += 60;

			for (const comp of categoryComponents) {
				const indentShift = (comp.indent || 0) * this.INDENT_WIDTH;
				const finalCheckboxX = baseX + this.CHECKBOX_X_OFFSET + indentShift;

				if (!this.isSettingLocked(comp) && currentY > 180 && currentY < 900) {
					if (comp.type === 'Checkbox') {
						if (MouseIn(finalCheckboxX, currentY - 32, 450, 64)) {
							const newValue = !(this.data as any)[comp.setting];
							(this.data as any)[comp.setting] = newValue;

							// Fire the declarative hook if it exists!
							if (comp.onChange) comp.onChange(newValue);

							this.save();
							this.syncGameState();
							return; // Stop checking clicks
						}
					}
				}
				currentY += this.ROW_HEIGHT;
			}
			if (isRightColumn) currentRightY += boxHeight + 20;
			else currentLeftY += boxHeight + 20;
		}
	}

	/** Helper method to dynamically destroy all HTML inputs */
	private cleanupDOMInputs(): void {
		const textInputs = this.registry.filter(c => c.type === "TextInput");
		for (const input of textInputs) {
			(window as any).ElementRemove?.(`CRABS_Input_${input.setting}`);
		}
	}

	private registerExtension(): void {
		const globalWindow = window as any;
		CRABS_Base.subscreenDef = {
			Identifier: "CRABS", ButtonText: "CRABS",
			Image: "https://sin-1337.github.io/CRABS/images/CRABS_Logo.png",
			click: () => this.click(), run: () => this.draw(),
			exit: () => {
				this.isMenuOpen = false;
				this.cleanupDOMInputs(); // Loops through all inputs automatically
				globalWindow.PreferenceMessage = "";
				globalWindow.PreferenceSubscreenExtensionsClear?.();
				globalWindow.PreferenceOpenSubscreen?.("Extensions");
				return false;
			},
			load: () => {
				this.isMenuOpen = true;
				globalWindow.PreferenceMessage = "";

				// Dynamically spawn HTML inputs for any TextInput component
				const textInputs = this.registry.filter(c => c.type === "TextInput");
				for (const comp of textInputs) {
					const domID = `CRABS_Input_${comp.setting}`;
					if (!document.getElementById(domID)) {
						globalWindow.ElementCreateInput(domID, "text", this.data[comp.setting] || "", 250);
						const inputHTML = document.getElementById(domID) as HTMLInputElement;
						if (inputHTML) {
							inputHTML.addEventListener("input", () => {
								(this.data as any)[comp.setting] = inputHTML.value;
								this.save();
							});
						}
					}
				}
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

	public syncGameState(): void {
		const perceptionValue = (window as any).ChatRoomMapViewPerceptionRangeMax;
		if (perceptionValue !== undefined && perceptionValue !== 7 && perceptionValue !== 50) return;
		(window as any).ChatRoomMapViewPerceptionRangeMax = this.data.mapSuperZoom ? 50 : 7;
	}
}
