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
	showMapCompass: true,
	mapSuperZoom: false,
};

export class Settings extends CRABS_Base {
	public static instance: Settings;
	public data: CRABS_Settings;
	private elements: any[] = [];
	private readonly STORAGE_KEY = "CRABS_Settings";

	private readonly LEFT_COL_X = 550;
	private readonly RIGHT_COL_X = 1250;
	private readonly CHECKBOX_X_OFFSET = 30;
	private readonly LABEL_X_OFFSET = 120;
	private readonly CHECKBOX_WIDTH = 64;

	constructor(CRABS: ModSDKModAPI) {
		super(CRABS);
		Settings.instance = this;
		this.data = this.load();
		this.setupUI();
		this.registerExtension();
	}

	private load(): CRABS_Settings {
		const saved = localStorage.getItem(this.STORAGE_KEY);
		if (saved) {
			try { return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }; }
			catch (e) { console.error("CRABS: Load failed", e); }
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
	 * Determines if a specific UI element should be locked based on Hardcore rules.
	 */
	private isSettingLocked(el: any): boolean {
		if (!this.isRestricted() || !this.data.lockImmersive) return false;

		// The lock itself cannot be disabled while restrained
		if (el.setting === "lockImmersive") return true;

		// Immersion settings lock ONLY if they are currently ON
		if (el.category === "Immersion" && this.data[el.setting as keyof CRABS_Settings] === true) {
			return true;
		}

		return false;
	}

	private setupUI(): void {
		this.elements = [];

		this.addCheckbox("Show Banner on Entry", "showBanner", "Display info banner on room join.", { category: "Banner", yPos: 280 });

		this.addCheckbox("Disable Drawer UI", "disableDrawer", "Disable the drawer, use inline chat roster only.", { category: "Drawer", yPos: 425 });
		const drawerDisabled = () => this.data.disableDrawer;

		this.addCheckbox("/roster toggles drawer", "rosterOpensDrawer", "Toggle drawer via /roster or /crabs commands.", { category: "Drawer", yPos: 500, grayedOut: drawerDisabled });
		this.addCheckbox("Hide Drawer Tab", "hideDrawerTab", "Hide the CRABS drawer tab.", { category: "Drawer", yPos: 575, grayedOut: () => drawerDisabled() || !this.data.rosterOpensDrawer });
		this.addCheckbox("Compact Height", "compactDrawer", "Drawer has a 77% height limit.", { category: "Drawer", yPos: 650, grayedOut: drawerDisabled });
		this.addCheckbox("Auto-stow on Whisper+", "closeDrawerOnWhisper", "Close drawer after sending a whisper+ message.", { category: "Drawer", yPos: 725, grayedOut: drawerDisabled });
		this.addCheckbox("Auto-stow on Chat", "closeDrawerOnChat", "Close drawer after sending a message.", { category: "Drawer", yPos: 800, grayedOut: drawerDisabled });

		// Category: Immersion
		this.addCheckbox("Hardcore Lock", "lockImmersive", "Locks settings ON while bound.", { category: "Immersion", yPos: 280 });
		this.addCheckbox("Respect Blindness", "immersiveBlind", "Blurred roster when blind.", { category: "Immersion", yPos: 355 });
		this.addCheckbox("Respect Gags", "immersiveGag", "No Whisper+ when gagged.", { category: "Immersion", yPos: 430 });
		this.addCheckbox("Respect BCX Rules", "respectBcxRules", "BCX integration.", { category: "Immersion", yPos: 505 });

		// Category: Maps
		this.addCheckbox("Show Map Compass", "showMapCompass", "Show a directional arrow on map.", { category: "Maps", yPos: 725 });

		const isSuperZoomBlocked = () => {
			const val = (window as any).ChatRoomMapViewPerceptionRangeMax;
			return val !== undefined && val !== 7 && val !== 50;
		};
		this.addCheckbox("SuperZoom", "mapSuperZoom", "Unlock map zoom limits.", { category: "Maps", yPos: 800, grayedOut: isSuperZoomBlocked });
	}

	private addCheckbox(text: string, setting: keyof CRABS_Settings & string, hint: string, options?: any) {
		this.elements.push({
			type: 'Checkbox', text, setting, hint,
			yPos: options?.yPos || 280,
			width: this.CHECKBOX_WIDTH, height: this.CHECKBOX_WIDTH,
			xModifier: 0, yModifier: 0,
			category: options?.category,
			grayedOut: options?.grayedOut
		});
	}

	public draw(): void {
		const { MouseIn, DrawText, DrawCheckbox, DrawCharacter, DrawRect, PreferenceMessage, DrawButton, Player } = window as any;
		const canvas = (document.getElementById("MainCanvas") as HTMLCanvasElement)?.getContext("2d");
		if (!canvas) return;

		DrawRect(40, 40, 420, 920, "#222222aa");
		DrawCharacter(Player, 50, 50, 0.9);

		canvas.textAlign = "center";
		canvas.textBaseline = "middle";
		DrawText("- CRABS Mod Settings -", 1200, 80, "Black", "Gray");
		DrawButton(1815, 75, 90, 90, "", "White", "Icons/Exit.png", "Back");
		DrawButton(1710, 75, 90, 90, "", "White", "Icons/Chat.png", "To Chat");

		if (PreferenceMessage) DrawText(PreferenceMessage, 1000, 150, "Red", "Black");
		else DrawText("Hover settings for details", 1200, 150, "Black", "Gray");

		const leftX = this.LEFT_COL_X - 20;
		const rightX = this.RIGHT_COL_X - 20;
		DrawRect(leftX, 200, 650, 125, "#00000011"); DrawText("Banner", leftX + 325, 220, "Black", "Gray");
		DrawRect(leftX, 345, 650, 500, "#00000011"); DrawText("Drawer", leftX + 325, 365, "Black", "Gray");
		DrawRect(rightX, 200, 650, 375, "#00000011"); DrawText("Immersion", rightX + 325, 220, "Black", "Gray");
		DrawRect(rightX, 650, 650, 200, "#00000011"); DrawText("Maps", rightX + 325, 670, "Black", "Gray");

		for (const el of this.elements) {
			const isRight = el.category === "Immersion" || el.category === "Maps";
			const x = isRight ? this.RIGHT_COL_X : this.LEFT_COL_X;
			const cbX = x + this.CHECKBOX_X_OFFSET;
			const txX = x + this.LABEL_X_OFFSET;

			const manualGray = typeof el.grayedOut === 'function' ? el.grayedOut() : el.grayedOut;
			const hardcoreGray = this.isSettingLocked(el);
			const isLocked = manualGray || hardcoreGray;

			DrawCheckbox(cbX, el.yPos - 32, 64, 64, "", this.data[el.setting as keyof CRABS_Settings], isLocked);
			canvas.textAlign = "left";
			DrawText(el.text, txX, el.yPos, isLocked ? "#888888" : "Black", "");

			if (MouseIn(txX, el.yPos - 18, 450, 36) || MouseIn(cbX, el.yPos - 32, 64, 64)) {
				canvas.textAlign = "center";
				let displayHint = el.hint;

				if (el.setting === "mapSuperZoom" && manualGray) {
					displayHint = "Disabled: Another mod or script is controlling this setting.";
				}

				DrawText(displayHint, 1200, 920, "Black", "Gray");
			}
		}
		canvas.textBaseline = "alphabetic";
	}

	public click(): void {
		const { MouseIn, PreferenceSubscreenExtensionsClear, CommonSetScreen } = window as any;
		if (MouseIn(1815, 75, 90, 90)) {
			PreferenceSubscreenExtensionsClear?.();
			return;
		}

		if (MouseIn(1710, 75, 90, 90)) {
			// Tell the game to switch screens FIRST
			if (typeof CommonSetScreen === "function") {
				CommonSetScreen("Online", "ChatRoom");
			}

			// Clear the SDK preference state SECOND
			PreferenceSubscreenExtensionsClear?.();

			// Clear any lingering messages
			(window as any).PreferenceMessage = "";
			return;
		}

		for (const el of this.elements) {
			const isRight = el.category === "Immersion" || el.category === "Maps";
			const x = isRight ? this.RIGHT_COL_X : this.LEFT_COL_X;
			const cbX = x + this.CHECKBOX_X_OFFSET;

			const manualGray = typeof el.grayedOut === 'function' ? el.grayedOut() : el.grayedOut;
			const hardcoreGray = this.isSettingLocked(el);

			if (manualGray || hardcoreGray) continue;

			if (MouseIn(cbX, el.yPos - 32, 450, 64)) {
				const key = el.setting as keyof CRABS_Settings;
				(this.data as any)[key] = !(this.data as any)[key];

				if (key === "disableDrawer" && this.data.disableDrawer) {
					this.data.rosterOpensDrawer = false;
					this.data.hideDrawerTab = false;
				}
				if (key === "rosterOpensDrawer" && !this.data.rosterOpensDrawer) {
					this.data.hideDrawerTab = false;
				}

				this.save();
				this.syncGameState();
				return;
			}
		}
	}

	private registerExtension(): void {
		const global = window as any;
		CRABS_Base.subscreenDef = {
			Identifier: "CRABS", ButtonText: "CRABS",
			Image: "https://sin-1337.github.io/CRABS/images/CRABS_Logo.png",
			click: () => this.click(), run: () => this.draw(),
			exit: () => {
				global.PreferenceMessage = "";
				global.PreferenceSubscreenExtensionsClear?.();
				global.PreferenceOpenSubscreen?.("Extensions");
				return false;
			},
			load: () => { global.PreferenceMessage = ""; }
		};
		const reg = () => {
			if (global.PreferenceRegisterExtensionSetting) global.PreferenceRegisterExtensionSetting(CRABS_Base.subscreenDef);
			else setTimeout(reg, 1000);
		};
		reg();
	}

	public syncGameState(): void {
		const val = (window as any).ChatRoomMapViewPerceptionRangeMax;
		if (val !== undefined && val !== 7 && val !== 50) return; // Yields to other mod

		(window as any).ChatRoomMapViewPerceptionRangeMax = this.data.mapSuperZoom ? 50 : 7;
	}
}
