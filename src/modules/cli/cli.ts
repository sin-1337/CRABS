import bcModSDK from "bondage-club-mod-sdk";
import { WhisperPlus } from "../whisperplus";
import { Roster } from "../roster";
import { Help } from "../help";
import { Drawer } from "../drawer";
import { Settings } from "../settings";
import { Assets } from "../assets";
import { Setup } from "../setup";
import { Notification } from "../notifications";
import { Performance } from "../performance";
import { Tutorial } from "../tutorial";
import { CRABS_Base } from "../base";
import locales from "./i18n.json";

export interface CliDependencies {
  crabs: ReturnType<typeof bcModSDK.registerMod>;
  whisperPlus: WhisperPlus;
  roster: Roster;
  help: Help;
  setup: Setup;
  performance: Performance;
  tutorial: Tutorial;
}

export class CLI extends CRABS_Base {
  private whisperPlus: WhisperPlus;
  private roster: Roster;
  private help: Help;
  private setup: Setup;
  private performance: Performance;
  private tutorial: Tutorial;

  constructor(deps: CliDependencies) {
    super(deps.crabs, "cli", locales);

    this.whisperPlus = deps.whisperPlus;
    this.roster = deps.roster;
    this.help = deps.help;
    this.setup = deps.setup;
    this.performance = deps.performance;
    this.tutorial = deps.tutorial;

    this.registerCommands();
  }

  private argcheck(commandArguments: string): boolean {
    const splitArgs = commandArguments.toLowerCase().trim().split(/\s+/);
    const arg = splitArgs[0];
    const opensDrawer = Settings.instance.data.rosterOpensDrawer;

    // --- Add Tutorial Here ---
    if (arg === "tutorial") {
      const forceRestart =
        splitArgs[1] === "reset" || splitArgs[1] === "restart";
      this.tutorial.startTutorial(forceRestart);
      return false; // Returns false so the roster doesn't print
    }

    if (arg === "help") {
      if (opensDrawer) {
        Drawer.toggle("help");
        return false;
      }
      this.help.buildui(this.help.showHelp(), "CRABS_Help");
      const helpButton = document.getElementById("CRABS_Help_Icon");
      if (helpButton) helpButton.style.display = "none";
      return false;
    } else if (arg === "history") {
      if (opensDrawer) {
        Drawer.toggle("history");
        return false;
      }
    } else if (arg === "version") {
      ChatRoomSendLocal(
        `${__NAME__} (${__NICKNAME__}) <br>Version: ${__VERSION__}`,
      );
      return false;
    } else if (arg === "banner") {
      this.setup.drawbanner();
      return false;
    } else if (arg === "perf" || arg === "status") {
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
    } else if (arg === "mem" || arg === "inspect") {
      this.performance.inspectBaseGameMemory();
      ChatRoomSendLocal(this.t("perf_mem_inspect"));
      return false;
    } else if (arg === "flush" || arg === "purge") {
      this.performance.pruneBaseGameCaches();
      ChatRoomSendLocal(this.t("perf_flushed"));
      return false;
    }

    const validPrintArgs = ["print", "count", "admins", "vips", "all"];
    if (arg === "" || validPrintArgs.includes(arg)) {
      return true;
    }

    ChatRoomSendLocal(this.t("unrecognized_arg", { arg }));
    return false;
  }

  private commandRedirect(command: string, commandArguments: string): void {
    for (const [_unused, cmd] of Commands.entries()) {
      if (cmd.Tag === command) {
        cmd.Action(commandArguments, command);
        break;
      }
    }
  }

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
            Drawer.toggle("roster");
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

          const getMessages = (entry?: Record<string, string[]>): string[] => {
            if (!entry) return [];
            const active = CRABS_Base.getActiveLocale();
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
          const splitArgs = commandArguments.toLowerCase().split(" ");
          if (splitArgs.length < 1 || !commandArguments.trim()) {
            ChatRoomSendLocal(this.t("dropkeys_missing_arg"));
            return;
          }
          if (!ChatRoomMapViewIsActive()) {
            ChatRoomSendLocal(this.t("dropkeys_not_map"));
            return;
          }

          for (let index = 0; index < splitArgs.length; index++) {
            const arg = splitArgs[index];
            if (arg === "bronze" || arg === "all") {
              if (Player.MapData.PrivateState.HasKeyBronze) {
                Player.MapData.PrivateState.HasKeyBronze = false;
                ChatRoomSendLocal(
                  this.t("dropkeys_dropped", {
                    color: this.t("keys.bronze"),
                  }),
                );
              }
            }
            if (arg === "silver" || arg === "all") {
              if (Player.MapData.PrivateState.HasKeySilver) {
                Player.MapData.PrivateState.HasKeySilver = false;
                ChatRoomSendLocal(
                  this.t("dropkeys_dropped", {
                    color: this.t("keys.silver"),
                  }),
                );
              }
            }
            if (arg === "gold" || arg === "all") {
              if (Player.MapData.PrivateState.HasKeyGold) {
                Player.MapData.PrivateState.HasKeyGold = false;
                ChatRoomSendLocal(
                  this.t("dropkeys_dropped", {
                    color: this.t("keys.gold"),
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
              ChatRoomSendLocal(this.t("dropkeys_invalid_arg", { arg }));
            }
          }
        },
      },
    ]);
  }
}
