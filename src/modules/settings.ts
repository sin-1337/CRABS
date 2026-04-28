/**
 * CRABS Settings Module (Refactored)
 *
 * Provides a fully dynamic, declarative settings UI for the CRABS mod.
 *
 * Features:
 * - Declarative registry for all settings
 * - Automatic layout calculation (no manual positioning)
 * - Search filtering with live updates
 * - Dependency-based hierarchy (auto-indentation)
 * - Persistent storage via localStorage
 *
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

type ComponentType = "Checkbox" | "TextInput" | "ColorPicker";
type ComponentCategory = "General" | "Drawer" | "Immersion" | "Maps" | "Chat";

/**
 * Declarative definition of a single UI component
 */
interface UIComponent {
	category: ComponentCategory;
	type: ComponentType;
	setting: keyof CRABS_Settings;
	label: string;
	hint: string;
	dependsOn?: keyof CRABS_Settings;
	disabled?: () => boolean;
	onChange?: (value: any) => void;
}

/**
 * UI component with computed layout positions
 */
interface LaidOutComponent extends UIComponent {
	x: number;
	y: number;
	checkboxX: number;
	textX: number;
}

/** Defines which column each category is rendered in */
const CATEGORY_LAYOUT: Record<ComponentCategory, { column: "left" | "right" }> = {
	General: { column: "left" },
	Drawer: { column: "left" },
	Immersion: { column: "right" },
	Maps: { column: "right" },
	Chat: { column: "right" },
};

/**
 * Settings manager responsible for:
 * - Rendering the UI
 * - Handling user interaction
 * - Persisting configuration
 * - Synchronizing game state
 */
export class Settings extends CRABS_Base {
	public static instance: Settings;

	/** Current settings data */
	public data: CRABS_Settings;

	/** Storage key used for persistence */
	private readonly STORAGE_KEY = "CRABS_Settings";

	// Layout constants
	private readonly LEFT_COL_X = 550;
	private readonly RIGHT_COL_X = 1250;
	private readonly CHECKBOX_X_OFFSET = 30;
	private readonly LABEL_X_OFFSET = 120;
	private readonly INDENT_WIDTH = 40;
	private readonly ROW_HEIGHT = 75;

	/** Current vertical scroll offset */
	private scrollOffset = 0;

	/** Maximum scroll range */
	private readonly MAX_SCROLL = 800;

	/** Scroll increment per wheel tick */
	private readonly SCROLL_STEP = 100;

	/** Whether the settings menu is currently open */
	private isMenuOpen = false;

	/** Current search query used for filtering */
	private searchQuery: string = "";

	/**
	 * Declarative registry of all settings
	 * Modify this array to add/remove/reorder settings.
	 */
	private registry: UIComponent[] = [
		{ category: "General", type: "Checkbox", setting: "showBanner", label: "Show Banner on Entry", hint: "Display info banner on room join." },
		{ category: "General", type: "Checkbox", setting: "checkForUpdates", label: "Notify me about updates", hint: "Check for updates." },

		{
			category: "Drawer",
			type: "Checkbox",
			setting: "enableDrawer",
			label: "Enable Drawer UI",
			hint: "Enable the drawer interface.",
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
			dependsOn: "enableDrawer",
			disabled: () => !this.data.enableDrawer
		},
		{
			category: "Drawer",
			type: "Checkbox",
			setting: "showDrawerTab",
			label: "Show Drawer Tab",
			hint: "Display drawer tab.",
			dependsOn: "rosterOpensDrawer",
			disabled: () => !this.data.enableDrawer || !this.data.rosterOpensDrawer
		},
		{
			category: "Drawer",
			type: "Checkbox",
			setting: "animatedCrabsLogo",
			label: "Animated Tab Logo",
			hint: "Animated logo.",
			dependsOn: "showDrawerTab",
			disabled: () => !this.data.showDrawerTab
		},

		{ category: "Drawer", type: "Checkbox", setting: "compactDrawer", label: "Compact Height", hint: "Reduce height.", dependsOn: "enableDrawer", disabled: () => !this.data.enableDrawer },

		{ category: "Immersion", type: "Checkbox", setting: "lockImmersive", label: "Hardcore Lock", hint: "Locks immersive settings." },
		{ category: "Immersion", type: "Checkbox", setting: "immersiveBlind", label: "Respect Blindness", hint: "Blur UI." },
		{ category: "Immersion", type: "Checkbox", setting: "immersiveGag", label: "Respect Gags", hint: "Disable whisper." },
		{ category: "Immersion", type: "Checkbox", setting: "respectBcxRules", label: "Respect BCX Rules", hint: "BCX integration." },

		{ category: "Maps", type: "Checkbox", setting: "showMapCompass", label: "Show Map Compass", hint: "Display compass." },
		{
			category: "Maps",
			type: "Checkbox",
			setting: "mapSuperZoom",
			label: "SuperZoom",
			hint: "Unlock zoom limits.",
			disabled: () => {
				const v = (window as any).ChatRoomMapViewPerceptionRangeMax;
				return v !== undefined && v !== 7 && v !== 50;
			}
		},

		{ category: "Chat", type: "Checkbox", setting: "highlightMentions", label: "Highlight Mentions", hint: "Highlight messages containing your name." },
		{
			category: "Chat",
			type: "TextInput",
			setting: "customHighlightWords",
			label: "Custom Words",
			hint: "Comma-separated list of words.",
			dependsOn: "highlightMentions",
			disabled: () => !this.data.highlightMentions
		},
		{
			category: "Chat",
			type: "ColorPicker",
			setting: "highlightColor",
			label: "Highlight Color",
			hint: "Pick a highlight color.",
			dependsOn: "highlightMentions",
			disabled: () => !this.data.highlightMentions
		},
	];

