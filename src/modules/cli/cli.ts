import bcModSDK from "bondage-club-mod-sdk";
import {
  WhisperPlus,
  Roster,
  Help,
  Drawer,
  Settings,
  Assets,
  Setup,
  Notification,
  Performance,
} from "../index";
import { CRABS_Base } from "../base";
import * as locales from "./i18n";

export interface CliDependencies {
  crabs: ReturnType<typeof bcModSDK.registerMod>;
  whisperPlus: WhisperPlus;
  roster: Roster;
  help: Help;
  setup: Setup;
  performance: Performance;
}

export class CLI extends CRABS_Base {
  protected moduleNamespace = "cli";

  private whisperPlus: WhisperPlus;
  private roster: Roster;
  private help: Help;
  private setup: Setup;
  private performance: Performance;

  constructor(deps: CliDependencies) {
    // Pass mod instance and namespace into base class constructor
    super(deps.crabs, "cli");

    // Register CLI's i18n bundles under the "cli" namespace
    for (const [lang, bundle] of Object.entries(locales)) {
      this.registerTranslations("cli", lang, bundle);
    }

    this.whisperPlus = deps.whisperPlus;
    this.roster = deps.roster;
    this.help = deps.help;
    this.setup = deps.setup;
    this.performance = deps.performance;

    this.registerCommands();
  }

  private argcheck(commandArguments: string): boolean {
    const splitArgs = commandArguments.toLowerCase().split(" ");
    const arg = splitArgs[0];

    if (arg === "help") {
      this.help.buildui(this.help.showHelp(), "CRABS_Help");
      const helpButton = document.getElementById("CRABS_Help_Icon");
      if (helpButton) helpButton.style.display = "none";
      return false;
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
          this.commandRedirect("roster", commandArguments);
        },
      },
      {
        Tag: "crab",
        Description: this.t("crab_desc"),
        Action: (commandArguments: string) => {
          const trimmedArgs = commandArguments.trim().toLowerCase();

          if (!trimmedArgs) {
            const noArgMessages: string[] =
              (locales.en as any).crab_easter_egg?.no_args ?? [];
            ChatRoomSendLocal(
              noArgMessages[Math.floor(Math.random() * noArgMessages.length)],
            );
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

          const failTemplates: string[] =
            (locales.en as any).crab_easter_egg?.fail_messages ?? [];
          const template =
            failTemplates[Math.floor(Math.random() * failTemplates.length)] ||
            "";
          ChatRoomSendLocal(template.replace("{arg}", commandArguments));
        },
      },
      {
        Tag: "roster",
        Description: this.t("roster_desc"),
        Action: (commandArguments: string) => {
          if (Settings.instance.data.rosterOpensDrawer && !commandArguments) {
            Drawer.updateVisibility();
            Drawer.toggle();
            return;
          }

          if (this.argcheck(commandArguments)) {
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
