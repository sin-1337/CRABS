import { Settings } from "./settings";

export class PrivacyMode {
	private isVisible: boolean = false;
	private overlay: HTMLDivElement;
	private monitorTimer: number | null = null; // Track our screen watcher

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

		if (!globalWindow.KeyManager || !globalWindow.KeyManager.getContext('always')) {
			setTimeout(() => this.registerNativeKeybind(), 500);
			return;
		}

		if (!globalWindow.KeyManager.getCategory('crabs')) {
			globalWindow.KeyManager.registerCategory({
				id: 'crabs',
				name: { EN: 'CRABS Mod' }
			});
		}

		const toggleAction = () => {
			const mode = Settings.instance.data.privacyModeFull ? "full" : "left";
			this.toggle(mode);
			return true;
		};

		Object.defineProperty(toggleAction, "name", { value: { EN: "Toggle Privacy Mode" } });

		globalWindow.KeyManager.registerKeybinding({
			id: 'crabs_privacy_toggle',
			action: toggleAction,
			description: { EN: "Instantly blanks out the chat room based on your CRABS settings." },
			contextIds: [],
			categoryId: 'crabs',
			readonly: false,
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
				this.startMonitoring(); // Start watching for screen changes
			} else {
				this.overlay.style.width = "100vw";
				this.stopMonitoring(); // Ensure it doesn't auto-close if full-screen mode is used
			}

			this.overlay.style.display = "block";
		} else {
			this.overlay.style.display = "none";
			this.stopMonitoring(); // Clean up the timer
		}
	}

	// --- SCREEN TRACKING ---

	private startMonitoring(): void {
		this.stopMonitoring(); // Clear any existing timer

		// Check the game state 5 times a second while the overlay is active
		this.monitorTimer = window.setInterval(() => {
			const globalWindow = window as any;

			// If they leave the main chat room view OR open a character dialog (Wardrobe, Profile, Settings)
			if (globalWindow.CurrentScreen !== "ChatRoom" || globalWindow.CurrentCharacter !== null) {
				// Force the privacy block to close
				this.isVisible = false;
				this.overlay.style.display = "none";
				this.stopMonitoring();
			}
		}, 200);
	}

	private stopMonitoring(): void {
		if (this.monitorTimer !== null) {
			window.clearInterval(this.monitorTimer);
			this.monitorTimer = null;
		}
	}
}
