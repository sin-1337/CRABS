// src/modules/settings/settings.ts
import { CRABS_Base } from "../base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { CheckboxWidget, InputWidget, ButtonWidget, TextLabelWidget, TextAreaWidget } from "./widgets";
import { LayoutEngine, ConfiguredWidget, ComponentCategory } from "./layout";

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
	ignorePhrases: "",
	localOnlyMode: false,
	lastSaved: 0,
};

export class Settings extends CRABS_Base {
	public static instance: Settings;
	public data: any;

	private layout: LayoutEngine;
	private registry: ConfiguredWidget[] = [];
	private isMenuOpen: boolean = false;
	private showResetConfirm: boolean = false;
	private readonly STORAGE_KEY = "CRABS_Settings";

	constructor(CRABS: ModSDKModAPI) {
		super(CRABS);
		Settings.instance = this;

		// 1. Load local synchronously so the UI has immediate data
		this.data = this.loadLocal();

		// 2. Kick off the background server sync
		this.syncFromServer();

		this.buildRegistry();
		this.layout = new LayoutEngine(this.registry);

		this.registerExtension();
		window.addEventListener("wheel", this.handleWheel.bind(this), { passive: false });
	}

	private getStorageKey(): string {
		const memberNumber = (window as any).Player?.MemberNumber;
		return memberNumber ? `${this.STORAGE_KEY}_${memberNumber}` : this.STORAGE_KEY;
	}

	private loadLocal(): any {
		const saved = localStorage.getItem(this.getStorageKey());
		return saved ? this.sanitizeData(JSON.parse(saved)) : { ...DEFAULT_SETTINGS };
	}

	private async syncFromServer(): Promise<void> {
		if (this.data.localOnlyMode) return;

		try {
			const globalWindow = window as any;
			const player = globalWindow.Player;

			// If the player or their extension settings don't exist yet, abort
			if (!player || !player.ExtensionSettings || !player.ExtensionSettings.CRABS) {
				return;
			}

			// Extract and parse our specific CRABS data from the global BC object
			const rawServerData = player.ExtensionSettings.CRABS;
			let serverData = null;

			if (typeof rawServerData === "string") {
				serverData = JSON.parse(rawServerData);
			} else if (typeof rawServerData === "object") {
				serverData = rawServerData; // Just in case another mod parsed it already
			}

			if (serverData) {
				const serverTime = serverData.lastSaved || 0;
				const localTime = this.data.lastSaved || 0;

				// Compare timestamps: Only overwrite if server is newer
				if (serverTime > localTime) {
					this.data = this.sanitizeData({ ...this.data, ...serverData });

					// Backup the newer server data to local storage
					localStorage.setItem(this.getStorageKey(), JSON.stringify(this.data));

					// Refresh the UI if it happens to be open
					if (this.layout) this.layout.updateDOM(this.isMenuOpen);
				}
			}
		} catch (e) {
			console.warn("CRABS: Failed to parse sync settings from server", e);
		}
	}

	public save(): void {
		// Stamp the data with current time before saving
		this.data.lastSaved = Date.now();

		// Always save the full object to local storage
		localStorage.setItem(this.getStorageKey(), JSON.stringify(this.data));

		// Save to BC server if not opted out
		if (!this.data.localOnlyMode) {
			const serverPayload: any = { lastSaved: this.data.lastSaved };

			for (const key of Object.keys(this.data)) {
				if (key === 'lastSaved') continue;
				if (this.data[key] !== DEFAULT_SETTINGS[key]) {
					serverPayload[key] = this.data[key];
				}
			}

			const globalWindow = window as any;
			const player = globalWindow.Player;

			if (player) {
				// Ensure the extension settings object exists
				if (!player.ExtensionSettings) player.ExtensionSettings = {};

				// Attach our minimized payload as a JSON string
				player.ExtensionSettings.CRABS = JSON.stringify(serverPayload);

				// Use the modern, WCE-approved function to sync the extension settings
				if (typeof globalWindow.ServerPlayerExtensionSettingsSync === "function") {
					globalWindow.ServerPlayerExtensionSettingsSync("CRABS");
				}
			}
		}
	}

