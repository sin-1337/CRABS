import { CRABS_Base } from "./base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Notification } from "./notifications";

export class Updater extends CRABS_Base {
	private currentVersion: string;
	// Replace this with the URL to your raw package.json or a version.txt file on your repo
	private versionUrl: string = "https://raw.githubusercontent.com/sin-1337/CRABS/main/package.json";

	// Check every 60 minutes
	private checkIntervalMs: number = 60 * 60 * 1000;

	constructor(CRABS: ModSDKModAPI, currentVersion: string) {
		super(CRABS);
		this.currentVersion = currentVersion;

		// Wait 30 seconds after the game loads to do the first check, 
		// so we don't slow down their initial login.
		setTimeout(() => this.checkForUpdates(), 30000);

		// Set the recurring background check
		setInterval(() => this.checkForUpdates(), this.checkIntervalMs);
	}

	private async checkForUpdates(): Promise<void> {
		try {
			// Append a timestamp query to bust the browser cache
			const response = await fetch(`${this.versionUrl}?t=${Date.now()}`);
			if (!response.ok) return;

			const data = await response.json();
			const remoteVersion = data.version; // Assuming you read from a package.json

			if (this.isNewerVersion(this.currentVersion, remoteVersion)) {
				this.promptUserToUpdate(remoteVersion);
			}

		} catch (error) {
			// Silently fail if the network is down or GitHub is unreachable
			if (CRABS_Base.debugMode) console.error("CRABS Updater failed to fetch:", error);
		}
	}

	private isNewerVersion(local: string, remote: string): boolean {
		// Simple semantic versioning check (e.g., "2.1.0" vs "2.1.1")
		const localParts = local.split('.').map(Number);
		const remoteParts = remote.split('.').map(Number);

		for (let i = 0; i < Math.max(localParts.length, remoteParts.length); i++) {
			const l = localParts[i] || 0;
			const r = remoteParts[i] || 0;
			if (r > l) return true;
			if (r < l) return false;
		}
		return false;
	}

	private promptUserToUpdate(newVersion: string): void {
		// Use the CRABS Toast Notification system
		Notification.send({
			title: "🦀 CRABS Update Available!",
			message: `Version ${newVersion} is out! (You are on ${this.currentVersion}). Refresh your page to apply the update.`,
			duration: 15000 // Leave it up for 15 seconds so they have time to read it
		});

		// Optional: Still drop a tiny, non-intrusive note in the local chat log
		// just in case they were AFK when the toast popped up.
		if (typeof ChatRoomSendLocal === "function") {
			ChatRoomSendLocal(`<span style="color: cyan;"><b>CRABS Update:</b> Version ${newVersion} is available. Reload the page to update!</span>`);
		}
	}
}
