// import section
import Roster from "./modules/roster";
import WhisperPlus from "./modules/whisperplus";
//
const VERSION = "1.0.0";
const NAME = "Crazy Roster Add-on By Sin";
const NICKNAME = "CRABS";

const CRABS = bcModSDK.registerMod({
    name: NICKNAME,
    fullName: NAME,
    version: VERSION,
    repository: "https://github.com/sin-1337/CRABS",
});


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
                // parse arguments into membernumber and messsage
                const MEMBERNUMBER = parseInt(args.slice(0, args.indexOf(" ")));
                let message = args.slice(args.indexOf(" ") + 1);
                console.log(message);

                // if membernumber is not a valid number, bail
                if (Number.isNaN(MEMBERNUMBER)) {
                    ChatRoomSendLocal("Member number is invalid.");
                    return 1;
                }

                if (message == "") {
                    ChatRoomSendLocal("Message was blank");
                    return 1;
                }

                const WHISPERPLUS = new WhiserPlus();

                // find player based no membernumber
                const TARGET = ChatRoomCharacter.find(
                    (C) => C.MemberNumber == MEMBERNUMBER
                );
                WHISPERPLUS.ChatRoomSendWhisperRanged(TARGET, message);
            },
    },
]);

// implements the /players command
CommandCombine([
    {
        Tag: "players",
        Description: "Show the player count, helpful in maps.",
        Action: (args) => {
            const SPLITARGS = args.split(" ");
            const ROSTER = new Roster(25, 25);
            if (SPLITARGS[0].toLowerCase() == "help") {
                ChatRoomSendLocal(ROSTER.showhelp());
                return;
            }:with

            let me_output_html = ""; // holds data about user who ran script
            let admin_output_html = ""; // holds admins
            let vip_output_html = ""; // holds whitelisted users
            let player_output_html = ""; // holds normal players
            let player; // the person we found in the room
            let admin_count = 0; // number of admins in the room
            let badge = ""; // holds the admin icon if the player is an admin
            let player_icons = ""; // holds the list of player/status icons (string)

            // filter variables, show or not show certain output
            let showme = true; // person who ran the script (you)
            let showadmins = true; // room admins
            let showvip = true; // room whitelists
            let showplayers = true; // normal players


            //get a list of players
            for (let person in ChatRoomData.Character) {
                // find membernumber for current player in list
                MemberNumber = ChatRoomData.Character[person].MemberNumber;

                // Find player
                player = ChatRoomCharacter.find((C) => C.MemberNumber == MemberNumber);

                //bail out and return placeholder if player is not available.
                if (!player) {
                    player_output_html +=
                        "❓ <span style='color:#FF0000'>[Unknown Person]</span>\n";
                    continue;
                }

                // check if the player is also an admin or vip and add icon with admin given priority
                badge = ROSTER.setbadge(player);
                player_icons = ROSTER.setIcons(player);

                // if the player is me (person who ran the script)
                if (checkIfMe(player)) {
                    // mark me with a star icon
                    player_icons = "⭐ " + player_icons;

                    // format my outpupt and store
                    me_output_html = ROSTER.formatoutput(player, badge, player_icons, true);
                }

                // check if the player is an admin and update the count, also flad the player as admin in the output list.
                if (ChatRoomData.Admin.includes(player.MemberNumber)) {
                    admin_count++;
                    if (!ROSTER.checkIfMe(player, Player)) {
                        // if the player is not me, output admin and skip rest of loop
                        admin_output_html += ROSTER.formatoutput(
                            player,
                            badge,
                            player_icons,
                            false
                        );
                        continue;
                    }
                } else if (
                    ChatRoomData.Whitelist.includes(player.MemberNumber) &&
                    !ROSTER.checkIfMe(player, Player)
                ) {
                    // if the player isn't an admin, is the player is whitelested?
                    vip_output_html += ROSTER.formatoutput(player, badge, player_icons, false);
                    continue;
                } else if (!ROSTER.checkIfMe(player)) {
                    // player is normal, nonadmin, not whitelist, and not me.
                    player_output_html += ROSTER.formatoutput(
                        player,
                        badge,
                        player_icons,
                        false
                    );
                }
            }

            // if argument is "count", set filter vars and skip loop
            if (SPLITARGS.some((item) => item.toLowerCase() === "count")) {
                console.log("count only");
                showme = false;
                showadmins = false;
                showvip = false;
                showplayers = false;
            }

            // if argument is admins, set filter vars to only show admins and continue
            if (SPLITARGS.some((item) => item.toLowerCase() === "admins")) {
                console.log("admins only");
                showme = false;
                showvip = false;
                showplayers = false;
            }

            // if argument is vips, set filter vars to only show vips (whitelisted) and continue
            if (SPLITARGS.some((item) => item.toLowerCase() === "vips")) {
                console.log("vips only");
                showme = false;
                showadmins = false;
                showplayers = false;
            }

            //output total number of players/admins
            //TODO: include this in the table space and add a header
            ChatRoomSendLocal(
                "<div>There are " +
                  admin_count +
                  "/" +
                  ChatRoomData.Admin.length +
                  " admins in the room.</div>"
            );
            ChatRoomSendLocal(
                "There are " +
                  ChatRoomCharacter.length +
                  "/" +
                  ChatRoomData.Limit +
                  " total players in the room.</div>"
            );
            let output_html = "";

            // start the tabble and remove the boarders
            output_html += `<table style="border: 0px;">`;

            // if the filter var resolves to true, add the respective output.
            output_html = showme ? output_html + me_output_html : output_html;
            output_html = showadmins ? output_html + admin_output_html : output_html;
            output_html = showvip ? output_html + vip_output_html : output_html;
            output_html = showplayers
                ? output_html + player_output_html
                : output_html;

            // finish the table
            output_html += `</table>`;

            // show the final output
            ChatRoomSendLocal(output_html);
        },
    },
]);
