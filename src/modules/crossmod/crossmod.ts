/**
 * CRABS Cross-Mod Integration Module
 *
 * This module provides cross-mod integration capabilities for the CRABS mod.
 * It enables:
 * - Detection and identification of other installed mods
 * - Integration with other mods' APIs and features
 * - Compatibility checking between mods
 * - Shared functionality between CRABS and other mods
 *
 * The cross-mod module allows CRABS to work harmoniously with other
 * bondage club mods and extend its functionality through integration.
 */

import bcModSdk from "bondage-club-mod-sdk";

/**
 * Static class for handling integration and compatibility with other mods.
 */
export abstract class CrossMod {
  /**
   * Checks if a specific mod is currently installed and active.
   *
   * @param {string} targetmod - The name of the mod to detect.
   * @returns {boolean} True if the mod is found, false otherwise.
   */
  static detectMod(targetmod: string): boolean {
    let modlist = bcModSdk.getModsInfo();
    return modlist.filter((modInfo) => modInfo.name == targetmod).length > 0;
  }

  /* ══════════════════════════════════════════════════════════════════════
   *  WCE (Bondage Club Enhanced) Integration
   * ══════════════════════════════════════════════════════════════════════ */

  /**
   * Checks if WCE / BCE is installed and active.
   */
  static isWCEInstalled(): boolean {
    return (
      CrossMod.detectMod("Bondage Club Enhanced") ||
      CrossMod.detectMod("WCE") ||
      typeof (window as any).fbcSettings !== "undefined"
    );
  }

  /**
   * Checks if WCE's past profiles tracking feature is actively enabled.
   */
  static isWCEPastProfilesEnabled(): boolean {
    if (!CrossMod.isWCEInstalled()) return false;

    // Method 1: Check if WCE exposed its settings object globally (legacy fallback)
    const settings = (window as any).fbcSettings;
    if (typeof settings !== "undefined") {
      return settings.pastProfiles !== false;
    }

    // Method 2: Bulletproof fallback.
    // WCE only registers the /profiles command if the setting is enabled.
    const globalWindow = window as any;
    const commandsList = globalWindow.Commands;

    if (Array.isArray(commandsList)) {
      return commandsList.some((cmd: any) => cmd.Tag === "profiles");
    }

    return false;
  }

  /* ══════════════════════════════════════════════════════════════════════
   *  BCX Integration
   * ══════════════════════════════════════════════════════════════════════ */
  /** Static reference to the BCX Mod API instance. */
  static bcxModApi: BCX_ModAPI | null = null;

  /**
   * Initializes and returns the BCX Mod API instance for CRABS.
   * This should be called after login to ensure BCX is fully loaded.
   *
   * @returns {BCX_ModAPI | null} The BCX Mod API instance or null if unavailable.
   */
  protected static getBcxApi(): BCX_ModAPI | null {
    if (!window.bcx) return null;
    if (!CrossMod.bcxModApi) {
      CrossMod.bcxModApi = window.bcx.getModApi(__NICKNAME__);
    }
    return CrossMod.bcxModApi;
  }

  /**
   * Retrieves the current state of a specific BCX rule.
   *
   * @template ID
   * @param {ID} name - The identifier of the BCX rule.
   * @returns {BCX_RuleStateAPI<ID> | null} The rule state API or null if unavailable.
   */
  static getBCXRuleState<ID extends BCX_Rule>(
    name: ID,
  ): BCX_RuleStateAPI<ID> | null {
    const api = CrossMod.getBcxApi();
    if (!api) return null;
    return api.getRuleState(name);
  }

  /**
   * Determines if a specific BCX rule is currently enforced.
   *
   * @template ID
   * @param {ID} name - The identifier of the BCX rule.
   * @returns {boolean} True if the rule is enforced, false otherwise.
   */
  static isBCXRuleEnforced<ID extends BCX_Rule>(name: ID): boolean {
    const rule = CrossMod.getBCXRuleState(name);
    return !!rule?.isEnforced;
  }

  /* ══════════════════════════════════════════════════════════════════════
   *  AFC Integration
   * ══════════════════════════════════════════════════════════════════════ */
  /**
   * Initializes and returns the AFC API instance.
   *
   * @returns {any | null} The AFC API instance or null if unavailable.
   */
  protected static getAfcApi(): any | null {
    // Change "AFC" to the exact name the mod uses to register with ModSDK
    if (!CrossMod.detectMod("AFC")) return null;
    return (window as any).Liko?.AFC || null;
  }

  /**
   * Safely retrieves all registered lovers from the AFC mod API.
   *
   * @returns {any[]} Array of AFC lover objects, or empty array if unavailable.
   */
  static getAFCLovers(): any[] {
    const api = CrossMod.getAfcApi();
    if (api && typeof api.getLovers === "function") {
      return api.getLovers() || [];
    }
    return [];
  }

  /**
   * Checks if a specific player is recognized as a lover under AFC.
   *
   * @param {number} memberNumber - The member number to check.
   * @returns {boolean} True if the player is an AFC lover.
   */
  static isAFCLover(memberNumber: number): boolean {
    const lovers = CrossMod.getAFCLovers();
    return lovers.some(
      (l: any) =>
        l.memberNumber === memberNumber || l.MemberNumber === memberNumber,
    );
  }

  /**
   * Safely retrieves room data for an AFC lover.
   *
   * @param {number} memberNumber - Target member number.
   * @returns {any | null} Room data or null if not available.
   */
  static getAFCLoverRoom(memberNumber: number): any | null {
    const api = CrossMod.getAfcApi();
    if (api && typeof api.getLoverRoom === "function") {
      return api.getLoverRoom(memberNumber);
    }
    return null;
  }
}
