// main.ts
// entry point for CRABS

import bcModSDK from "bondage-club-mod-sdk";
import {
  Banner,
  WhisperPlus,
  Roster,
  Help,
  Drawer,
  Settings,
  Setup,
  Updater,
  ChatManager,
  PrivacyMode,
  Performance,
  CLI,
} from "./modules";

// register the mod
const CRABS = bcModSDK.registerMod({
  name: __NICKNAME__,
  fullName: __NAME__,
  version: __VERSION__,
  repository: "https://github.com/sin-1337/CRABS",
});

// print version early, so you know what version is running even if it fails.
console.log(`CRABS v${__VERSION__} Loading`); // do not remove

// Initialize all core modules
const SETTINGS = new Settings(CRABS);
const BANNER = new Banner(CRABS);
const WHISPERPLUS = new WhisperPlus(CRABS);
const ROSTER = new Roster(CRABS);
const HELP = new Help(CRABS);
new PrivacyMode(CRABS);
new ChatManager(CRABS, ROSTER);
new Drawer(CRABS, ROSTER, HELP, WHISPERPLUS);

// Initialize the crash-proof Setup module to handle lifecycle hooks and room tracking
const SETUP = new Setup(CRABS, ROSTER, BANNER);
new Updater(CRABS, __VERSION__);
const PERFORMANCE = new Performance(CRABS);

// Register game commands
new CLI({
  crabs: CRABS,
  whisperPlus: WHISPERPLUS,
  roster: ROSTER,
  help: HELP,
  setup: SETUP,
  performance: PERFORMANCE,
});

WHISPERPLUS.setupHooks();
SETTINGS.syncGameState();

// print version and confirm load success in console
console.log(`CRABS v${__VERSION__} Loaded`);
