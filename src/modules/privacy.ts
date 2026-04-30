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

		// Define the action function separately so we can modify it
		const toggleAction = () => {
			const mode = Settings.instance.data.privacyModeFull ? "full" : "left";
			this.toggle(mode);
			return true;
		};

		// HACK: Trick the base game into reading our custom name by overriding the function's name property
		Object.defineProperty(toggleAction, "name", { value: { EN: "Toggle Privacy Mode" } });

		globalWindow.KeyManager.registerKeybinding({
			id: 'crabs_privacy_toggle',
			action: toggleAction,
			description: { EN: "Instantly blanks out the chat room based on your CRABS settings." },

			// FIX: An empty array means NO prerequisites. It will fire globally, even when typing in chat!
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
			} else {
				this.overlay.style.width = "100vw";
			}

			this.overlay.style.display = "block";
		} else {
			this.overlay.style.display = "none";
		}
	}
}
