/**
 * CRABS Command-Line Interface (CLI) Module
 *
 * Implements in-game chat command handling for the CRABS mod.
 * Key responsibilities:
 * - Registers and parses commands: `/crabs`, `/roster`, `/whisper+`, `/w+`, `/crab`, and `/dropkeys`
 * - Routes user arguments to UI views (Roster, Help, History) or subsystem tools
 * - Supports seamless dispatch between sliding Drawer UI and native chat-log fallbacks
 * - Exposes diagnostics, cache purges, tutorial triggers, and interactive easter eggs
 */

import bcModSDK from "bondage-club-mod-sdk";
import { WhisperPlus } from "../whisperplus/whisperplus";
import { Roster } from "../roster/roster";
import { Help } from "../help/help";
import { Settings } from "../settings/settings";
import { Assets } from "../base";
import { Orchestrator } from "../orchestrator";
import { Notification } from "../notifications/notifications";
import { Performance } from "../performance/performance";
import { Tutorial } from "../tutorial/tutorial";
import { CRABS_Base, Drawer, type DrawerPage, getActiveLocale } from "../base";
import locales from "./i18n.json";

/**
 * Dependency injection mapping for the CLI service.
 */
export interface CliDependencies {
  /** The ModSDK mod instance handle. */
  crabs: ReturnType<typeof bcModSDK.registerMod>;
  /** Messaging enhancement subsystem. */
  whisperPlus: WhisperPlus;
  /** Player roster and tracking subsystem. */
  roster: Roster;
  /** Help view builder and documentation subsystem. */
  help: Help;
  /** Setup and welcome banner subsystem. */
  orchestrator: Orchestrator;
  /** Performance monitor, cache manager, and profiler subsystem. */
  performance: Performance;
  /** Interactive onboarding tutorial workflow. */
  tutorial: Tutorial;
}

/**
 * CLI Command Controller.
 * Binds and routes all chat commands into the appropriate mod modules.
 * @extends CRABS_Base
 */
export class CLI extends CRABS_Base {
  /** Messaging enhancement subsystem. */
  private whisperPlus: WhisperPlus;
  /** Player roster and tracking subsystem. */
  private roster: Roster;
  /** Help view builder and documentation subsystem. */
  private help: Help;
  /** Setup and welcome banner subsystem. */
  private orchestrator: Orchestrator;
  /** Performance monitor, cache manager, and profiler subsystem. */
  private performance: Performance;
  /** Interactive onboarding tutorial workflow. */
  private tutorial: Tutorial;

  /**
   * Initializes the CLI module, injects service dependencies, and registers game command hooks.
   *
   * @param {CliDependencies} deps - Bundled service dependencies required by the CLI.
   */
  constructor(deps: CliDependencies) {
    super(deps.crabs, "cli", locales);

    this.whisperPlus = deps.whisperPlus;
    this.roster = deps.roster;
    this.help = deps.help;
    this.orchestrator = deps.orchestrator;
    this.performance = deps.performance;
    this.tutorial = deps.tutorial;

    this.registerCommands();
  }

  /**
   * Validates and routes arguments passed to `/crabs`.
   * Evaluates system switches, drawer routing, and diagnostics commands.
   *
   * @private
   * @param {string} commandArguments - Raw text following the command tag.
   * @returns {boolean} True if argument is a roster print filter that should render to chat; false if handled internally or invalid.
   */
  private argcheck(commandArguments: string): boolean {
    const splitArgs = commandArguments.toLowerCase().trim().split(/\s+/);
    const arg = splitArgs[0];
    const opensDrawer = Settings.instance.data.rosterOpensDrawer;

    // Drawer pages routing when drawer mode is enabled
    const drawerPages: Record<string, DrawerPage> = {
      roster: "roster",
      help: "help",
      history: "history",
      keys: "keys",
    };

    if (opensDrawer && drawerPages[arg]) {
      Drawer.toggle(drawerPages[arg]);
      return false;
    }

    // Command actions
    if (arg === "tutorial") {
      const forceRestart =
        splitArgs[1] === "reset" || splitArgs[1] === "restart";
      this.tutorial.startTutorial(forceRestart);
      return false;
    }

    // Legacy fallback: renders Help directly into chat when drawer mode is off
    if (arg === "help") {
      this.help.buildui(this.help.showHelp(), "CRABS_Help");
      const helpButton = document.getElementById("CRABS_Help_Icon");
      if (helpButton) helpButton.style.display = "none";
      return false;
    }

    if (arg === "version") {
      ChatRoomSendLocal(
        `${__NAME__} (${__NICKNAME__}) <br>Version: ${__VERSION__}`,
      );
      return false;
    }

    if (arg === "banner") {
      this.orchestrator.drawbanner();
      return false;
    }

    if (arg === "perf" || arg === "status") {
      const levelName = ["NORMAL", "LOW", "CRITICAL"][
        CRABS_Base.currentPerformanceLevel
      ];
      const actualFps = Math.round(
        1000 / ((window as any).TimerRunInterval || 16.67),
      );
      ChatRoomSendLocal(
        this.t("perf_status", { level: levelName, fps: actualFps }),
      );
      return false;
    }

    if (arg === "mem" || arg === "inspect") {
      this.performance.inspectBaseGameMemory();
      ChatRoomSendLocal(this.t("perf_mem_inspect"));
      return false;
    }

    if (arg === "flush" || arg === "purge") {
      this.performance.pruneBaseGameCaches();
      ChatRoomSendLocal(this.t("perf_flushed"));
      return false;
    }

    // Valid roster printing flags fall through to return true
    const validPrintArgs = ["", "print", "count", "admins", "vips", "all"];
    if (validPrintArgs.includes(arg)) {
      return true;
    }

    ChatRoomSendLocal(this.t("unrecognized_arg", { arg }));
    return false;
  }

