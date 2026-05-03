// src/modules/settings/settings.ts
import { CRABS_Base } from "../base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { CheckboxWidget, InputWidget, ButtonWidget, TextLabelWidget, TextAreaWidget } from "./widgets";
import { LayoutEngine, ConfiguredWidget, ComponentCategory } from "./layout"; // <-- Added ComponentCategory here

const DEFAULT_SETTINGS: any = {
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
	enableFocusHalo: true,
	autoBeepOnLeave: true,
	privacyModeFull: false,
	autoScrollRoster: true,
	chatLogHover: true,
	colorMatchNames: true,
	capitalizeNames: true,
};

export class Settings extends CRABS_Base {
	public static instance: Settings;
	public data: any; // Type as CRABS_Settings

	private layout: LayoutEngine;
	private registry: ConfiguredWidget[] = [];
	private isMenuOpen: boolean = false;
	private showResetConfirm: boolean = false;
	private readonly STORAGE_KEY = "CRABS_Settings";

	constructor(CRABS: ModSDKModAPI) {
		super(CRABS);
		Settings.instance = this;
		this.data = this.load();

		this.buildRegistry();
		this.layout = new LayoutEngine(this.registry);

		this.registerExtension();
		window.addEventListener("wheel", this.handleWheel.bind(this), { passive: false });
	}

	private load(): any {
		const saved = localStorage.getItem(this.STORAGE_KEY);
		return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : { ...DEFAULT_SETTINGS };
	}

	public save(): void {
		localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
	}

	private isRestricted(): boolean { return (window as any).Player?.IsRestrained?.() || false; }

