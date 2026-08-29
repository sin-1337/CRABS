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
	static getBCXRuleState<ID extends BCX_Rule>(name: ID): BCX_RuleStateAPI<ID> | null {
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

}
