// src/modules/settings/settings.ts
import { CRABS_Base } from "../base";
import { Notification } from "../notifications";
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
	browserNotifications: false,
	ignorePhrases: "",
	localOnlyMode: false,
	lastSaved: 0,
	enablePerformanceMode: false,
};

export class Settings extends CRABS_Base {
	public static instance: Settings;
	public data: any;
	private readonly MAX_SERVER_PAYLOAD = 8000; // Safe limit for BC ExtensionSettings

	private layout: LayoutEngine;
	private registry: ConfiguredWidget[] = [];
	private isMenuOpen: boolean = false;
	private showResetConfirm: boolean = false;
	private readonly STORAGE_KEY = "CRABS_Settings";

	constructor(CRABS: ModSDKModAPI) {
		super(CRABS);
		Settings.instance = this;

		// Initial load (will grab generic settings if not logged in yet)
		this.data = this.loadLocal();
		this.syncFromServer();

		// RE-LOAD the correct file as soon as the game populates the Player object
		this.CRABS.hookFunction('LoginResponse', 0, (args, next) => {
			// Let the base game process the login FIRST to build the Player object
			const result = next(args);

			// Now Player.MemberNumber exists, so it loads the correct local file
			this.data = this.loadLocal();

			// Now Player.ExtensionSettings exists, so it syncs from the cloud
			this.syncFromServer();

			return result;
		});

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

	private getCloudPayloadSize(): number {
		if (this.data.localOnlyMode) return 0;

		const serverPayload: any = { lastSaved: this.data.lastSaved || Date.now() };

		for (const key of Object.keys(this.data)) {
			if (key === 'lastSaved') continue;

			// Pack exactly as it would save
			if (this.data[key] !== DEFAULT_SETTINGS[key] && this.data[key] !== "") {
				serverPayload[key] = this.data[key];
			}
		}

		// JSON.stringify length represents the exact byte size of the payload
		return JSON.stringify(serverPayload).length;
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
					// Start with defaults, apply server data, and retain local-only rules
					const mergedData = { ...DEFAULT_SETTINGS, ...serverData };
					mergedData.localOnlyMode = this.data.localOnlyMode;

					this.data = this.sanitizeData(mergedData);

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


	/**
	 * Returns the sanitized array AND a boolean indicating if anything was dropped due to length.
	 */
	private sanitizeList(raw: string, delimiter: string, maxItemLength: number): { items: string[], dropped: boolean } {
		if (!raw) return { items: [], dropped: false };

		const original = raw.split(delimiter)
			.map(item => item.trim())
			.filter(item => item.length > 0);

		const valid = original.filter(item => item.length <= maxItemLength);

		return {
			items: valid,
			dropped: original.length > valid.length
		};
	}

	public save(): void {
		this.data.lastSaved = Date.now();

		// Always save the FULL data to LocalStorage
		localStorage.setItem(this.getStorageKey(), JSON.stringify(this.data));

		if (this.data.localOnlyMode) return;

		const serverPayload: any = { lastSaved: this.data.lastSaved };

		// Sanitize and track if gibberish was dropped
		const wordsData = this.sanitizeList(this.data.customHighlightWords, ',', 60);
		const phrasesData = this.sanitizeList(this.data.ignorePhrases, '\n', 250);

		let words = wordsData.items;
		let phrases = phrasesData.items;
		const hadInvalidItems = wordsData.dropped || phrasesData.dropped;

		let hitCapacityLimit = false;

		// Pack the standard settings first
		for (const key of Object.keys(this.data)) {
			if (key === 'lastSaved' || key === 'customHighlightWords' || key === 'ignorePhrases') continue;
			if (this.data[key] !== DEFAULT_SETTINGS[key] && this.data[key] !== "") {
				serverPayload[key] = this.data[key];
			}
		}

		// Dynamically measure and trim until it fits
		while (true) {
			const testWords = words.join(',');
			const testPhrases = phrases.join('\n');

			if (testWords && testWords !== DEFAULT_SETTINGS.customHighlightWords) {
				serverPayload.customHighlightWords = testWords;
			} else {
				delete serverPayload.customHighlightWords;
			}

			if (testPhrases && testPhrases !== DEFAULT_SETTINGS.ignorePhrases) {
				serverPayload.ignorePhrases = testPhrases;
			} else {
				delete serverPayload.ignorePhrases;
			}

			const payloadSize = JSON.stringify(serverPayload).length;
			if (payloadSize <= this.MAX_SERVER_PAYLOAD) break;

			hitCapacityLimit = true;

			// Over limit: Pop the last item off whichever list is currently taking up the most characters
			if (words.length > 0 && phrases.length > 0) {
				if (testWords.length > testPhrases.length) words.pop();
				else phrases.pop();
			} else if (words.length > 0) {
				words.pop();
			} else if (phrases.length > 0) {
				phrases.pop();
			} else {
				break; // Failsafe
			}
		}

		// Sync to the server
		const globalWindow = window as any;
		const player = globalWindow.Player;

		if (player) {
			if (!player.ExtensionSettings) player.ExtensionSettings = {};
			player.ExtensionSettings.CRABS = JSON.stringify(serverPayload);

			if (typeof globalWindow.ServerPlayerExtensionSettingsSync === "function") {
				globalWindow.ServerPlayerExtensionSettingsSync("CRABS");
			}
		}

		// Context-Aware User Feedback
		if (hitCapacityLimit && hadInvalidItems) {
			Notification.send({
				message: "Cloud Sync: Dropped invalid long strings AND reached 8KB storage limit. Excess kept local.",
				title: "CRABS Storage"
			});
		} else if (hitCapacityLimit) {
			Notification.send({
				message: "Cloud Sync capacity reached (8KB). Excess words/phrases kept local only.",
				title: "CRABS Storage"
			});
		} else if (hadInvalidItems) {
			Notification.send({
				message: "Cloud Sync: Dropped individual words/phrases that exceeded character limits. Kept local.",
				title: "CRABS Storage"
			});
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
				// This clears the data on the server without triggering the WCE 'undefined' crash.
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
			Notification.send({ message: "Server save successfully cleared!" });
		} catch (e: any) {
			console.error("Failed to delete server data", e);

			// Print the specific error message to the game's notification system
			const errorMessage = e instanceof Error ? e.message : "Unknown error";
			Notification.send({ message: `Clear failed: ${errorMessage}`, title: "CRABS Error" });
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

			Notification.send({ message: "Config copied to clipboard!" });
		} catch (e) {
			console.error("Export failed", e);
			Notification.send({ message: "Failed to copy config to clipboard.", title: "CRABS Error" });
		}
	}

	private importConfig(): void {
		const globalWindow = window as any;

		try {
			// Ask the user to paste the string manually to bypass browser clipboard blocks
			const text = globalWindow.prompt("Paste your CRABS settings string here:", "");

			// If they clicked Cancel or left it empty, abort gracefully
			if (!text) return;

			const decoded = atob(text);
			const imported = JSON.parse(decoded);

			if (typeof imported === 'object' && 'showBanner' in imported) {
				// Ensure the imported config gets a fresh timestamp so the server accepts it
				imported.lastSaved = Date.now();

				// Sanitize to strip any ghost data before applying
				this.data = this.sanitizeData(imported);
				this.save();
				this.layout.updateDOM(this.isMenuOpen);

				Notification.send({ message: "Config imported successfully!" });
			} else {
				Notification.send({ message: "Import failed. Unrecognized settings format.", title: "CRABS Error" });
			}
		} catch (e) {
			console.error("Import failed", e);
			Notification.send({ message: "Import failed. Invalid or corrupted string.", title: "CRABS Error" });
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
		createCheck("General", "enablePerformanceMode", "Performance Mode", "Automatically throttles base game animations and drops VFX when your framerate dips.");
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
		}, (_enabled) => {
			// Trigger the game state sync immediately when toggled
			this.syncGameState();
		});

		// --- CHAT ---
		createCheck("Chat", "highlightMentions", "Highlight Mentions", "Highlights chat messages containing your name or nickname.");
		createCheck("Chat", "browserNotifications", "Desktop Notifications", "Get an OS alert when mentioned (only triggers if the game is tabbed out or minimized).", 1, () => !this.data.highlightMentions, (enabled) => {
			if (enabled && "Notification" in window && window.Notification.permission !== "granted") {
				window.Notification.requestPermission().then((permission: NotificationPermission) => {
					if (permission !== "granted") {
						this.data.browserNotifications = false;
						this.save();
					}
				});
			}
		});
		createCheck("Chat", "capitalizeNames", "Auto-Capitalize My Name", "Forces the first letter of your name(s) to be capitalized when highlighted.", 1, () => !this.data.highlightMentions);
		createCheck("Chat", "colorMatchNames", "Inline Name Coloring", "Colors your name in highlighted messages to match your character's actual label color.", 1, () => !this.data.highlightMentions);
		createInput("Chat", "customHighlightWords", "Custom Words", "Comma-separated list of extra words to trigger highlights.", "text", 1, () => !this.data.highlightMentions);
		createTextArea("Chat", "ignorePhrases", "Exclusion Phrases", "One phrase per line. Use * as a wildcard (e.g., 'pick* a rose').", 1, () => !this.data.highlightMentions);
		createInput("Chat", "highlightColor", "Highlight Color", "Pick a custom color for chat highlights.", "color", 1, () => !this.data.highlightMentions);
		createCheck("Chat", "chatLogHover", "Chat Log Hover Links", "Mousing over names in the chat log triggers the roster focus halo and map compass.");
		createCheck("Chat", "autoBeepOnLeave", "Whisper+ Autoelevate to Beep", "Attempt to send Whisper+ as a beep if a friend leaves the room before you hit send.");

		// --- CONFIG MANAGEMENT ---
		createCheck("Config", "localOnlyMode", "Disable Cloud Sync", "If checked, settings are only saved to this browser and will not sync across your devices.");
		createLabel("Config", () => {
			if (this.data.localOnlyMode) return "Cloud Storage: Disabled (Local Only)";

			const size = this.getCloudPayloadSize();
			const limit = this.MAX_SERVER_PAYLOAD || 8000;
			const percent = Math.max(0, Math.min(100, Math.round((size / limit) * 100)));

			let status = "🟢";
			if (size > limit) status = "🔴 (Will truncate on save)";
			else if (percent > 85) status = "🟡 (Nearing capacity)";

			return `Cloud Storage: ${size} / ${limit} bytes [${percent}%] ${status}`;
		}, "Shows how much server allowance is used. Exceeding this will truncate new items form the server sync.", 1);
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

				// Hide the native base game header
				document.getElementById("preference-subscreen-hgroup")?.style.setProperty("display", "none", "important");
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