	private deleteServerData(): void {
		const globalWindow = window as any;

		try {
			const player = globalWindow.Player;

			if (player) {
				// Ensure the object exists so we don't throw a null reference error
				if (!player.ExtensionSettings) player.ExtensionSettings = {};

				// Set to an empty string instead of using 'delete'. 
				// This clears the data on the server without triggering the 'undefined' crash.
				player.ExtensionSettings.CRABS = "";

				// Sync the cleared data using the native modern function
				if (typeof globalWindow.ServerPlayerExtensionSettingsSync === "function") {
					globalWindow.ServerPlayerExtensionSettingsSync("CRABS");
				}
				// Fallback for older BC versions just in case
				else if (typeof globalWindow.ServerAccountUpdate?.QueueData === "function") {
					globalWindow.ServerAccountUpdate.QueueData({
						ExtensionSettings: player.ExtensionSettings
					}, true);
				}
			}

			// Toggle Local Only mode on so it doesn't instantly resync
			this.data.localOnlyMode = true;
			localStorage.setItem(this.getStorageKey(), JSON.stringify(this.data));

			// Refresh the UI to show the checkbox state change
			this.layout.updateDOM(this.isMenuOpen);

			// Success notification
			globalWindow.PreferenceMessage = "Server save successfully cleared!";
		} catch (e: any) {
			console.error("Failed to delete server data", e);

			// Print the specific error message to the game's notification system
			const errorMessage = e instanceof Error ? e.message : "Unknown error";
			globalWindow.PreferenceMessage = `Clear failed: ${errorMessage}`;
		}
	}

	/**
	 * Strips out any ghost data from old or renamed variables
	 */
	private sanitizeData(loadedData: any): any {
		const cleanData: any = { ...DEFAULT_SETTINGS };

		// Only copy over keys that actually exist in the current DEFAULT_SETTINGS
		for (const key of Object.keys(DEFAULT_SETTINGS)) {
			if (loadedData.hasOwnProperty(key)) {
				cleanData[key] = loadedData[key];
			}
		}

		// Preserve the timestamp
		if (loadedData.lastSaved) {
			cleanData.lastSaved = loadedData.lastSaved;
		}

		return cleanData;
	}

	private exportConfig(): void {
		try {
			const str = JSON.stringify(this.data);
			const encoded = btoa(str);
			navigator.clipboard.writeText(encoded);
			(window as any).PreferenceMessage = "Config copied to clipboard!";
		} catch (e) {
			console.error("Export failed", e);
		}
	}

	private async importConfig(): Promise<void> {
		try {
			const text = await navigator.clipboard.readText();
			const decoded = atob(text);
			const imported = JSON.parse(decoded);

			if (typeof imported === 'object' && 'showBanner' in imported) {
				// Ensure the imported config gets a fresh timestamp
				imported.lastSaved = Date.now();

				this.data = this.sanitizeData(imported);
				this.save();
				this.layout.updateDOM(this.isMenuOpen);
				(window as any).PreferenceMessage = "Config imported successfully!";
			}
		} catch (e) {
			(window as any).PreferenceMessage = "Import failed. Invalid format.";
			console.error("Import failed", e);
		}
	}

	private isRestricted(): boolean { return (window as any).Player?.IsRestrained?.() || false; }

