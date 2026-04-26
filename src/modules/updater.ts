import { CRABS_Base } from "./base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Notification } from "./notifications";

/**
 * Class handling automatic background updates.
 * Polls the GitHub repository for new package.json versions based on the active branch.
 */
export class Updater extends CRABS_Base {
	private currentVersion: string;
	private branch: string;
	private versionUrl: string;

	// Check every 60 minutes
	// private checkIntervalMs: number = 60 * 60 * 1000;
	private checkIntervalMs: number = 60 * 100; // Note: Set this back to 1 hour for production!

	/**
	 * Initializes the Updater, determines the active branch, and starts the polling timers.
	 * @param {ModSDKModAPI} CRABS - The ModSDK API instance.
	 * @param {string} currentVersion - The current version string of the mod (e.g., "1.0.0-Beta").
	 */
	constructor(CRABS: ModSDKModAPI, currentVersion: string) {
		super(CRABS);
		this.currentVersion = currentVersion;

		// Extract branch from the version string
		this.branch = this.determineBranch(currentVersion);

		// Construct the raw GitHub URL targeting the specific branch
		this.versionUrl = `https://raw.githubusercontent.com/sin-1337/CRABS/refs/heads/${this.branch}/package.json`;

		// Wait 30 seconds after the game loads to do the first check, 
		// so we don't slow down their initial login.
		setTimeout(() => this.checkForUpdates(), 30000);

		// Set the recurring background check
		setInterval(() => this.checkForUpdates(), this.checkIntervalMs);
	}

	/**
	 * Parses the current version string to determine the GitHub branch.
	 * @param {string} version - The version string.
	 * @returns {string} "Alpha", "Beta", or "Stable".
	 */
	private determineBranch(version: string): string {
		const lowerVersion = version.toLowerCase();
		if (lowerVersion.includes("alpha")) return "Alpha";
		if (lowerVersion.includes("beta")) return "Beta";
		return "Stable";
	}

	/**
	 * Fetches the remote package.json and prompts the user if a newer version exists.
	 */
	private async checkForUpdates(): Promise<void> {
		try {
			// Append a timestamp query to bust the browser cache
			const response = await fetch(`${this.versionUrl}?t=${Date.now()}`);
			if (!response.ok) return;

			const data = await response.json();
			const remoteVersion = data.version;

			if (this.isNewerVersion(this.currentVersion, remoteVersion)) {
				this.promptUserToUpdate(remoteVersion);
			}

		} catch (error) {
			// Silently fail if the network is down or GitHub is unreachable
			if (CRABS_Base.debugMode) console.error(`CRABS Updater failed to fetch from ${this.branch}:`, error);
		}
	}

	/**
	 * Compares two semantic version strings.
	 * @param {string} local - The currently installed version.
	 * @param {string} remote - The version fetched from GitHub.
	 * @returns {boolean} True if the remote version is numerically higher.
	 */
	private isNewerVersion(local: string, remote: string): boolean {
		// Simple semantic versioning check (e.g., "2.1.0" vs "2.1.1")
		// Note: This strips out letters (like -alpha) and only compares the numbers.
		const localParts = local.replace(/[^0-9.]/g, '').split('.').map(Number);
		const remoteParts = remote.replace(/[^0-9.]/g, '').split('.').map(Number);

		for (let i = 0; i < Math.max(localParts.length, remoteParts.length); i++) {
			const l = localParts[i] || 0;
			const r = remoteParts[i] || 0;
			if (r > l) return true;
			if (r < l) return false;
		}
		return false;
	}

	/**
	 * Notifies the user visually that an update is available.
	 * @param {string} newVersion - The newly available version string.
	 */
	private promptUserToUpdate(newVersion: string): void {
		// Use the CRABS Toast Notification system
		Notification.send({
			title: `🦀 CRABS Update Available!`,
			message: `Version ${newVersion} (${this.branch}) is out! (You are on ${this.currentVersion}). Refresh your page to apply the update.`,
			duration: 15000 // Leave it up for 15 seconds so they have time to read it
		});

		// Optional: Still drop a tiny, non-intrusive note in the local chat log
		// just in case they were AFK when the toast popped up.
		if (typeof ChatRoomSendLocal === "function") {
			ChatRoomSendLocal(`<span style="color: cyan;"><b>CRABS Update:</b> Version ${newVersion} (${this.branch}) is available. Reload the page to update!</span>`);
		}
	}
}
