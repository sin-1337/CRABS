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
  Assets,
  Setup,
  Notification,
  Updater,
  ChatManager,
  PrivacyMode,
  Performance,
} from "./modules";
import { CRABS_Base } from "./modules/base";
import mainEn from "./i18n/en.json";

// register the mod
const CRABS = bcModSDK.registerMod({
  name: __NICKNAME__,
  fullName: __NAME__,
  version: __VERSION__,
  repository: "https://github.com/sin-1337/CRABS",
});

// Register root-level translations under the "main" namespace
const normLang = CRABS_Base.normalizeLocale("en");
const translations = (CRABS_Base as any).translations;
if (translations) {
  if (!translations[normLang]) translations[normLang] = {};
  translations[normLang]["main"] = mainEn;
}

// Helper to translate main namespace keys concisely
const t = (key: string, params?: Record<string, string | number>) =>
  CRABS_Base.translate(`main.${key}`, params);

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
new Performance(CRABS);

WHISPERPLUS.setupHooks();
SETTINGS.syncGameState();

// print version and confirm load success in console
console.log(`CRABS v${__VERSION__} Loaded`); // do not remove

/**
 * Validates and processes basic mod commands.
 *
 * @param {string} commandArguments - The string of arguments passed to the command.
 * @returns {boolean} Returns true if the command should proceed to the next handler, false otherwise.
 */
function argcheck(commandArguments: string): boolean {
  const splitArgs = commandArguments.toLowerCase().split(" ");
  const arg = splitArgs[0];

  if (arg === "help") {
    HELP.buildui(HELP.showHelp(), "CRABS_Help");
    const HELPBUTTON = document.getElementById("CRABS_Help_Icon");
    if (HELPBUTTON) HELPBUTTON.style.display = "none";
    return false;
  } else if (arg === "version") {
    ChatRoomSendLocal(
      `${__NAME__} (${__NICKNAME__}) <br>Version: ${__VERSION__}`,
    );
    return false;
  } else if (arg === "banner") {
    SETUP.drawbanner();
    return false;
  }

  // Allowlist of words that are allowed to print the roster to the chat log
  const validPrintArgs = ["print", "count", "admins", "vips", "all"];

  // If there's no argument, or it's a valid print argument, return true to build the roster
  if (arg === "" || validPrintArgs.includes(arg)) {
    return true;
  }

  // If it's a nonsense word, catch it here and return false so the roster doesn't print
  ChatRoomSendLocal(t("commands.unrecognized_arg", { arg }));
  return false;
}

/**
 * Redirects a command to its corresponding action.
 *
 * @param {string} command - The tag of the command to redirect.
 * @param {string} commandArguments - The arguments to pass to the command action.
 * @returns {void}
 */
function commandRedirect(command: string, commandArguments: string): void {
  for (let [_unused, COMMAND] of Commands.entries()) {
    if (COMMAND.Tag === command) {
      COMMAND.Action(commandArguments, command);
      break;
    }
  }
}

// implements the whisper+ command
CommandCombine([
  {
    Tag: "whisper+",
    Description: t("commands.whisper_desc"),
    Action: (commandArguments: string, command: string) => {
      WHISPERPLUS.whisperplus(commandArguments, command);
    },
  },
]);

// implements the /w+ command as a synonym for the whisper+ command
CommandCombine([
  {
    Tag: "w+",
    Description: t("commands.w_desc"),
    Action: (commandArguments: string) => {
      commandRedirect("whisper+", commandArguments);
    },
  },
]);

// implements the /crabs command as a synonym for /roster
CommandCombine([
  {
    Tag: "crabs",
    Description: t("commands.crabs_desc"),
    Action: (commandArguments: string) => {
      commandRedirect("roster", commandArguments);
    },
  },
]);