	private buildRegistry(): void {
		const isDrawerDisabled = () => !this.data.enableDrawer;

		const hardcoreLock = (settingName: string) => {
			return this.isRestricted() && this.data.lockImmersive && (settingName === "lockImmersive" || this.data[settingName]);
		};

		const createCheck = (cat: ComponentCategory, setting: string, label: string, hint: string, indent = 0, extraDisable?: () => boolean, onChange?: (val: boolean) => void) => {
			// Only apply the hardcore lock to settings in the Immersion tab
			const isDisabled = () => (cat === "Immersion" && hardcoreLock(setting)) || (extraDisable ? extraDisable() : false);

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

		const createInput = (cat: ComponentCategory, setting: string, label: string, hint: string, inputType: "text" | "color", indent = 0, extraDisable?: () => boolean) => {
			const isDisabled = () => extraDisable ? extraDisable() : false;
			const getVal = () => this.data[setting];
			const setVal = (val: string) => { this.data[setting] = val; this.save(); };

			this.registry.push({
				category: cat, indent,
				widget: new InputWidget(label, hint, isDisabled, `CRABS_Input_${setting}`, inputType, getVal, setVal)
			});
		};

		const createTextArea = (cat: ComponentCategory, setting: string, label: string, hint: string, indent = 0, extraDisable?: () => boolean) => {
			const isDisabled = () => extraDisable ? extraDisable() : false;
			const getVal = () => this.data[setting];
			const setVal = (val: string) => { this.data[setting] = val; this.save(); };

			this.registry.push({
				category: cat, indent,
				widget: new TextAreaWidget(label, hint, isDisabled, `CRABS_Input_${setting}`, getVal, setVal)
			});
		};

		const createButton = (cat: ComponentCategory, label: string, hint: string, onClick: () => void, indent = 0) => {
			this.registry.push({
				category: cat, indent,
				widget: new ButtonWidget(label, hint, onClick)
			});
		};

		const getBindString = (bindId: string) => {
			const globalWindow = window as any;
			const bind = globalWindow.KeyManager?.getKeybinding(bindId);

			if (!bind || !bind.keyCombo) return "Unbound";

			const mods = Array.from(bind.keyCombo.modifiers || []).join('+');
			let keyText = "";

			if (bind.keyCombo.key) {
				if (globalWindow.KeybindingManager && globalWindow.KeybindingManager.ASCIIKeyboardMap) {
					keyText = globalWindow.KeybindingManager.ASCIIKeyboardMap[bind.keyCombo.key];
				}
				if (!keyText) {
					keyText = bind.keyCombo.key.replace('Key', '').replace('Digit', '');
				}
			}
			else if (bind.keyCombo.char) {
				keyText = bind.keyCombo.char.toUpperCase();
			}

			if (!keyText && !mods) return "Unbound";
			return mods && keyText ? `${mods}+${keyText}` : (mods || keyText);
		};

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
		createCheck("Chat", "capitalizeNames", "Auto-Capitalize My Name", "Forces the first letter of your name(s) to be capitalized when highlighted.", 1, () => !this.data.highlightMentions);
		createCheck("Chat", "colorMatchNames", "Inline Name Coloring", "Colors your name in highlighted messages to match your character's actual label color.", 1, () => !this.data.highlightMentions);
		createInput("Chat", "customHighlightWords", "Custom Words", "Comma-separated list of extra words to trigger highlights.", "text", 1, () => !this.data.highlightMentions);
		createTextArea("Chat", "ignorePhrases", "Exclusion Phrases", "One phrase per line. Use * as a wildcard (e.g., 'pick* a rose').", 1, () => !this.data.highlightMentions);
		createInput("Chat", "highlightColor", "Highlight Color", "Pick a custom color for chat highlights.", "color", 1, () => !this.data.highlightMentions);
		createCheck("Chat", "chatLogHover", "Chat Log Hover Links", "Mousing over names in the chat log triggers the roster focus halo and map compass.");
		createCheck("Chat", "autoBeepOnLeave", "Whisper+ Autoelevate to Beep", "Attempt to send Whisper+ as a beep if a friend leaves the room before you hit send.");

		// --- CONFIG MANAGEMENT ---
		createCheck("Config", "localOnlyMode", "Disable Cloud Sync", "If checked, settings are only saved to this browser and will not sync across your devices.");
		createButton("Config", "Delete Server Save", "Wipes your CRABS settings from the game server.", () => this.deleteServerData());
		createButton("Config", "Export to Clipboard", "Copy your settings string to share or backup.", () => this.exportConfig());
		createButton("Config", "Import from Clipboard", "Paste a settings string to overwrite current config.", () => this.importConfig());
	}

	private handleWheel(event: WheelEvent): void {
		if (!this.isMenuOpen) return;

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
				globalWindow.DrawRect(0, 0, 2000, 1000, "#000000AA");
				globalWindow.DrawRect(700, 350, 600, 300, "#222222");
				globalWindow.DrawEmptyRect(700, 350, 600, 300, "White");
				canvasContext.textAlign = "center";
				globalWindow.DrawText("Restore Default Settings?", 1000, 430, "White", "");
				globalWindow.DrawButton(750, 500, 200, 60, "Confirm", "White", "");
				globalWindow.DrawButton(1050, 500, 200, 60, "Cancel", "White", "");
				globalWindow.DrawButton(1815, 75, 90, 90, "", "White", "Icons/Exit.png", "Back");

				const isInChat = typeof ChatRoomData !== "undefined" && ChatRoomData !== null;
				globalWindow.DrawButton(1710, 75, 90, 90, "", isInChat ? "White" : "#888888", "Icons/Chat.png", isInChat ? "Return to Chat" : "Not in a Chat Room");
				globalWindow.DrawButton(1605, 75, 90, 90, "", "#888888", "Icons/Reset.png", "Restore Defaults");
			}
		} finally {
			canvasContext.restore();
		}
	}

	public click(): void {
		const globalWindow = window as any;

		if (this.showResetConfirm) {
			if (globalWindow.MouseIn(750, 500, 200, 60)) {
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
				this.showResetConfirm = false;
				this.layout.updateDOM(this.isMenuOpen);
			} else if (globalWindow.MouseIn(1815, 75, 90, 90)) {
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
				this.showResetConfirm = false;
				this.isMenuOpen = false;
				this.layout.updateDOM(false);

				for (const key of Object.keys(this.data)) {
					globalWindow.ElementRemove?.(`CRABS_Input_${key}`);
				}

				globalWindow.CommonSetScreen("Online", "ChatRoom");
				globalWindow.PreferenceMessage = "";
				globalWindow.PreferenceSubscreenExtensionsClear?.();
			}
			return;
		}

		const clickedExit = globalWindow.MouseIn(1815, 75, 90, 90);
		const clickedChat = globalWindow.MouseIn(1710, 75, 90, 90) && typeof ChatRoomData !== "undefined" && ChatRoomData !== null;
		const clickedReset = globalWindow.MouseIn(1605, 75, 90, 90);

		if (clickedReset) {
			this.showResetConfirm = true;
			this.layout.updateDOM(false);
			return;
		}

		if (clickedExit || clickedChat) {
			this.isMenuOpen = false;
			this.layout.updateDOM(false);

			if (clickedChat) {
				globalWindow.CommonSetScreen("Online", "ChatRoom");
			}

			globalWindow.PreferenceSubscreenExtensionsClear?.();
			return;
		}

		if (this.layout.click(globalWindow.MouseX, globalWindow.MouseY)) {
			this.layout.updateDOM(this.isMenuOpen);
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

				for (const key of Object.keys(this.data)) {
					globalWindow.ElementRemove?.(`CRABS_Input_${key}`);
				}

				globalWindow.PreferenceMessage = "";
				globalWindow.PreferenceSubscreenExtensionsClear?.();
				globalWindow.PreferenceOpenSubscreen?.("Extensions");
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

	public openNativeKeybindings(): void {
		const globalWindow = window as any;

		this.isMenuOpen = false;
		this.layout.updateDOM(false);
		for (const key of Object.keys(this.data)) {
			globalWindow.ElementRemove?.(`CRABS_Input_${key}`);
		}

		globalWindow.ElementRemove?.("InputSearch");
		globalWindow.PreferenceMessage = "";
		if (typeof globalWindow.PreferenceSubscreenExtensionsClear === "function") {
			globalWindow.PreferenceSubscreenExtensionsClear();
		}

		if (typeof globalWindow.PreferenceOpenSubscreen === "function") {
			globalWindow.PreferenceOpenSubscreen("Keybindings");
		} else {
			globalWindow.PreferenceSubscreen = "Keybindings";
			if (typeof globalWindow.PreferenceSubscreenKeybindingsLoad === "function") {
				globalWindow.PreferenceSubscreenKeybindingsLoad();
			}
		}
	}
}
