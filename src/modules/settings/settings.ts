// src/modules/settings/settings.ts
import { CRABS_Base } from "../base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { CheckboxWidget, InputWidget } from "./widgets";
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

		const createInput = (cat: ComponentCategory, setting: string, label: string, hint: string, inputType: "text" | "color", indent = 0, extraDisable?: () => boolean) => {
			const isDisabled = () => extraDisable ? extraDisable() : false;
			const getVal = () => this.data[setting];
			const setVal = (val: string) => { this.data[setting] = val; this.save(); };

			this.registry.push({
				category: cat, indent,
				widget: new InputWidget(label, hint, isDisabled, `CRABS_Input_${setting}`, inputType, getVal, setVal)
			});
		};

		// --- GENERAL ---
		createCheck("General", "showBanner", "Show Banner on Entry", "Display info banner on room join.");
		createCheck("General", "checkForUpdates", "Notify me about updates", "Periodically check for CRABS updates, and notify me.");

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
		createInput("Chat", "customHighlightWords", "Custom Words", "Comma-separated list of extra words to trigger highlights.", "text", 1, () => !this.data.highlightMentions);
		createInput("Chat", "highlightColor", "Highlight Color", "Pick a custom color for chat highlights.", "color", 1, () => !this.data.highlightMentions);
		createCheck("Chat", "enableFocusHalo", "Enable Focus Halo", "Show a pulsing halo effect on character avatars when mousing over players in the roster.");
	}

	private handleWheel(event: WheelEvent): void {
		if (!this.isMenuOpen) return;
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

		this.layout.draw(canvasContext, this.showResetConfirm);

		if (this.showResetConfirm) {
			this.drawModal();
		}
	}

	private drawModal(): void {
		const globalWindow = window as any;
		const canvasContext = (document.getElementById("MainCanvas") as HTMLCanvasElement)?.getContext("2d");
		if (!canvasContext) return;

		// 1. Dim the entire screen
		globalWindow.DrawRect(0, 0, 2000, 1000, "#000000AA");

		// 2. THE EASY PEASY FIX: Draw a solid dark box right over the top-right buttons to hide them completely
		globalWindow.DrawRect(1590, 60, 330, 120, "#111111");

		// 3. Draw the prompt box
		globalWindow.DrawRect(700, 350, 600, 300, "#222222");
		globalWindow.DrawEmptyRect(700, 350, 600, 300, "White");

		canvasContext.textAlign = "center";
		globalWindow.DrawText("Restore Default Settings?", 1000, 430, "White", "");

		globalWindow.DrawButton(750, 500, 200, 60, "Confirm", "White", "");
		globalWindow.DrawButton(1050, 500, 200, 60, "Cancel", "White", "");
	}

	public click(): void {
		const globalWindow = window as any;

		// --- TRAP CLICKS INSIDE THE MODAL ---
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
			}
			return; // Stops execution dead in its tracks. Base game / buttons below cannot be clicked.
		}
		// ------------------------------------

		const clickedChat = globalWindow.MouseIn(1710, 75, 90, 90) && typeof ChatRoomData !== "undefined" && ChatRoomData !== null;
		const clickedReset = globalWindow.MouseIn(1605, 75, 90, 90);
		const clickedExit = globalWindow.MouseIn(1815, 75, 90, 90);

		if (clickedReset) {
			this.showResetConfirm = true;
			this.layout.updateDOM(false);
			return;
		}

		if (clickedExit || clickedChat) {
			this.isMenuOpen = false;
			this.showResetConfirm = false;
			this.layout.updateDOM(false);

			for (const key of Object.keys(this.data)) {
				globalWindow.ElementRemove?.(`CRABS_Input_${key}`);
			}
			globalWindow.PreferenceMessage = "";
			globalWindow.PreferenceSubscreenExtensionsClear?.();

			if (clickedChat) {
				globalWindow.CommonSetScreen("Online", "ChatRoom");
			} else {
				globalWindow.PreferenceOpenSubscreen?.("Extensions");
			}
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
			// The native exit block is back where it belongs
			exit: () => {
				this.isMenuOpen = false;
				this.showResetConfirm = false;
				this.layout.updateDOM(false);

				for (const key of Object.keys(this.data)) {
					globalWindow.ElementRemove?.(`CRABS_Input_${key}`);
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
}