  /**
   * Forwards command execution to an existing registered chat command handler.
   *
   * @private
   * @param {string} command - The target command tag to route into.
   * @param {string} commandArguments - Arguments to forward to the target action.
   * @returns {void}
   */
  private commandRedirect(command: string, commandArguments: string): void {
    for (const [_unused, cmd] of Commands.entries()) {
      if (cmd.Tag === command) {
        cmd.Action(commandArguments, command);
        break;
      }
    }
  }

  /**
   * Registers all CRABS chat commands into the base game's command engine via `CommandCombine`.
   *
   * @private
   * @returns {void}
   */
  private registerCommands(): void {
    CommandCombine([
      {
        Tag: "whisper+",
        Description: this.t("whisper_desc"),
        Action: (commandArguments: string, command: string) => {
          this.whisperPlus.whisperplus(commandArguments, command);
        },
      },
      {
        Tag: "w+",
        Description: this.t("w_desc"),
        Action: (commandArguments: string) => {
          this.commandRedirect("whisper+", commandArguments);
        },
      },
      {
        Tag: "crabs",
        Description: this.t("crabs_desc"),
        Action: (commandArguments: string) => {
          const trimmed = commandArguments.trim().toLowerCase();
          const opensDrawer = Settings.instance.data.rosterOpensDrawer;

          if (opensDrawer && !trimmed) {
            Drawer.toggle();
            return;
          }

          if (this.argcheck(commandArguments)) {
            if (opensDrawer) {
              Drawer.toggle("roster");
              return;
            }

            this.roster.buildui(
              this.roster.buildroster(commandArguments),
              "CRABS_Roster",
            );
            this.whisperPlus.buildui();
            this.roster.initScrollingOverflow();
          }

          const elements = document.querySelectorAll<HTMLDivElement>(
            "div.ChatMessageNonDialogue",
          );
          elements.forEach((element) => {
            element.style.overflow = "visible";
          });
        },
      },
      {
        Tag: "crab",
        Description: this.t("crab_desc"),
        Action: (commandArguments: string) => {
          const trimmedArgs = commandArguments.trim().toLowerCase();

          /**
           * Resolves localized dialogue strings for crab easter-egg responses.
           *
           * @param {Record<string, string[]>} [entry] - Locale-keyed list of phrases.
           * @returns {string[]} Localized phrases array, falling back through cn/en.
           */
          const getMessages = (entry?: Record<string, string[]>): string[] => {
            if (!entry) return [];
            const active = getActiveLocale();
            let list = entry[active];
            if ((!list || list.length === 0) && active === "tw")
              list = entry["cn"];
            if ((!list || list.length === 0) && active !== "en")
              list = entry["en"];
            return list || [];
          };

          const easterEgg = (locales as any).cli?.crab_easter_egg;

          if (!trimmedArgs) {
            const noArgMessages = getMessages(easterEgg?.no_args);
            if (noArgMessages.length > 0) {
              ChatRoomSendLocal(
                noArgMessages[Math.floor(Math.random() * noArgMessages.length)],
              );
            }
            return;
          }

          if (trimmedArgs === "rave") {
            Assets.PlayAudio("rave");
            Drawer.RaveTab();
            Notification.send({
              message: this.t("crab_easter_egg.rave_message"),
              image: "rave",
              duration: 10000,
            });
            return;
          }

          const failTemplates = getMessages(easterEgg?.fail_messages);
          const template =
            failTemplates.length > 0
              ? failTemplates[Math.floor(Math.random() * failTemplates.length)]
              : "";
          ChatRoomSendLocal(template.replace("{arg}", commandArguments));
        },
      },
      {
        Tag: "roster",
        Description: this.t("roster_desc"),
        Action: (commandArguments: string) => {
          this.commandRedirect("crabs", commandArguments);
        },
      },
      {
        Tag: "dropkeys",
        Description: this.t("dropkeys_desc"),
        Action: (commandArguments: string) => {
          const splitArgs = commandArguments
            .toLowerCase()
            .split(/\s+/)
            .filter(Boolean);
          if (splitArgs.length === 0) {
            (window as any).ChatRoomSendLocal?.(this.t("dropkeys_missing_arg"));
            return;
          }

          for (const arg of splitArgs) {
            if (
              arg === "bronze" ||
              arg === "silver" ||
              arg === "gold" ||
              arg === "all"
            ) {
              this.dropMapKey(arg);
            } else {
              (window as any).ChatRoomSendLocal?.(
                this.t("dropkeys_invalid_arg", { arg }),
              );
            }
          }
        },
      },
    ]);
  }
}
