import { Settings } from "./settings";

export class PrivacyMode {
	private isVisible: boolean = false;
	private overlay: HTMLDivElement;

	constructor() {
		// Create the blackout element once on initialization
		this.overlay = document.createElement("div");
		this.overlay.id = "CRABS-privacy-overlay";
		this.overlay.style.display = "none";
		this.overlay.style.position = "fixed";
		this.overlay.style.top = "0";
		this.overlay.style.left = "0";
		this.overlay.style.bottom = "0";
		this.overlay.style.backgroundColor = "black";
		this.overlay.style.zIndex = "999999";
		document.body.appendChild(this.overlay);

		// Hook into the base game's key manager
		this.registerNativeKeybind();
	}

	private registerNativeKeybind() {
		const globalWindow = window as any;

		// The KeyManager might take a split second to initialize on game load.
		// If it isn't ready, wait 500ms and try again.
		if (!globalWindow.KeyManager) {
			setTimeout(() => this.registerNativeKeybind(), 500);
			return;
		}

		// Register a custom category for your mod in the Keybindings menu!
		if (!globalWindow.KeyManager.getCategory('crabs')) {
			globalWindow.KeyManager.registerCategory({
				id: 'crabs',
				name: { EN: 'CRABS Mod' } // Shows up as a header in the menu
			});
		}

		// Register the actual keybinding
		globalWindow.KeyManager.registerKeybinding({
			id: 'crabs_privacy_toggle',
			action: () => {
				// Read the mode preference from your settings when the key is pressed
				const mode = Settings.instance.data.privacyModeFull ? "full" : "left";
				this.toggle(mode);

				return true; // Returns true to tell the game engine we handled this input
			},
			contextIds: ['always'], // The base game context that allows it to fire on any screen
			categoryId: 'crabs',    // Puts it under your custom category header
			readonly: false,        // Lets the user change the keybind in the UI

			// The default fallback (Ctrl + Shift + Alt + B)
			defaultKeyCombo: {
				key: 'KeyB',
				modifiers: new Set(['Ctrl', 'Shift', 'Alt'])
			}
		});
	}

	public toggle(userPreferredMode: "left" | "full"): void {
		this.isVisible = !this.isVisible;

		if (this.isVisible) {
			const globalWindow = window as any;
			const currentScreen = globalWindow.CurrentScreen;

			// Context-Aware Sizing:
			if (currentScreen === "ChatRoom" && userPreferredMode === "left") {
				this.overlay.style.width = "50vw";
			} else {
				this.overlay.style.width = "100vw";
			}

			this.overlay.style.display = "block";
		} else {
			this.overlay.style.display = "none";
		}
	}
}