	private buildRegistry(): void {
		const isDrawerDisabled = () => !this.data.enableDrawer;

		const hardcoreLock = (settingName: string) => {
			return this.isRestricted() && this.data.lockImmersive && (settingName === "lockImmersive" || this.data[settingName]);
		};

		// Helper for checkboxes (now includes onChange support)
		const createCheck = (cat: ComponentCategory, setting: string, label: string, hint: string, indent = 0, extraDisable?: () => boolean, onChange?: (val: boolean) => void) => {
			const isDisabled = () => hardcoreLock(setting) || (extraDisable ? extraDisable() : false);
			const getVal = () => this.data[setting];
			const setVal = (val: boolean) => {
				this.data[setting] = val;
				if (onChange) onChange(val);
				this.save();
			};

			this.registry.push({
				category: cat, indent,
				widget: new CheckboxWidget(label, hint, isDisabled, getVal, setVal)
			});
		};

		// Helper for text/color inputs
		const createInput = (cat: ComponentCategory, setting: string, label: string, hint: string, inputType: "text" | "color", indent = 0, extraDisable?: () => boolean) => {
			const isDisabled = () => extraDisable ? extraDisable() : false;
			const getVal = () => this.data[setting];
			const setVal = (val: string) => { this.data[setting] = val; this.save(); };

			this.registry.push({
				category: cat, indent,
				widget: new InputWidget(label, hint, isDisabled, `CRABS_Input_${setting}`, inputType, getVal, setVal)
			});
		};

		// helper for textArea input
		const createTextArea = (cat: ComponentCategory, setting: string, label: string, hint: string, indent = 0, extraDisable?: () => boolean) => {
			const isDisabled = () => extraDisable ? extraDisable() : false;
			const getVal = () => this.data[setting];
			const setVal = (val: string) => { this.data[setting] = val; this.save(); };

			this.registry.push({
				category: cat, indent,
				widget: new TextAreaWidget(label, hint, isDisabled, `CRABS_Input_${setting}`, getVal, setVal)
			});
		};

		// Helper for standard buttons
		const createButton = (cat: ComponentCategory, label: string, hint: string, onClick: () => void, indent = 0) => {
			this.registry.push({
				category: cat, indent,
				widget: new ButtonWidget(label, hint, onClick)
			});
		};

		// Helper to fetch the current keybind string safely
		const getBindString = (bindId: string) => {
			const globalWindow = window as any;
			const bind = globalWindow.KeyManager?.getKeybinding(bindId);

			if (!bind || !bind.keyCombo) return "Unbound";

			const mods = Array.from(bind.keyCombo.modifiers || []).join('+');

			let keyText = "";

			// Check if the game stored a strict browser code (e.g., 'KeyD', 'Space')
			if (bind.keyCombo.key) {
				// Translate it using the game's native dictionary so things like 'Space' format correctly
				if (globalWindow.KeybindingManager && globalWindow.KeybindingManager.ASCIIKeyboardMap) {
					keyText = globalWindow.KeybindingManager.ASCIIKeyboardMap[bind.keyCombo.key];
				}

				// Failsafe string cleanup if the map is ever unavailable
				if (!keyText) {
					keyText = bind.keyCombo.key.replace('Key', '').replace('Digit', '');
				}
			}
			// Check if the game fell back to storing a raw character (e.g., 'd')
			else if (bind.keyCombo.char) {
				keyText = bind.keyCombo.char.toUpperCase();
			}

			if (!keyText && !mods) return "Unbound";

			return mods && keyText ? `${mods}+${keyText}` : (mods || keyText);
		};

		// Helper for labels
		const createLabel = (cat: ComponentCategory, text: string | (() => string), hint: string = "", indent = 0) => {
			this.registry.push({
				category: cat, indent,
				widget: new TextLabelWidget(text, hint)
			});
		};

		// --- GENERAL ---
		createCheck("General", "checkForUpdates", "Notify me about updates", "Periodically check for CRABS updates, and notify me.");
		createCheck("General", "showBanner", "Show Banner on Entry", "Display info banner on room join.");
		createCheck("General", "privacyModeFull", "Full-Screen Privacy Mode", "If enabled, the Privacy Mode hotkey blanks the entire screen instead of just the left side.");
		createCheck("General", "enableFocusHalo", "Enable Focus Halo", "Show a pulsing halo effect on character avatars when you mouse over them in the roster or chat.");
		createButton("General", "Edit Keybinds", "Open the game's Keybindings menu to change the Privacy Mode hotkey.", () => this.openNativeKeybindings());
		createLabel("General", () => `Crabs drawer toggle: ${getBindString("crabs_drawer_toggle")}`, "", 1);
		createLabel("General", () => `Privacy mode: ${getBindString("crabs_privacy_toggle")}`, "", 1);

		// --- DRAWER ---
		createCheck("Drawer", "enableDrawer", "Enable Drawer UI", "Enable the sliding drawer interface on the edge of the screen.", 0, undefined, (enabled) => {
			if (!enabled) {
				this.data.rosterOpensDrawer = false;
				this.data.showDrawerTab = false;
			}
		});
		createCheck("Drawer", "rosterOpensDrawer", "/roster toggles drawer", "Toggle drawer via /roster or /crabs commands.", 1, isDrawerDisabled, (enabled) => {
			if (!enabled) this.data.showDrawerTab = true;
		});
		createCheck("Drawer", "showDrawerTab", "Show Drawer Tab", "Display the CRABS drawer tab on the edge of the screen.", 2, () => isDrawerDisabled() || !this.data.rosterOpensDrawer, (enabled) => {
			if (!enabled) this.data.animatedCrabsLogo = false;
		});
		createCheck("Drawer", "animatedCrabsLogo", "Animated Tab Logo", "Use the animated logo when performance is optimal.", 3, () => isDrawerDisabled() || !this.data.showDrawerTab);
		createCheck("Drawer", "compactDrawer", "Compact Height", "Drawer has a 77% height limit.", 1, isDrawerDisabled);
		createCheck("Drawer", "closeDrawerOnWhisper", "Auto-stow on Whisper+", "Close drawer after sending a whisper+ message.", 1, isDrawerDisabled);
		createCheck("Drawer", "closeDrawerOnChat", "Auto-stow on Chat", "Close drawer after sending a message.", 1, isDrawerDisabled);
		createCheck("Drawer", "pageFocusHover", "Focus follows mouse", "When you mouse over a player's card, change the page they are on.", 1, isDrawerDisabled);
		createCheck("Drawer", "autoScrollRoster", "Auto-Scroll drawer", "Automatically scroll the drawer roster to the character matching the avatar your mouse is over.", 1, isDrawerDisabled);

		// --- IMMERSION ---
		createCheck("Immersion", "lockImmersive", "Hardcore Lock", "Locks settings ON while bound.");
		createCheck("Immersion", "immersiveBlind", "Respect Blindness", "Blurred roster when blind.", 1);
		createCheck("Immersion", "immersiveGag", "Respect Gags", "No Whisper+ when gagged.", 1);
		createCheck("Immersion", "respectBcxRules", "Respect BCX Rules", "BCX integration.", 1);

		// --- MAPS ---
		createCheck("Maps", "showMapCompass", "Show Map Compass", "Show a directional arrow on map.");
		createCheck("Maps", "mapSuperZoom", "SuperZoom", "Unlock map zoom limits.", 0, () => {
			const perceptionValue = (window as any).ChatRoomMapViewPerceptionRangeMax;
			return perceptionValue !== undefined && perceptionValue !== 7 && perceptionValue !== 50;
		});

		// --- CHAT ---
		createCheck("Chat", "highlightMentions", "Highlight Mentions", "Highlights chat messages containing your name or nickname.");
		createCheck("Chat", "capitalizeNames", "Auto-Capitalize Names", "Forces the first letter of your name(s) to be capitalized when highlighted.", 1, () => !this.data.highlightMentions);
		createCheck("Chat", "colorMatchNames", "Inline Name Coloring", "Colors your name in highlighted messages to match your character's actual label color.", 1, () => !this.data.highlightMentions);
		createInput("Chat", "customHighlightWords", "Custom Words", "Comma-separated list of extra words to trigger highlights.", "text", 1, () => !this.data.highlightMentions);
		createTextArea("Chat", "ignorePhrases", "Ignore Phrases", "One phrase per line. Use * as a wildcard (e.g., 'pick* a rose').", 1, () => !this.data.highlightMentions);
		createInput("Chat", "highlightColor", "Highlight Color", "Pick a custom color for chat highlights.", "color", 1, () => !this.data.highlightMentions);
		createCheck("Chat", "chatLogHover", "Chat Log Hover Links", "Mousing over names in the chat log triggers the roster focus halo and map compass.");
		createCheck("Chat", "autoBeepOnLeave", "Whisper+ Autoelevate to Beep", "Attempt to send Whisper+ as a beep if a friend leaves the room before you hit send.");
	}

