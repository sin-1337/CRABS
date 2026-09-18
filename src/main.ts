/**
 * CRABS Main Entry Point
 *
 * Bootstraps the CRABS mod inside the Bondage Club client environment.
 * Guards against multiple injection vectors (FUSAM, userscripts, bookmarklets),
 * registers the mod with BCModSDK, wires base-class static delegates,
 * instantiates core feature modules, binds CLI commands, and activates
 * runtime state synchronization.
 *
 * @module main
 */

import bcModSDK from "bondage-club-mod-sdk";
import {
  Banner,
  ChatManager,
  CLI,
  Drawer,
  Help,
  Performance,
  PrivacyMode,
  Roster,
  Settings,
  Orchestrator,
  Updater,
  WhisperPlus,
  Tutorial,
} from "modules";

// Global build-time constants injected via bundler (e.g. Rollup / esbuild / Webpack)
declare const __NICKNAME__: string;
declare const __NAME__: string;
declare const __VERSION__: string;

declare global {
  interface Window {
    __CRABS_LOADED__?: boolean;
    __CRABS_LOADER__?: string;
    FUSAM?: unknown;
    fusam?: unknown;
    unsafeWindow?: Window;
    CRABS?: {
      sdk: ReturnType<typeof bcModSDK.registerMod>;
      settings: Settings;
      drawer: Drawer;
      banner: Banner;
      whisperPlus: WhisperPlus;
      roster: Roster;
      help: Help;
      tutorial: Tutorial;
      orchestrator: Orchestrator;
      performance: Performance;
    };
  }
}

/**
 * Inspects the execution context, global namespace markers, active script tags,
 * and current call stack frames to identify which loader or injection method
 * triggered script execution.
 *
 * @function detectLoaderMethod
 * @returns {string} Human-readable descriptor of the identified loader mechanism.
 */
function detectLoaderMethod(): string {
  // Check for FUSAM global exposure
  if (
    typeof window.FUSAM !== "undefined" ||
    typeof window.fusam !== "undefined"
  ) {
    return "FUSAM Mod Manager";
  }

  // Inspect the active script tag source if present
  const currentScript = document.currentScript as HTMLScriptElement | null;
  if (currentScript?.src) {
    if (
      currentScript.src.startsWith("blob:") ||
      currentScript.src.startsWith("data:")
    ) {
      return "Userscript Manager (Blob/Data Injection)";
    }
    if (
      currentScript.src.includes("tampermonkey") ||
      currentScript.src.includes("violentmonkey")
    ) {
      return "Userscript Manager";
    }
    return `External Script (${currentScript.src})`;
  }

  // Inspect stack trace signatures
  const stack = new Error().stack || "";
  if (
    stack.includes("chrome-extension://") ||
    stack.includes("moz-extension://")
  ) {
    return "Browser Extension Direct Inject";
  }
  if (stack.includes("userscript.html") || stack.includes("tampermonkey")) {
    return "Userscript Manager";
  }

  return "Console / Bookmarklet / Direct Injection";
}

// ─────────────────────────────────────────────────────────────
// Bootstrap Entry Guard & Initialization Routine
// ─────────────────────────────────────────────────────────────

/**
 * Primary self-executing bootstrap routine. Validates single-instance execution
 * guards, registers with BCModSDK, mounts submodules, and exposes the global debug API.
 *
 * @function bootstrap
 * @returns {void}
 */
(() => {
  // Check both internal window marker and BCModSDK registry
  const isAlreadyRegistered =
    typeof bcModSDK !== "undefined" &&
    bcModSDK.getModsInfo().some((mod) => mod.name === __NICKNAME__);

  if (window.__CRABS_LOADED__ || isAlreadyRegistered) {
    const currentLoader = detectLoaderMethod();
    const originalLoader = window.__CRABS_LOADER__ || "Unknown Origin";

    console.warn(
      `[CRABS] Injection collision detected: Attempted reload via "${currentLoader}", ` +
        `but CRABS is already active (originally loaded via "${originalLoader}"). Aborting.`,
    );
    return;
  }

  // Record active loader context and set guard flag
  const loaderMethod = detectLoaderMethod();
  window.__CRABS_LOADED__ = true;
  window.__CRABS_LOADER__ = loaderMethod;

  console.log(`[CRABS] Bootstrapping v${__VERSION__} (via ${loaderMethod})`);

  // Register the mod instance with Bondage Club Mod SDK
  const CRABS = bcModSDK.registerMod({
    name: __NICKNAME__,
    fullName: __NAME__,
    version: __VERSION__,
    repository: "https://github.com/sin-1337/CRABS",
  });

  // ─────────────────────────────────────────────────────────────
  // Module Instantiation
  // ─────────────────────────────────────────────────────────────

  const SETTINGS = new Settings(CRABS);
  Settings.onLanguageChanged = () => {
    Orchestrator.redrawBanner();
  };

  const BANNER = new Banner(CRABS);
  const WHISPERPLUS = new WhisperPlus(CRABS);
  const ROSTER = new Roster(CRABS);
  const HELP = new Help(CRABS);
  const TUTORIAL = new Tutorial(CRABS);
  const DRAWER = new Drawer(CRABS);

  new PrivacyMode(CRABS);
  new ChatManager(CRABS, ROSTER);

  // Lifecycle manager handling room transitions and safe hook recovery
  const ORCHESTRATOR = new Orchestrator(CRABS, ROSTER, BANNER);
  new Updater(CRABS, __VERSION__);
  const PERFORMANCE = new Performance(CRABS);

  // Register command-line interface commands
  new CLI({
    crabs: CRABS,
    whisperPlus: WHISPERPLUS,
    roster: ROSTER,
    help: HELP,
    orchestrator: ORCHESTRATOR,
    performance: PERFORMANCE,
    tutorial: TUTORIAL,
  });

  // ─────────────────────────────────────────────────────────────
  // Post-Init Hook Activation & State Sync
  // ─────────────────────────────────────────────────────────────

  WHISPERPLUS.setupHooks();
  SETTINGS.syncGameState();

  // Expose mod handles to DevTools console (supports userscript sandboxes)
  const targetWindow =
    typeof window.unsafeWindow !== "undefined" ? window.unsafeWindow : window;

  targetWindow.CRABS = {
    sdk: CRABS,
    settings: SETTINGS,
    drawer: DRAWER,
    banner: BANNER,
    whisperPlus: WHISPERPLUS,
    roster: ROSTER,
    help: HELP,
    tutorial: TUTORIAL,
    orchestrator: ORCHESTRATOR,
    performance: PERFORMANCE,
  };

  console.log(`CRABS v${__VERSION__} Loaded successfully`);
})();
