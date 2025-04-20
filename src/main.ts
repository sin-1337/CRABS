// import section
import bcModSDK from "bondage-club-mod-sdk";
import Roster from "./modules/roster";
import WhisperPlus from "./modules/whisperplus";
import Banner from "./modules/banner";
import Help from "./modules/help";

// configure the version and mod name
const VERSION = "1.0.0.181 Alpha";
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
  }
  return true;
}

// implements the whisper+ command
CommandCombine([
  {
    Tag: "whisper+",
    Description:
      "Enables the /whisper+ command that does global whisper in a map room",
    Action: (args: any, command: any) => {
      WHISPERPLUS.whisperplus(args, command);
    },
  },
]);

CommandCombine([
  {
    Tag: "w+",
    Description:
      "Enables the /w+ command that does global whisper in a map room",
    Action: (args: any, command: any) => {
      WHISPERPLUS.whisperplus(args, command);
    },
  },
]);

// implements the /crabs command
CommandCombine([
  {
    Tag: "crabs",
    Description: "Show the player count, helpful in maps.",
    Action: (args: any) => {
      if (argcheck(args)) ChatRoomSendLocal(ROSTER.buildroster(args));
      ROSTER.initScrollingOverflow();
    },
  },
]);

// implements the /roster command
CommandCombine([
  {
    Tag: "roster",
    Description: "Show the player count, helpful in maps.",
    Action: (args: any) => {
      if (argcheck(args)) ChatRoomSendLocal(ROSTER.buildroster(args));
      ROSTER.initScrollingOverflow();
    },
  },
]);

// implements the /players command
CommandCombine([
  {
    Tag: "players",
    Description: "Deprecated: Show the player count, helpful in maps.",
    Action: (args: any) => {
      if (argcheck(args)) ChatRoomSendLocal(ROSTER.buildroster(args));
      ROSTER.initScrollingOverflow();
    },
  },
]);
