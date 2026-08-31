import { CRABS_Base } from "../base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Notification } from "../notifications";
import { Settings } from "../settings";
import * as locales from "./i18n";

/**
 * Class handling automatic background updates.
 * Polls the GitHub repository for new versions based on the active branch.
 * Tracks notified versions in localStorage to prevent spamming the user across sessions.
 * @extends CRABS_Base
 */
export class Updater extends CRABS_Base {
  private currentVersion: string;
  private branch: string;
  private versionUrl: string;

  /** The ID of the background polling interval, used to cancel it once an update is found. */
  private updateIntervalId: number | null = null;

  /** The key used to remember which update the user has already been warned about. */
  private readonly STORAGE_KEY = "CRABS_NotifiedVersion";

  /** The frequency of the background checks in milliseconds (1 Hour). */
  private checkIntervalMs: number = 60 * 60 * 1000;

  /**
   * Initializes the Updater, determines the active branch, and manages polling timers.
   *
   * @param {ModSDKModAPI} CRABS - The ModSDK API instance.
   * @param {string} currentVersion - The current version string of the mod (e.g., "1.0.0-Beta").
   */
  constructor(CRABS: ModSDKModAPI, currentVersion: string) {
    super(CRABS, "updater", locales);
    this.currentVersion = currentVersion;
    this.branch = this.determineBranch(currentVersion);
    this.versionUrl = `https://raw.githubusercontent.com/sin-1337/CRABS/refs/heads/${this.branch}/package.json`;

    // Wait 30 seconds after the game loads to do the first network check
    setTimeout(() => this.checkForUpdates(), 30000);

    // Set the recurring background check and store its ID so we can kill it later
    this.updateIntervalId = window.setInterval(
      () => this.checkForUpdates(),
      this.checkIntervalMs,
    );
  }

  /**
   * Parses the current version string to determine the GitHub branch.
   *
   * @param {string} version - The version string.
   * @returns {string} "Alpha", "Beta", or "Stable".
   * @private
   */
  private determineBranch(version: string): string {
    const lowerVersion = version.toLowerCase();
    if (lowerVersion.includes("alpha")) return "Alpha";
    if (lowerVersion.includes("beta")) return "Beta";
    return "Stable";
  }

  /**
   * Fetches the remote package.json and prompts the user if a newer version exists.
   *
   * @private
   * @returns {Promise<void>}
   */
  private async checkForUpdates(): Promise<void> {
    // Obey user preferences
    if (!Settings.instance.data.checkForUpdates) {
      this.stopPolling();
      return;
    }

    try {
      const response = await fetch(`${this.versionUrl}?t=${Date.now()}`);
      if (!response.ok) return;

      const data = await response.json();
      const remoteVersion = data.version;

      // If the remote version is newer than our CURRENT local version
      if (this.isNewerVersion(this.currentVersion, remoteVersion)) {
        // Only notify if we haven't already warned them about THIS specific remote version
        if (localStorage.getItem(this.STORAGE_KEY) !== remoteVersion) {
          localStorage.setItem(this.STORAGE_KEY, remoteVersion);

          // Clear any old update notifications before showing the new one
          Notification.dismiss("Update");
          this.promptUserToUpdate(remoteVersion);
        }
      } else {
        // If they updated or the remote is older/same, clean up
        localStorage.removeItem(this.STORAGE_KEY);
      }
    } catch (error) {
      if (CRABS_Base.debugMode) console.error(`CRABS Updater failed:`, error);
    }
  }

  /**
   * Helper method to cleanly destroy the background polling interval.
   *
   * @private
   * @returns {void}
   */
  private stopPolling(): void {
    if (this.updateIntervalId !== null) {
      window.clearInterval(this.updateIntervalId);
      this.updateIntervalId = null;
    }
  }

  /**
   * Compares two semantic version strings.
   *
   * @param {string} local - The currently installed version.
   * @param {string} remote - The version fetched from GitHub.
   * @returns {boolean} True if the remote version is numerically higher.
   * @private
   */
  private isNewerVersion(local: string, remote: string): boolean {
    const localParts = local
      .replace(/[^0-9.]/g, "")
      .split(".")
      .map(Number);
    const remoteParts = remote
      .replace(/[^0-9.]/g, "")
      .split(".")
      .map(Number);

    for (
      let index = 0;
      index < Math.max(localParts.length, remoteParts.length);
      index++
    ) {
      const localDigit = localParts[index] || 0;
      const remoteDigit = remoteParts[index] || 0;
      if (remoteDigit > localDigit) return true;
      if (remoteDigit < localDigit) return false;
    }
    return false;
  }

  /**
   * Notifies the user visually that an update is available.
   *
   * @param {string} newVersion - The newly available version string.
   * @private
   * @returns {void}
   */
  private promptUserToUpdate(newVersion: string): void {
    Notification.send({
      title: this.t("notification.title"),
      message: this.t("notification.message", {
        newVersion,
        branch: this.branch,
        currentVersion: this.currentVersion,
      }),
      duration: 86400000, // 24 hours: Effectively indefinite until dismissed
      type: "Update",
    });

    if (typeof ChatRoomSendLocal === "function") {
      ChatRoomSendLocal(
        this.t("chat.local_message", {
          newVersion,
          branch: this.branch,
        }),
      );
    }
  }
}
