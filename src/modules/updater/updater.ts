/**
 * CRABS Updater Module
 *
 * Automated GitHub release polling, semantic version comparison,
 * channel resolution (Alpha/Beta/Stable), and non-intrusive update notification delivery.
 *
 * @module updater
 */

import { CRABS_Base } from "../base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Notification } from "../notifications";
import { Settings } from "../settings";
import locales from "./i18n.json";

/**
 * Background updater controller.
 *
 * Periodically polls the remote GitHub repository for newer versions along the
 * client's active distribution branch, deduplicating alerts via localStorage
 * to avoid prompting the player multiple times for the same release.
 */
export class Updater extends CRABS_Base {
  /** Local version string currently running in the client (e.g., "1.0.0-Beta"). */
  private currentVersion: string;

  /** Distribution channel branch resolved from the version tag. */
  private branch: string;

  /** Target raw GitHub URL for checking the branch's manifest version. */
  private versionUrl: string;

  /** Interval ID for recurring background update checks, or `null` if inactive. */
  private updateIntervalId: number | null = null;

  /** Key used to store the latest notified version in localStorage. */
  private readonly STORAGE_KEY = "CRABS_NotifiedVersion";

  /** Delay interval between remote version checks in milliseconds (1 hour). */
  private checkIntervalMs: number = 60 * 60 * 1000;

  /**
   * Initializes the updater, determines the active repository branch,
   * schedules the initial post-login check, and starts periodic polling.
   *
   * @param CRABS - Instantiated ModSDK API bridge.
   * @param currentVersion - Current version string of the installed mod.
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
   * Parses the version string to match the appropriate GitHub branch.
   *
   * @private
   * @param version - Version string to evaluate.
   * @returns Resolved branch name ("Alpha", "Beta", or "Stable").
   */
  private determineBranch(version: string): string {
    const lowerVersion = version.toLowerCase();
    if (lowerVersion.includes("alpha")) return "Alpha";
    if (lowerVersion.includes("beta")) return "Beta";
    return "Stable";
  }

  /**
   * Queries the remote manifest and displays an alert if an unacknowledged newer release is found.
   *
   * @private
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
   * Cancels and clears the active background polling interval timer.
   *
   * @private
   */
  private stopPolling(): void {
    if (this.updateIntervalId !== null) {
      window.clearInterval(this.updateIntervalId);
      this.updateIntervalId = null;
    }
  }

  /**
   * Compares two semantic version strings by numerical components.
   *
   * @private
   * @param local - Installed client version string.
   * @param remote - Remote manifest version string.
   * @returns True if the remote version is strictly newer than the local version.
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
   * Dispatches visual update notifications and prints a local message into the chat log.
   *
   * @private
   * @param newVersion - Remote release version string discovered.
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