	private handleWheel(event: WheelEvent): void {
		if (!this.isMenuOpen) return;

		// Ignore the wheel event if the mouse is over an HTML overlay (like the messenger)
		const target = event.target as HTMLElement;
		if (!target || target.id !== "MainCanvas") return;

		const globalWindow = window as any;
		if (globalWindow.MouseX >= 500 && globalWindow.MouseX <= 1780 && globalWindow.MouseY >= 180 && globalWindow.MouseY <= 900) {
			if (event.cancelable) event.preventDefault();
			if (event.deltaY > 0) this.layout.scrollOffset = Math.min(this.layout.maxScroll, this.layout.scrollOffset + 100);
			else if (event.deltaY < 0) this.layout.scrollOffset = Math.max(0, this.layout.scrollOffset - 100);
			this.layout.updateDOM(this.isMenuOpen);
		}
	}

	public draw(): void {
		const canvasContext = (document.getElementById("MainCanvas") as HTMLCanvasElement)?.getContext("2d");
		if (!canvasContext) return;
		const globalWindow = window as any;

		canvasContext.save();
		try {
			this.layout.draw(canvasContext, this.showResetConfirm);

			if (this.showResetConfirm) {
				// Dim the background
				globalWindow.DrawRect(0, 0, 2000, 1000, "#000000AA");

				// Draw the prompt box
				globalWindow.DrawRect(700, 350, 600, 300, "#222222");
				globalWindow.DrawEmptyRect(700, 350, 600, 300, "White");
				canvasContext.textAlign = "center";
				globalWindow.DrawText("Restore Default Settings?", 1000, 430, "White", "");
				globalWindow.DrawButton(750, 500, 200, 60, "Confirm", "White", "");
				globalWindow.DrawButton(1050, 500, 200, 60, "Cancel", "White", "");

				// Re-draw the Exit button brightly on top
				globalWindow.DrawButton(1815, 75, 90, 90, "", "White", "Icons/Exit.png", "Back");

				// Re-draw the Back to Chat button brightly (if they are in a room)
				const isInChat = typeof ChatRoomData !== "undefined" && ChatRoomData !== null;
				globalWindow.DrawButton(1710, 75, 90, 90, "", isInChat ? "White" : "#888888", "Icons/Chat.png", isInChat ? "Return to Chat" : "Not in a Chat Room");

				// Leave the Reset button greyed out
				globalWindow.DrawButton(1605, 75, 90, 90, "", "#888888", "Icons/Reset.png", "Restore Defaults");
			}
		} finally {
			canvasContext.restore();
		}
	}

