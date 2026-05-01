import { Settings } from "./settings";

export class PrivacyMode {
	private isVisible: boolean = false;
	private isSuspended: boolean = false;
	private overlay: HTMLDivElement;
	private monitorTimer: number | null = null;

	constructor() {
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
		// If it is on OR temporarily suspended, turn it completely off
		if (this.isVisible || this.isSuspended) {
			this.isVisible = false;
			this.isSuspended = false;
			this.overlay.style.display = "none";
			this.stopMonitoring();
			return;
		}

		// Turning it on
		const globalWindow = window as any;
		const inMainChat = globalWindow.CurrentScreen === "ChatRoom" && globalWindow.CurrentCharacter === null;

		if (userPreferredMode === "left") {
			this.overlay.style.width = "50vw";

			// If they trigger it while already inside a menu, suspend it immediately
			if (!inMainChat) {
				this.isSuspended = true;
			} else {
				this.isVisible = true;
				this.overlay.style.display = "block";
			}

			this.startMonitoring();
		} else {
			// Full screen mode ignores menus
			this.isVisible = true;
			this.overlay.style.width = "100vw";
			this.overlay.style.display = "block";
			this.stopMonitoring();
		}
	}

	// --- SCREEN TRACKING ---

	private startMonitoring(): void {
		this.stopMonitoring();

		this.monitorTimer = window.setInterval(() => {
			const globalWindow = window as any;
			const inMainChat = globalWindow.CurrentScreen === "ChatRoom" && globalWindow.CurrentCharacter === null;

			// Suspend the overlay if we leave the main chat
			if (!inMainChat && this.isVisible) {
				this.isVisible = false;
				this.isSuspended = true;
				this.overlay.style.display = "none";
			}
			// Restore the overlay if we return to the main chat
			else if (inMainChat && this.isSuspended) {
				this.isSuspended = false;
				this.isVisible = true;
				this.overlay.style.display = "block";
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
