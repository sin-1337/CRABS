/**
 * CRABS Main Entry Point
 *
 * Bootstraps the CRABS mod inside the Bondage Club client environment.
 * Registers the mod with BCModSDK, wires base-class static delegates,
 * instantiates core feature modules, binds CLI commands, and activates
 * runtime state synchronization.
 *
 * @module main
 */

import bcModSDK from "bondage-club-mod-sdk";
import {
  Assets,
  Banner,
  ChatManager,
  CLI,
  Drawer,
  Help,
  Notification,
  Performance,
  PrivacyMode,
  Roster,
  Settings,
  Setup,
  Updater,
  WhisperPlus,
  Tutorial,
} from "modules";
import { CRABS_Base } from "base";

// Global build-time constants injected via bundler (e.g. Rollup / esbuild / Webpack)
declare const __NICKNAME__: string;
declare const __NAME__: string;
declare const __VERSION__: string;
declare const Commands: Array<{ Tag: string; Action: (args: string) => void }>;

// Register the mod instance with Bondage Club Mod SDK
const CRABS = bcModSDK.registerMod({
  name: __NICKNAME__,
  fullName: __NAME__,
  version: __VERSION__,
  repository: "https://github.com/sin-1337/CRABS",
});

// Print startup banner immediately to confirm execution even if downstream components throw
console.log(`CRABS v${__VERSION__} Loading`);

// ─────────────────────────────────────────────────────────────
// Delegate Configuration
// ─────────────────────────────────────────────────────────────
// Wire static delegates onto CRABS_Base to decouple the base layer from concrete modules

CRABS_Base.setIconRenderer((key: string, tooltip: string, cssClass?: string) =>
  Assets.printimage({
    key: key as any,
    tooltip_override: tooltip,
    css_class_override: cssClass,
  }),
);

CRABS_Base.setNotifyHandler((message: string, title?: string) =>
  Notification.send({ message, title }),
);

CRABS_Base.setHelpHandler(() => {
  if (Settings.instance?.data?.rosterOpensDrawer) {
    Drawer.open("help");
  } else {
    for (const [_, command] of Commands.entries()) {
      if (command.Tag === "crabs") {
        command.Action("help");
        break;
      }
    }
  }
});

// ─────────────────────────────────────────────────────────────
// Module Instantiation
// ─────────────────────────────────────────────────────────────

const SETTINGS = new Settings(CRABS);
const BANNER = new Banner(CRABS);
const WHISPERPLUS = new WhisperPlus(CRABS);
const ROSTER = new Roster(CRABS);
const HELP = new Help(CRABS);
const TUTORIAL = new Tutorial(CRABS);

new PrivacyMode(CRABS);
new ChatManager(CRABS, ROSTER);
new Drawer(CRABS, ROSTER, HELP, WHISPERPLUS);

// Lifecycle manager handling room transitions and safe hook recovery
const SETUP = new Setup(CRABS, ROSTER, BANNER);
new Updater(CRABS, __VERSION__);
const PERFORMANCE = new Performance(CRABS);

// Register command-line interface commands
new CLI({
  crabs: CRABS,
  whisperPlus: WHISPERPLUS,
  roster: ROSTER,
  help: HELP,
  setup: SETUP,
  performance: PERFORMANCE,
  tutorial: TUTORIAL,
});

// ─────────────────────────────────────────────────────────────
// Post-Init Hook Activation & State Sync
// ─────────────────────────────────────────────────────────────

WHISPERPLUS.setupHooks();
SETTINGS.syncGameState();

// Confirm complete loading status in developer tools
console.log(`CRABS v${__VERSION__} Loaded`);