	/**
	 * Creates a new Settings instance and initializes state.
	 * @param CRABS The mod API instance
	 */
	constructor(CRABS: ModSDKModAPI) {
		super(CRABS);
		Settings.instance = this;
		this.data = this.load();
		this.registerExtension();

		window.addEventListener("wheel", this.handleWheel, { passive: false });
	}

	/**
	 * Loads settings from localStorage and merges with defaults.
	 * @returns The loaded settings object
	 */
	private load(): CRABS_Settings {
		const saved = localStorage.getItem(this.STORAGE_KEY);
		if (saved) {
			try {
				return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
			} catch { }
		}
		return { ...DEFAULT_SETTINGS };
	}

	/**
	 * Saves the current settings to localStorage.
	 */
	public save(): void {
		localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
	}

	/**
	 * Determines if the player is currently restrained.
	 * @returns True if the player is restrained
	 */
	private isRestricted(): boolean {
		return (window as any).Player?.IsRestrained?.() || false;
	}

	/**
	 * Determines whether a setting should be locked (disabled).
	 * Includes both manual dependency rules and immersive locking.
	 * @param component The UI component being evaluated
	 * @returns True if the setting is locked
	 */
	private isSettingLocked(component: UIComponent): boolean {
		if (component.disabled?.()) return true;

		if (this.isRestricted() && this.data.lockImmersive) {
			if (component.setting === "lockImmersive") return true;
			if (component.category === "Immersion" && this.data[component.setting]) return true;
		}

		return false;
	}

	/**
	 * Handles mouse wheel scrolling within the settings UI.
	 * @param event The wheel event
	 */
	private handleWheel = (event: WheelEvent): void => {
		if (!this.isMenuOpen) return;

		if (event.deltaY > 0) this.scrollOffset = Math.min(this.MAX_SCROLL, this.scrollOffset + this.SCROLL_STEP);
		else this.scrollOffset = Math.max(0, this.scrollOffset - this.SCROLL_STEP);
	};

	/**
	 * Filters the registry based on the current search query.
	 * Ensures parent dependencies remain visible when children match.
	 * @returns Filtered list of UI components
	 */
	private getFilteredRegistry(): UIComponent[] {
		if (!this.searchQuery.trim()) return this.registry;

		const query = this.searchQuery.toLowerCase();
		const result = new Set<UIComponent>();

		for (const c of this.registry) {
			const matches =
				c.label.toLowerCase().includes(query) ||
				c.hint.toLowerCase().includes(query);

			if (matches) {
				result.add(c);

				let current = c;
				while (current.dependsOn) {
					const parent = this.registry.find(x => x.setting === current.dependsOn);
					if (!parent) break;
					result.add(parent);
					current = parent;
				}
			}
		}

		return this.registry.filter(c => result.has(c));
	}

