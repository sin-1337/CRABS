import bcModSdk from "bondage-club-mod-sdk";

export abstract class Mod {

	/** Takes a string target mod name and returns a true if found.
	 *  @param {string} targetmod - String name of the mod.
	 *  @returns {boolean} True if found, false if not.
	 */
	static detectMod(targetmod: string): boolean {
		let modlist = bcModSdk.getModsInfo();
		return modlist.filter((x) => x.name == targetmod).length > 0;
	}

	static bcxModApi: BCX_ModAPI | null = null;

	/**
	 * Wrapped for initialization of our own mod access to BCX's configuration.
	 * 
	 * This must be called *after* login, otherwise it'll break as BCX doesn't install `window.bcx` before that.
	 */
	protected static getBcxApi(): BCX_ModAPI | null {
		if (!window.bcx) return null;
		if (!Mod.bcxModApi) {
			Mod.bcxModApi = window.bcx.getModApi(NICKNAME);
		}
		return Mod.bcxModApi;
	}

	/**
	 * Check for BCX's availability and rule state
	 */
	static isBCXRuleEnforced<ID extends BCX_Rule>(name: ID): boolean {
		const api = Mod.getBcxApi();
		if (!api) return false; // BCX not available, don't bother.
		const rule = api.getRuleState(name);
		return !rule?.isEnforced;
	}

}
