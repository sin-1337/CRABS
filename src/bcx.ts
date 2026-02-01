let bcxModApi: BCX_ModAPI | null = null;

/**
 * Wrapped for initialization of our own mod access to BCX's configuration.
 * 
 * This must be called *after* login, otherwise it'll break as BCX doesn't install `window.bcx` before that.
 */
export function getBcxApi(): BCX_ModAPI | null {
    if (!window.bcx) return null;
    if (!bcxModApi) {
        bcxModApi = window.bcx.getModApi(NICKNAME);
    }
    return bcxModApi;
}

/**
 * Check for BCX's availability and rule state
 */
export function isBCXRuleEnforced<ID extends BCX_Rule>(name: ID): boolean {
    const api = getBcxApi();
    if (!api) return false; // BCX not available, don't bother.
    const rule = api.getRuleState(name);
    return !rule?.isEnforced;
}