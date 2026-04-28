// settings.ts
import { CRABS_Base } from "../base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { CheckboxWidget, InputWidget } from "./widgets";
import { LayoutEngine, ConfiguredWidget } from "./layout";

const DEFAULT_SETTINGS = { showBanner: true, enableDrawer: true, lockImmersive: false /* ... */ };

export class Settings extends CRABS_Base {
	public static instance: Settings;
	public data: any; // Type as CRABS_Settings

	private layout: LayoutEngine;
	private registry: ConfiguredWidget[] = [];
	private isMenuOpen: boolean = false;
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

		// Helper to cleanly create a checkbox bound to our state
		const createCheck = (cat: any, setting: string, label: string, hint: string, indent = 0, extraDisable?: () => boolean) => {
			const isDisabled = () => hardcoreLock(setting) || (extraDisable ? extraDisable() : false);
			const getVal = () => this.data[setting];
			const setVal = (val: boolean) => { this.data[setting] = val; this.save(); };

			this.registry.push({
				category: cat, indent,
				widget: new CheckboxWidget(label, hint, isDisabled, getVal, setVal)
			});
		};

		// --- Build UI ---
		createCheck("General", "showBanner", "Show Banner on Entry", "Display info banner on room join.");

		createCheck("Drawer", "enableDrawer", "Enable Drawer UI", "Enable the sliding drawer interface.");
		createCheck("Drawer", "rosterOpensDrawer", "/roster toggles drawer", "Toggle drawer via /roster commands.", 1, isDrawerDisabled);

		createCheck("Immersion", "lockImmersive", "Hardcore Lock", "Locks settings ON while bound.");

		// Add Inputs similarly...
		this.registry.push({
			category: "Chat", indent: 1,
			widget: new InputWidget(
				"Custom Words", "Comma-separated words.",
				() => !this.data.highlightMentions,
				"CRABS_Input_customWords", "text",
				() => this.data.customHighlightWords,
				(val) => { this.data.customHighlightWords = val; this.save(); }
			)
		});
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
		if (canvasContext) this.layout.draw(canvasContext);
	}

	public click(): void {
		const globalWindow = window as any;

		// Handle native window exit buttons...
		if (globalWindow.MouseIn(1815, 75, 90, 90)) {
			this.isMenuOpen = false;
			this.layout.updateDOM(false);
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
		// Standard Bondage Club extension hook logic
		CRABS_Base.subscreenDef = {
			Identifier: "CRABS", ButtonText: "CRABS", Image: "",
			click: () => this.click(), run: () => this.draw(),
			load: () => { this.isMenuOpen = true; this.layout.updateDOM(true); },
			exit: () => {
				this.isMenuOpen = false; this.layout.updateDOM(false);
				// Loop through registry to remove inputs...
				return false;
			}
		};
		// ... (Register hook setTimeout) ...
	}
}
