// import section
import bcModSDK from "bondage-club-mod-sdk";
import Roster from "./modules/roster";
import WhisperPlus from "./modules/whisperplus";
import Banner from "./modules/banner";
import Help from "./modules/help";

// configure the version and mod name
const VERSION = "1.1.0.197 Alpha";
const NAME = "Crazy Roster Add-on By Sin";
const NICKNAME = "CRABS";

//register the mod
const CRABS = bcModSDK.registerMod({
  name: NICKNAME,
  fullName: NAME,
  version: VERSION,
  repository: "https://github.com/sin-1337/CRABS",
});

const BANNER = new Banner(CRABS);
const WHISPERPLUS = new WhisperPlus(CRABS);
const ROSTER = new Roster(CRABS);
const HELP = new Help(CRABS);

// TODO: create ui to turn this off!!
// TODO: reformat this output maybe?
// set up a handler for room entry
// This sets up the banner!
ChatRoomRegisterMessageHandler({
  Description: "Send room stats on entry.",
  Priority: 0, // trigger immediately
  Callback: (data: any) => {
    let output: string = "";
    // check if we are a player and we entered a room
    if (
      data.Type === "Action" &&
      data.Content === "ServerEnter" &&
      data.Sender === Player.MemberNumber
    ) {
      // work on a delay
      setTimeout(() => {
        // if the player left the room, bail!
        if (Player.LastChatRoom === null) {
          // Must return false, even if we are bailing out!
          return false;
        }

        // call the action to draw the banner
        output = BANNER.drawBanner(NAME, VERSION);
        output = output.replace(
          "{{RosterCounters}}",
          ROSTER.buildroster("count", false)
        );
        ChatRoomSendLocal(output);
        ElementScrollToEnd("TextAreaChatLog");
      }, 3600);
    }

    // Must return false to allow other handlers to work with the data.
    return false;
  },
});

function argcheck(args: string): boolean {
  const SPLITARGS = args.split(" ");
  if (SPLITARGS[0].toLowerCase() == "help") {
    ChatRoomSendLocal(HELP.showhelp());
    return false;
  } else if (SPLITARGS[0].toLowerCase() == "version") {
    ChatRoomSendLocal(`${NAME} (${NICKNAME}) <br>Version: ${VERSION}`);
    return false;
  }
  return true;
}

function commandRedirect(command: string, args: string): void {
  for (const [_, COMMAND] of Commands.entries()) {
    if (COMMAND.Tag === command) {
      COMMAND.Action(args);
      break;
    }
  }
}

// implements the whisper+ command
CommandCombine([
  {
    Tag: "whisper+",
    Description:
      "Enables the /whisper+ command that does global whisper in a map room",
    Action: (args: string, command: string) => {
      WHISPERPLUS.whisperplus(args, command);
    },
  },
]);

CommandCombine([
  {
    Tag: "w+",
    Description:
      "Enables the /w+ command that does global whisper in a map room",
    Action: (args: string, command: string) => {
      WHISPERPLUS.whisperplus(args, command);
    },
  },
]);

// implements the /crabs command
CommandCombine([
  {
    Tag: "crabs",
    Description: "Show the player count, helpful in maps.",
    Action: (args: string) => {
      commandRedirect("roster", args);
    },
  },
]);

// implements the /roster command
CommandCombine([
  {
    Tag: "roster",
    Description: "Show the player count, helpful in maps.",
    Action: (args: string) => {
      if (argcheck(args)) ChatRoomSendLocal(ROSTER.buildroster(args));
      ElementScrollToEnd("TextAreaChatLog");
      ROSTER.initScrollingOverflow();
      const elements = document.querySelectorAll<HTMLDivElement>(
        "div.ChatMessageNonDialogue"
      );

      elements.forEach((el) => {
        el.style.overflow = "visible";
      });
    },
  },
]);

// implements the /players command
CommandCombine([
  {
    Tag: "players",
    Description: "Deprecated: Show the player count, helpful in maps.",
    Action: (args: string) => {
      commandRedirect("roster", args);
    },
  },
]);

// implements /dropkeys command
CommandCombine([
  {
    Tag: "dropkeys",
    Description:
      "Drops the specified keys: gold, silver, or bronze. You can also use all.",
    Action: (args) => {
      const splitArgs = args.toLowerCase().split(" ");
      if (splitArgs.length < 1) {
        ChatRoomSendLocal(
          `You must supply which key to drop, or 'all' to drop them all.`
        );
        return;
      }
      if (!ChatRoomMapViewIsActive()) {
        ChatRoomSendLocal(`Key only work on a map...`);
        return;
      }
      for (let i = 0; i < splitArgs.length; i++) {
        if (splitArgs[i] == "bronze" || splitArgs[i] == "all") {
          if (Player.MapData.PrivateState.HasKeyBronze) {
            Player.MapData.PrivateState.HasKeyBronze = false;
            ChatRoomSendLocal(`Bronze key dropped.`);
          }
        }
        if (splitArgs[i] == "silver" || splitArgs[i] == "all") {
          if (Player.MapData.PrivateState.HasKeySilver) {
            Player.MapData.PrivateState.HasKeySilver = false;
            ChatRoomSendLocal(`Silver key dropped.`);
          }
        }
        if (splitArgs[i] == "gold" || splitArgs[i] == "all") {
          if (Player.MapData.PrivateState.HasKeyGold) {
            Player.MapData.PrivateState.HasKeyGold = false;
            ChatRoomSendLocal(`Gold key dropped.`);
          }
        }
        if (
          splitArgs[i] != "bronze" &&
          splitArgs[i] != "silver" &&
          splitArgs[i] != "gold" &&
          splitArgs[i] != "all"
        ) {
          ChatRoomSendLocal(`Argumet '${splitArgs[i]}', was not understood.`);
        }
      }
    },
  },
]);
