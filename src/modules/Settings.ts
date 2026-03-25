import { CRABS_Base } from "./base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";

const DEFAULT_SETTINGS: CRABS_Settings = {
	showBanner: true,
	rosterOpensDrawer: true,
	hideDrawerTab: false,
	immersiveBlind: false,
	immersiveGag: false,
	respectBcxRules: true,
	compactDrawer: false,
	closeDrawerOnWhisper: false,
	closeDrawerOnChat: false,
	disableDrawer: false,
	lockImmersive: false,
};

/**
 * Combined Settings and UI Manager for CRABS.
 */
export class Settings extends CRABS_Base {
	public data: CRABS_Settings;
	private elements: UIElement[] = [];
	private readonly STORAGE_KEY = "CRABS_Settings";

	// Layout Constants
	private readonly LEFT_COL_X = 550;
	private readonly RIGHT_COL_X = 1250;
	private readonly CHECKBOX_X_OFFSET = 30;
	private readonly LABEL_X_OFFSET = 120;
	private readonly CHECKBOX_WIDTH = 64;
	private readonly SPACING_Y = 75;

	constructor(CRABS: ModSDKModAPI) {
		super(CRABS);
		this.data = this.load();
		this.setupUI();
		this.registerExtension();
	}

	private load(): CRABS_Settings {
		const saved = localStorage.getItem(this.STORAGE_KEY);
		if (saved) {
			try {
				return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
			} catch (e) {
				console.error("CRABS: Failed to parse settings", e);
			}
		}
		return { ...DEFAULT_SETTINGS };
	}

	public save(): void {
		localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
	}

	private isRestricted(): boolean {
		return (window as any).Player.IsRestrained?.() || false;
	}

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

	private getNewYPos(category?: string): number {
		const catElements = this.elements.filter(e => e.category === category);
		if (catElements.length === 0) {
			if (category === "Banner") return 280;
			if (category === "Drawer") return 425;
			if (category === "Immersion") return 280;
			return 280;
		}
		const lastElement = catElements[catElements.length - 1];
		return lastElement.yPos + this.SPACING_Y;
	}

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

	private registerExtension(): void {
		const waitForFunc = () => {
			const w = window as any;
			if (typeof w.PreferenceRegisterExtensionSetting === "function") {
				w.PreferenceRegisterExtensionSetting({
					Identifier: "CRABS",
					ButtonText: "CRABS",
					Image: "https://sin-1337.github.io/CRABS/images/CRABS_Logo.png",
					click: () => this.click(),
					run: () => this.draw(),
					exit: () => {
						const w = window as any;
						w.PreferenceMessage = "";
						if (typeof w.PreferenceSubscreenExtensionsClear === "function") {
							try { w.PreferenceSubscreenExtensionsClear(); } catch (e) { }
						}

						// Send the user back to the Extensions menu
						if (typeof w.PreferenceOpenSubscreen === "function") {
							w.PreferenceOpenSubscreen("Extensions");
						}

						// MUST return false to stop the game from kicking you to the "Main" menu
						return false;
					},
					load: () => {
						w.PreferenceMessage = "";
					}
				});
			} else {
				setTimeout(waitForFunc, 1000);
			}
		};
		waitForFunc();
	}

	public draw(): void {
		const isMouseIn = (window as any).MouseIn;
		const DrawText = (window as any).DrawText;
		const DrawCheckbox = (window as any).DrawCheckbox;
		const DrawCharacter = (window as any).DrawCharacter;
		const DrawRect = (window as any).DrawRect;
		const PreferenceMessage = (window as any).PreferenceMessage;
		const DrawButton = (window as any).DrawButton;

		const canvasEl = document.getElementById("MainCanvas") as HTMLCanvasElement;
		const ctx = canvasEl ? canvasEl.getContext("2d") : null;
		if (!ctx) return;

		// Draw character background card
		DrawRect(40, 40, 420, 920, "#222222aa");
		DrawCharacter((window as any).Player, 50, 50, 0.9);
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

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
				ctx.textAlign = "left";
				DrawText(element.text, textX, y, isGrayedOut ? "gray" : "Black", "");

				if (isMouseIn(textX, y - 18, 450, 36) || isMouseIn(checkboxX, y - 32, 64, 64)) {
					ctx.textAlign = "center";
					DrawText(element.hint, 1100, 950, "Black", "Gray");
				}
			}
		}

		ctx.textAlign = "center";
		ctx.textBaseline = "alphabetic";
	}

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
