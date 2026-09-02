// main.ts
// entry point for CRABS

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
} from "./modules";
import { CRABS_Base } from "./modules/base";

// Register the mod
const CRABS = bcModSDK.registerMod({
  name: __NICKNAME__,
  fullName: __NAME__,
  version: __VERSION__,
  repository: "https://github.com/sin-1337/CRABS",
});

// Print version early, so you know what version is running even if it fails
console.log(`CRABS v${__VERSION__} Loading`); // do not remove

// Wire Base class static delegates to prevent circular dependencies
CRABS_Base.setIconRenderer((key, tooltip, cssClass) =>
  Assets.printimage({
    key: key as any,
    tooltip_override: tooltip,
    css_class_override: cssClass,
  }),
);

CRABS_Base.setNotifyHandler((message, title) =>
  Notification.send({ message, title }),
);

CRABS_Base.setHelpHandler(() => {
  if (Settings.instance?.data?.rosterOpensDrawer) {
    Drawer.openHelp();
  } else {
    for (const [_, command] of Commands.entries()) {
      if (command.Tag === "crabs") {
        command.Action("help");
        break;
      }
    }
  }
});

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

// Print version and confirm load success in console
console.log(`CRABS v${__VERSION__} Loaded`); // do not remove
