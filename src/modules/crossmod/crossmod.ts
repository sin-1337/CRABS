/**
 * CRABS Cross-Mod Integration Module
 *
 * This module provides cross-mod integration capabilities for the CRABS mod.
 * It enables:
 * - Detection and identification of other installed mods
 * - Integration with other mods' APIs and features
 * - Compatibility checking between mods
 * - Shared functionality between CRABS and other mods
 */

import bcModSdk from "bondage-club-mod-sdk";

declare const __NICKNAME__: string;

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
    try {
      const modlist = bcModSdk?.getModsInfo?.() ?? [];
      return (
        Array.isArray(modlist) &&
        modlist.some((modInfo) => modInfo?.name === targetmod)
      );
    } catch {
      return false;
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
   *  WCE (Bondage Club Enhanced) Integration
   * ══════════════════════════════════════════════════════════════════════ */

  /**
   * Checks if WCE / BCE is installed and active.
   */
  static isWCEInstalled(): boolean {
    const win = window as any;
    return (
      CrossMod.detectMod("Bondage Club Enhanced") ||
      CrossMod.detectMod("WCE") ||
      typeof win.fbcSettings !== "undefined"
    );
  }

  /**
   * Checks if WCE's past profiles tracking feature is actively enabled.
   */
  static isWCEPastProfilesEnabled(): boolean {
    if (!CrossMod.isWCEInstalled()) return false;

    const win = window as any;

    // Method 1: Check if WCE exposed its settings object globally
    const settings = win.fbcSettings;
    if (typeof settings !== "undefined" && settings !== null) {
      return settings.pastProfiles !== false;
    }

    // Method 2: Fallback check against game commands array
    const commandsList = win.Commands;
    if (Array.isArray(commandsList)) {
      return commandsList.some((cmd: any) => cmd?.Tag === "profiles");
    }

    return false;
  }

  /* ══════════════════════════════════════════════════════════════════════
   *  BCX Integration
   * ══════════════════════════════════════════════════════════════════════ */
  static bcxModApi: any = null;

  /**
   * Initializes and returns the BCX Mod API instance for CRABS.
   */
  protected static getBcxApi(): any | null {
    const win = window as any;
    if (!win.bcx?.getModApi) return null;

    if (!CrossMod.bcxModApi) {
      try {
        CrossMod.bcxModApi = win.bcx.getModApi(
          typeof __NICKNAME__ !== "undefined" ? __NICKNAME__ : "CRABS",
        );
      } catch (err) {
        console.error("[CRABS] Failed to acquire BCX Mod API:", err);
        return null;
      }
    }
    return CrossMod.bcxModApi;
  }

  /**
   * Retrieves the current state of a specific BCX rule.
   */
  static getBCXRuleState(name: string): any | null {
    try {
      const api = CrossMod.getBcxApi();
      return api?.getRuleState?.(name) ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Determines if a specific BCX rule is currently enforced.
   */
  static isBCXRuleEnforced(name: string): boolean {
    const rule = CrossMod.getBCXRuleState(name);
    return Boolean(rule?.isEnforced);
  }

  /* ══════════════════════════════════════════════════════════════════════
   *  AFC Integration
   * ══════════════════════════════════════════════════════════════════════ */

  /**
   * Initializes and returns the AFC API instance or global settings container.
   */
  protected static getAfcApi(): any | null {
    if (!CrossMod.detectMod("AbundantiaFlorumChromatica")) return null;
    const win = window as any;
    return win.Liko?.AFC ?? win.AFC ?? null;
  }

  /**
   * Safely retrieves all registered lovers from the AFC mod API or shared settings.
   */
  static getAFCLovers(): any[] {
    try {
      const api = CrossMod.getAfcApi();

      if (typeof api?.getLovers === "function") {
        const lovers = api.getLovers();
        if (Array.isArray(lovers)) return lovers;
      }

      if (Array.isArray(api?.sharedSettings?.lovers)) {
        return api.sharedSettings.lovers;
      }

      const win = window as any;
      const afcSettings =
        win.Player?.OnlineSharedSettings?.AFC ??
        win.Player?.OnlineSettings?.AFC ??
        win.AFCSettings;

      if (Array.isArray(afcSettings?.lovers)) {
        return afcSettings.lovers;
      }
    } catch (err) {
      console.error("[CRABS] Error resolving AFC lovers:", err);
    }

    return [];
  }

  /**
   * Checks if a specific player is recognized strictly as an AFC extended lover.
   */
  static isAFCExtendedLover(memberNumber: number): boolean {
    try {
      const win = window as any;
      const lovership = win.Player?.Lovership;

      if (Array.isArray(lovership)) {
        const isNative = lovership.some(
          (l: any) => (l?.MemberNumber ?? l?.memberNumber) === memberNumber,
        );
        if (isNative) return false;
      }

      const lovers = CrossMod.getAFCLovers();
      return lovers.some(
        (l: any) => (l?.memberNumber ?? l?.MemberNumber) === memberNumber,
      );
    } catch {
      return false;
    }
  }

  /**
   * Backward-compatible alias for isAFCExtendedLover.
   */
  static isAFCLover(memberNumber: number): boolean {
    return CrossMod.isAFCExtendedLover(memberNumber);
  }

  /**
   * Safely retrieves room data for an AFC lover.
   */
  static getAFCLoverRoom(memberNumber: number): any | null {
    try {
      const api = CrossMod.getAfcApi();
      if (typeof api?.getLoverRoom === "function") {
        return api.getLoverRoom(memberNumber) ?? null;
      }

      const win = window as any;
      return win.AFCLoversPrivateRoom?.[memberNumber] ?? null;
    } catch {
      return null;
    }
  }
}