// Easter egg command
CommandCombine([
  {
    Tag: "crab",
    Description: t("commands.crab_desc"),
    Action: (commandArguments: string) => {
      const trimmedArgs = commandArguments.trim().toLowerCase();

      if (!trimmedArgs) {
        const noArgMessages = [
          "The crab is confused. Maybe try telling it what to do?",
          "The crab clicks its claws at you. Maybe try giving it an argument?",
          "A tiny crab scuttles by, ignores you, and disappears into a hole. It seems to want a command.",
          "You shout at the crab. It does nothing. It looks like it's waiting for a specific word.",
          "The crab is currently on lunch break. Try back later with some instructions.",
          "ERROR: Crab not found. Please provide an argument to locate the crab.",
        ];
        ChatRoomSendLocal(
          noArgMessages[Math.floor(Math.random() * noArgMessages.length)],
        );
        return;
      }

      if (trimmedArgs === "rave") {
        Assets.PlayAudio("rave");
        Drawer.RaveTab();
        Notification.send({
          message: t("commands.crab_easter_egg.rave_message"),
          image: "rave",
          duration: 10000,
        });
        return;
      }

      const failMessages = [
        "Trying it... nope, not that one.",
        `The crab looks confused. '${commandArguments}'? Is that even a word?`,
        `You try to make the crab ${commandArguments}. It pinches you in response. Ouch!`,
        `The crab tries its best to ${commandArguments}, but it just ends up spinning in circles.`,
        "The crab remains unimpressed.",
      ];
      ChatRoomSendLocal(
        failMessages[Math.floor(Math.random() * failMessages.length)],
      );
    },
  },
]);

// implements the /roster command
CommandCombine([
  {
    Tag: "roster",
    Description: t("commands.roster_desc"),
    Action: (commandArguments: string) => {
      if (Settings.instance.data.rosterOpensDrawer && !commandArguments) {
        Drawer.updateVisibility();
        Drawer.toggle();
        return;
      }

      if (argcheck(commandArguments)) {
        ROSTER.buildui(ROSTER.buildroster(commandArguments), "CRABS_Roster");
        WHISPERPLUS.buildui();
        ROSTER.initScrollingOverflow();
      }
      const elements = document.querySelectorAll<HTMLDivElement>(
        "div.ChatMessageNonDialogue",
      );

      elements.forEach((element) => {
        element.style.overflow = "visible";
      });
    },
  },
]);

// implements /dropkeys command
CommandCombine([
  {
    Tag: "dropkeys",
    Description: t("commands.dropkeys_desc"),
    Action: (commandArguments: string) => {
      const splitArgs = commandArguments.toLowerCase().split(" ");
      if (splitArgs.length < 1 || !commandArguments.trim()) {
        ChatRoomSendLocal(t("commands.dropkeys_missing_arg"));
        return;
      }
      if (!ChatRoomMapViewIsActive()) {
        ChatRoomSendLocal(t("commands.dropkeys_not_map"));
        return;
      }
      for (let index = 0; index < splitArgs.length; index++) {
        const arg = splitArgs[index];
        if (arg === "bronze" || arg === "all") {
          if (Player.MapData.PrivateState.HasKeyBronze) {
            Player.MapData.PrivateState.HasKeyBronze = false;
            ChatRoomSendLocal(
              t("commands.dropkeys_dropped", {
                color: t("commands.keys.bronze"),
              }),
            );
          }
        }
        if (arg === "silver" || arg === "all") {
          if (Player.MapData.PrivateState.HasKeySilver) {
            Player.MapData.PrivateState.HasKeySilver = false;
            ChatRoomSendLocal(
              t("commands.dropkeys_dropped", {
                color: t("commands.keys.silver"),
              }),
            );
          }
        }
        if (arg === "gold" || arg === "all") {
          if (Player.MapData.PrivateState.HasKeyGold) {
            Player.MapData.PrivateState.HasKeyGold = false;
            ChatRoomSendLocal(
              t("commands.dropkeys_dropped", {
                color: t("commands.keys.gold"),
              }),
            );
          }
        }
        if (
          arg !== "bronze" &&
          arg !== "silver" &&
          arg !== "gold" &&
          arg !== "all"
        ) {
          ChatRoomSendLocal(t("commands.dropkeys_invalid_arg", { arg }));
        }
      }
    },
  },
]);