	/**
	 * Computes the layout for all visible components.
	 * Handles column placement, vertical flow, and indentation.
	 * @returns Array of components with calculated positions
	 */
	private computeLayout(): LaidOutComponent[] {
		const filtered = this.getFilteredRegistry();

		const result: LaidOutComponent[] = [];

		let leftY = 200 - this.scrollOffset;
		let rightY = 200 - this.scrollOffset;

		const grouped: Record<string, UIComponent[]> = {};
		for (const c of filtered) (grouped[c.category] ||= []).push(c);

		for (const [category, components] of Object.entries(grouped) as [ComponentCategory, UIComponent[]][]) {
			const isRight = CATEGORY_LAYOUT[category].column === "right";
			const baseX = isRight ? this.RIGHT_COL_X : this.LEFT_COL_X;

			let currentY = isRight ? rightY : leftY;
			currentY += 60;

			for (const c of components) {
				const indent = this.getIndent(c) * this.INDENT_WIDTH;

				result.push({
					...c,
					x: baseX,
					y: currentY,
					checkboxX: baseX + this.CHECKBOX_X_OFFSET + indent,
					textX: baseX + this.LABEL_X_OFFSET + indent,
				});

				currentY += this.ROW_HEIGHT;
			}

			const boxHeight = components.length * this.ROW_HEIGHT + 40;
			if (isRight) rightY += boxHeight + 20;
			else leftY += boxHeight + 20;
		}

		return result;
	}

	/**
	 * Calculates indentation depth based on dependency chain.
	 * @param component The component to evaluate
	 * @returns Indentation depth level
	 */
	private getIndent(component: UIComponent): number {
		let depth = 0;
		let current = component;

		while (current.dependsOn) {
			depth++;
			current = this.registry.find(c => c.setting === current.dependsOn)!;
		}

		return depth;
	}

	/**
	 * Renders the settings UI and all visible components.
	 */
	public draw(): void {
		const { DrawCheckbox, DrawText } = window as any;

		const layout = this.computeLayout();

		(window as any).ElementPosition("CRABS_Search", 1200, 120, 400, 50);

		if (this.searchQuery && layout.length === 0) {
			DrawText("No matching settings found", 1200, 500, "Black", "Gray");
			return;
		}

		for (const c of layout) {
			const locked = this.isSettingLocked(c);
			const color = locked ? "#888" : "Black";

			if (c.type === "Checkbox") {
				DrawCheckbox(c.checkboxX, c.y - 32, 64, 64, "", this.data[c.setting], locked);
				DrawText(c.label, c.textX, c.y, color, "");
			}
		}
	}

	/**
	 * Handles click interactions for all UI components.
	 * Toggles values and triggers associated hooks.
	 */
	public click(): void {
		const layout = this.computeLayout();

		for (const c of layout) {
			if (c.type === "Checkbox" && !this.isSettingLocked(c)) {
				if ((window as any).MouseIn(c.checkboxX, c.y - 32, 450, 64)) {
					const newValue = !this.data[c.setting];
					this.data[c.setting] = newValue;
					c.onChange?.(newValue);

					this.save();
					this.syncGameState();
					return;
				}
			}
		}
	}

	/**
	 * Synchronizes certain settings with base game variables.
	 * Currently handles map zoom override.
	 */
	public syncGameState(): void {
		const v = (window as any).ChatRoomMapViewPerceptionRangeMax;
		if (v !== undefined && v !== 7 && v !== 50) return;

		(window as any).ChatRoomMapViewPerceptionRangeMax = this.data.mapSuperZoom ? 50 : 7;
	}

	/**
	 * Registers UI elements such as the search input field.
	 * Ensures elements are created only once.
	 */
	private registerExtension(): void {
		const global = window as any;

		if (!document.getElementById("CRABS_Search")) {
			global.ElementCreateInput("CRABS_Search", "text", "", 300);

			const input = document.getElementById("CRABS_Search") as HTMLInputElement;
			if (input) {
				input.placeholder = "Search settings...";
				input.addEventListener("input", (e) => {
					this.searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
				});
			}
		}
	}
}
