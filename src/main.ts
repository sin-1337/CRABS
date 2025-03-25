// import section
import bcModSDK from 'bondage-club-mod-sdk';
import Roster from "./modules/roster";
import WhisperPlus from "./modules/whisperplus";


// configure the version and mod name
const VERSION = "0.0.2.9";
const NAME = "Crazy Roster Add-on By Sin";
const NICKNAME = "CRABS";

//these are in em units
const ICON_HEIGHT = 24;
const ICON_WIDTH = 24;

//register the mod
const CRABS = bcModSDK.registerMod({
    name: NICKNAME,
    fullName: NAME,
    version: VERSION,
    repository: "https://github.com/sin-1337/CRABS",
});

const WHISPERPLUS = new WhisperPlus();
const ROSTER = new Roster(ICON_HEIGHT, ICON_WIDTH);


// TODO: create ui to turn this off!!
// TODO: reformat this output maybe?
// set up a handler for room entry
ChatRoomRegisterMessageHandler({
  Description: "Send room stats on entry.",
  Priority: 0, // trigger immediately
  Callback: (data) => {
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
          return false;
        }

        // get player permissions
        const currentPermissionText = `${TextGetInScope(
          "Screens/Character/InformationSheet/Text_InformationSheet.csv",
          "PermissionLevel" + Player.ItemPermission.toString()
        )} (${Player.ItemPermission})`;

        // format and display the player permissions
        ChatRoomSendLocal(`
                  <hr>
                  <div style="padding-left: 5px; padding-right-5px; padding-bottom: 1px; padding-top: 0;">
                    <span style="display: inline; margin: 0; padding: 0; line-height: 1; color: #5BA3E0; font-weight: bold;">Player Item Permission: </span>
                    <span style="display: inline; margin: 0; padding: 0; line-height: 1; color: ${Player.LabelColor}; font-weight: bold; text-shadow: 0 0 1px black;">${currentPermissionText}</span>
                    <span style="display: inline; margin: 0; padding: 0; line-height: 1; color: #5BA3E0; font-weight: bold;">&nbsp;</span>
                  </div>
                `);

        // output room details
        ChatRoomSendLocal(
          "<div>Room details for: " + ChatRoomData.Name + "</div>"
        );
        for (let index in Commands) {
          index = parseInt(index);
          if (Commands[index].Tag === "players") {
            Commands[index].Action("count");
            break;
          }
        }

        // output message letting players know how to view the full roster
        ChatRoomSendLocal("<div>To see the full roster use /players</div><hr>");
      }, 3600);
    }

    // must return false to allow other handlers to work with the data
    return false;
  },
});

// implements the whisper+ command
CommandCombine([
    {
        Tag: "whisper+",
        Description: "Enables the /whisper+ command that is global to a map room",
        Action: (args) => {
            WHISPERPLUS.whisperplus(args);
        },
    },
]);

// implements the /players command
CommandCombine([
    {
        Tag: "players",
        Description: "Show the player count, helpful in maps.",
        Action: (args) => {
            ROSTER.displayroster(args);
        },
    }
]); 

// Start the initialization process
WHISPERPLUS.initWPlus();