	public click(): void {
		const globalWindow = window as any;

		// Trap all clicks if the confirmation dialog is open
		if (this.showResetConfirm) {
			if (globalWindow.MouseIn(750, 500, 200, 60)) {
				// User confirmed: Reset everything
				this.data = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
				this.save();
				this.syncGameState();

				for (const key of Object.keys(this.data)) {
					const domElement = document.getElementById(`CRABS_Input_${key}`) as HTMLInputElement;
					if (domElement) domElement.value = this.data[key];
				}

				this.showResetConfirm = false;
				this.layout.updateDOM(this.isMenuOpen);
			} else if (globalWindow.MouseIn(1050, 500, 200, 60)) {
				// User canceled
				this.showResetConfirm = false;
				this.layout.updateDOM(this.isMenuOpen);
			} else if (globalWindow.MouseIn(1815, 75, 90, 90)) {
				// Back to Extensions settings selection
				this.showResetConfirm = false;
				this.isMenuOpen = false;
				this.layout.updateDOM(false);

				for (const key of Object.keys(this.data)) {
					globalWindow.ElementRemove?.(`CRABS_Input_${key}`);
				}

				globalWindow.PreferenceMessage = "";
				globalWindow.PreferenceSubscreenExtensionsClear?.();
				globalWindow.PreferenceOpenSubscreen?.("Extensions");
			} else if (globalWindow.MouseIn(1710, 75, 90, 90) && typeof ChatRoomData !== "undefined" && ChatRoomData !== null) {
				// Back to Chat Room directly
				this.showResetConfirm = false;
				this.isMenuOpen = false;
				this.layout.updateDOM(false);

				for (const key of Object.keys(this.data)) {
					globalWindow.ElementRemove?.(`CRABS_Input_${key}`);
				}

				// Route them to the chat room BEFORE clearing the extensions state
				globalWindow.CommonSetScreen("Online", "ChatRoom");
				globalWindow.PreferenceMessage = "";
				globalWindow.PreferenceSubscreenExtensionsClear?.();
			}
			return; // Stop processing other clicks while modal is open		
		}

		const clickedExit = globalWindow.MouseIn(1815, 75, 90, 90);
		const clickedChat = globalWindow.MouseIn(1710, 75, 90, 90) && typeof ChatRoomData !== "undefined" && ChatRoomData !== null;
		const clickedReset = globalWindow.MouseIn(1605, 75, 90, 90);

		// Open Restore Defaults confirmation
		if (clickedReset) {
			this.showResetConfirm = true;
			this.layout.updateDOM(false); // Hide text inputs so they don't bleed through the dark overlay
			return;
		}

		// Handle native window exit and chat buttons
		if (clickedExit || clickedChat) {
			this.isMenuOpen = false;
			this.layout.updateDOM(false);

			if (clickedChat) {
				globalWindow.CommonSetScreen("Online", "ChatRoom");
			}

			globalWindow.PreferenceSubscreenExtensionsClear?.();
			return;
		}

		// Pass everything else to the Layout engine
		if (this.layout.click(globalWindow.MouseX, globalWindow.MouseY)) {
			this.layout.updateDOM(this.isMenuOpen); // Refresh DOM in case tabs changed
		}
	}

	public syncGameState(): void {
		const perceptionValue = (window as any).ChatRoomMapViewPerceptionRangeMax;
		if (perceptionValue !== undefined && perceptionValue !== 7 && perceptionValue !== 50) return;
		(window as any).ChatRoomMapViewPerceptionRangeMax = this.data.mapSuperZoom ? 50 : 7;
	}

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
				this.showResetConfirm = false;
				this.layout.updateDOM(true);
			},
			exit: () => {
				this.isMenuOpen = false;
				this.layout.updateDOM(false);

				// Destroy all HTML inputs so they don't float over other screens
				for (const key of Object.keys(this.data)) {
					globalWindow.ElementRemove?.(`CRABS_Input_${key}`);
				}

				globalWindow.PreferenceMessage = "";
				globalWindow.PreferenceSubscreenExtensionsClear?.();
				globalWindow.PreferenceOpenSubscreen?.("Extensions");
				return false;
			}
		};

		// Attempt to register the mod settings tab, retry if the game isn't ready
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
	 * Safely closes the CRABS settings menu and opens the base game's Keybindings menu.
	 */
	public openNativeKeybindings(): void {
		const globalWindow = window as any;

		// Standard CRABS cleanup
		this.isMenuOpen = false;
		this.layout.updateDOM(false);
		for (const key of Object.keys(this.data)) {
			globalWindow.ElementRemove?.(`CRABS_Input_${key}`);
		}

		// Remove the native search bar and clear the extension view state
		globalWindow.ElementRemove?.("InputSearch");
		globalWindow.PreferenceMessage = "";
		if (typeof globalWindow.PreferenceSubscreenExtensionsClear === "function") {
			globalWindow.PreferenceSubscreenExtensionsClear();
		}

		// Instead of manually setting the subscreen, use the native opener.
		// This tells the game to switch contexts properly.
		if (typeof globalWindow.PreferenceOpenSubscreen === "function") {
			globalWindow.PreferenceOpenSubscreen("Keybindings");
		} else {
			// Fallback for older versions or if the function is missing
			globalWindow.PreferenceSubscreen = "Keybindings";
			if (typeof globalWindow.PreferenceSubscreenKeybindingsLoad === "function") {
				globalWindow.PreferenceSubscreenKeybindingsLoad();
			}
		}
	}
}

