// import section
import bcModSDK from "bondage-club-mod-sdk";
import * as Modules from "./modules";
import loadDOM from "./modules/dom";

// configure the version and mod name
const VERSION = "1.3.1.21 Alpha";
const NAME = "Crazy Roster Add-on By Sin";
const NICKNAME = "CRABS";

//register the mod
const CRABS = bcModSDK.registerMod({
  name: NICKNAME,
  fullName: NAME,
  version: VERSION,
  repository: "https://github.com/sin-1337/CRABS",
});

const BANNER = new Modules.Banner(CRABS);
const WHISPERPLUS = new Modules.WhisperPlus(CRABS);
const ROSTER = new Modules.Roster(CRABS);
const HELP = new Modules.Help(CRABS);
loadDOM();

// print version and load success in console
console.log(`CRABS v${VERSION} Loaded`);  // do not remove

/*
 * Attaches an event listener to any object matching the supplied class
 *
 *@param classname - (string) name of the class you are looking for
 *@param action - (string) name of the function you want to call when the event is triggered
 *@param data - (string) [optional] arguments to the function, MUST be camel   
 *                                  case... ex: playerNumber
 *@param arg - (string) [optional] direct argument to pass, mutually exclusive with data, if passed, data ignored.
 *@param event - (string) [default = click] type of event you wish this to trigger on
 */
function attachEvent(
  classname: string,
  action: string,
  data?: string,
  arg?: string,
  event: string = "click"
): void {
  const CHAT = document.getElementById("TextAreaChatLog");

  if (!CHAT) return; // if chat is not found, bail
  // Select all roster links
  const ELEMENTS = CHAT.getElementsByClassName(
    classname
  ) as HTMLCollectionOf<HTMLElement>;

  // Attach event listeners to all roster links
  for (const ELEMENT of ELEMENTS) {
    ELEMENT.addEventListener(event, (e) => { // add listener
      const TARGET = e.currentTarget as HTMLElement; // capture target
      if (arg) {
        (window as any)[action](arg);
        return;
      }
      if (data) {
        const DATA = TARGET.dataset[data]; // parse data
        (window as any)[action](DATA);
        return;
      } else {
        (window as any)[action]();
        return;
      }
    });
  }
}

/*
 * draws the banner
 */
function drawbanner() {
  let output: string = "";
  // if the player left the room, bail!
  if (Player.LastChatRoom === null) {
    // Must return false, even if we are bailing out!
    return false;
  }

  // configure extra roster input to the banner
  // TODO: make this optional in the future
  let extradata = {
    RosterCounters: ROSTER.buildroster("count", false),
  };
  output = BANNER.drawBanner(NAME, VERSION, extradata);

  // call the action to draw the banner
  BANNER.sendoutput(output, "CRABS_Banner");

  // make the roster footer /roster a clickable url
  attachEvent("CRABS_banner_rosterlink", "printRoster");

  // make the close button functional
  attachEvent("CRABS_close", "crabsCloseItem", undefined, "CRABS_Banner");
}

// TODO: create ui to turn this off!!
// TODO: This only triggers on rooms I didn't make, why?
// set up a handler for room entry
// This sets up the banner!
ChatRoomRegisterMessageHandler({
  Description: "Send room stats on entry.",
  Priority: 0, // trigger immediately
  Callback: (data: any) => {
    // check if we are a player and we entered a room
    if (
      data.Type === "Action" &&
      data.Content === "ServerEnter" &&
      data.Sender === Player.MemberNumber
    ) {
      // work on a delay
      setTimeout(() => {
        // configure extra roster input to the banner
        if(!ChatRoomData) return; // bail if ChatRoomData isn't initialized 
        drawbanner();
      }, 3600);
    }

    // Must return false to allow other handlers to work with the data.
    return false;
  },
});

function argcheck(args: string): boolean {
  const SPLITARGS = args.split(" ");
  if (SPLITARGS[0].toLowerCase() == "help") {
    HELP.sendoutput(HELP.showhelp(VERSION), "CRABS_Help");
    attachEvent("CRABS_close", "crabsCloseItem", undefined, "CRABS_Help");
    return false;
  } else if (SPLITARGS[0].toLowerCase() == "version") {
    ChatRoomSendLocal(`${NAME} (${NICKNAME}) <br>Version: ${VERSION}`);
    return false;
  } else if (SPLITARGS[0].toLowerCase() == "banner") {
    drawbanner();
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
      if (argcheck(args))
        ROSTER.sendoutput(ROSTER.buildroster(args), "CRABS_Roster");
      ROSTER.initScrollingOverflow();
      const elements = document.querySelectorAll<HTMLDivElement>(
        "div.ChatMessageNonDialogue"
      );

      elements.forEach((element) => {
        element.style.overflow = "visible";
      });

      //attach intractable roster events
      attachEvent("CRABS_player-badge", "PlayerFocus", "playerNumber");
      attachEvent("CRABS_player-id", "sendWhisper", "playerNumber");
      attachEvent("CRABS_close", "crabsCloseItem", undefined, "CRABS_Roster");
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
    Action: (args: string) => {
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
          ChatRoomSendLocal(`Argument '${splitArgs[i]}', was not understood.`);
        }
      }
    },
  },
]);
