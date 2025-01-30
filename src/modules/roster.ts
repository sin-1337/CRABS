// show help
function showhelp() {
  return `<table style="width: 100%"><tr><td>
  <span style=" text-shadow: 0px 0px 3px #000000; white-space: normal;">
  </br>
  <hr>
  /player help sheet</br>
    This command lists the number of admins and players </br>
    in a room and gives you some informatoin about them </br>

    </br>
    Arguments:
    <hr>
    help - show this menu </br>
    count - show only the player count </br>
    admins - show only a list of admins and the counts </br>
    vips - show only room whitelisted and the counts </br>

    </br>
    Badges:
    <hr>
    🛡️ = Person is Admin</br>
    📜 = Person is whitelisted in the room </br>
    🟢 = Person is a normal user </br>

    </br>
    Icons:
    <hr>
    ⭐ = Person is you </br>
    👑 = Person is your owner </br>
    🔒 = Person is your submissive </br>
    🔓 = Person is on trial with you </br>
    ❤️ = Person is your lover </br>
    🫱 = Person is a friend </br>
    ⚪ = You have this person whitelisted </br>
    ⚫ = You have this person blacklisted </br>
    👻 = You have ghosted this person </br>

    </br>
    Actions:
    <hr>
    Click Badge - If you click the badge for a player it will open their profile. </br>
    Click name - If you click the name/number of a player it will whisper them without range constraints. </br>
    </span>
    </td>
    </tr>
    </table>`;
}


// Opens the player profile
// This functions is setup up to be exposed to the global DOM
window.showPlayerProfile = function (MemberNumber) {
    // Check if the person is still in the room
    const PLAYER = ChatRoomCharacter.find(C => C.MemberNumber == MemberNumber);
    if (PLAYER) {
        ChatRoomStatusUpdate("Preference");
        InformationSheetLoadCharacter(PLAYER);
    } else {
        ChatRoomSendLocal("This person is no longer in the room.");
    }
};

// This functions is setup up to be exposed to the global DOM
window.showPlayerFocus = function (MemberNumber) {
    // Check if the person is still in the room
  const PLAYER = ChatRoomCharacter.find(C => C.MemberNumber == MemberNumber);
    if (PLAYER) {
        ChatRoomStatusUpdate("Preference");
        ChatRoomFocusCharacter(PLAYER);
    } else {
        ChatRoomSendLocal("This person is no longer in the room.");
    }
};

function ChatRoomSendWhisperRanged(target, msg) {
    if (msg == "") {
        return;
    }
    //replace the normal bracket with fake ones
    msg = msg.replace(")", "）");

    // check if target and player are the same
    if (target.MemberNumber == Player.MemberNumber) {
        addChatMessage(msg);
    } else {
        if (ChatRoomMapViewIsActive() && !ChatRoomMapViewCharacterOnWhisperRange(target) && msg[0] != "(") {
            msg = `(${msg})`;
        }

        // build data payload
        const data = ChatRoomGenerateChatRoomChatMessage("Whisper", msg);

        // set the whisper target
        data.Target = target.MemberNumber;

        //send the whisper
        ServerSend("ChatRoomChat", data);

        // tell it who we are
        data.Sender = Player.MemberNumber;

        // send the chat to our window too
        ChatRoomMessage(data);

        // message was sent
        return true;
    }
}


window.sendWhisper = function (memberNumber) {
  for ( index in Commands ) {
    index = parseInt(index);
    if (Commands[index].Tag == "whisper+") {
      window.CommandSet(Commands[index].Tag + " " + memberNumber)
    }
  }
};


// formats the data for outputting
function formatoutput(player, badge, player_icons, isMe) {
  let playername = CharacterNickname(player);
  let output = `<tr>
            <td style="padding-left: 5px; padding-right-5px; padding-bottom: 1px; padding-top: 0;"><span style="cursor:pointer;" onclick="showPlayerFocus(${player.MemberNumber})">${badge}</span></td>`;

  if (isMe) {
  // if the player is me, don't let me whisper myself
    output += `<td style="padding-left: 5px; padding-right-5px; padding-bottom: 1px; padding-top: 0;"><span style="color:${player.LabelColor || '#000000'};
                font-family: Arial, sans-serif;
                text-shadow: 2px 2px 2px rgba(0, 0, 0, 0.7); white-space: nowrap;">
                  ${CharacterNickname(player).normalize("NFKC")}[${player.MemberNumber}]
              </span>${player_icons}</td>
          </tr>`;
  }
  else {
  // set up whispering
     output += `<td style="padding-left: 5px; padding-right-5px; padding-bottom: 1px; padding-top: 0;"><span style="color:${player.LabelColor || '#000000'}; cursor:pointer;
                font-family: Arial, sans-serif;
                text-shadow: 2px 2px 2px rgba(0, 0, 0, 0.7); white-space: nowrap;"
                onclick="sendWhisper(${player.MemberNumber})"
                onmouseover="this.style.textDecoration='underline';"
                onmouseout="this.style.textDecoration='none';">
                  ${CharacterNickname(player).normalize("NFKC")}[${player.MemberNumber}]
              </span>${player_icons}</td>
          </tr>`;
  }

  return output;
}

// determine if player is admin or whitelisted in the room and set their badge icon
function setbadge(player) {
  let badge = "🟢";
  badge = ChatRoomData.Whitelist.includes(player.MemberNumber) ? "📜" : badge;
  badge = ChatRoomData.Admin.includes(player.MemberNumber) ? "🛡️" : badge
  return badge;
}

function setIcons(player) {
  let player_icons = "";
  if (Player.OwnerNumber() == player.MemberNumber) {
    // person owns you
    player_icons += "👑 ";
  }

  else if (Player.IsInFamilyOfMemberNumber(player.MemberNumber)) {
    // if they down't own you but you are in their family, we assume you own them
    if (Player.IsOwnedByPlayer(player.membernumber)) {
      // The person is fully owned if this is true
      player_icons += "🔒 "
    }
    else {
      // person is on trial
      player_icons += "🔓 "
    }
  }
  if (Player.Lover.includes(player.MemberNumber)) {
    // person is a lover
    player_icons += "❤️ ";
  }
  if (Player.FriendList.includes(player.MemberNumber)) {
    // person is a friend
    player_icons += "🫱 ";
  }
  if (Player.WhiteList.includes(player.MemberNumber)) {
    player_icons += "⚪ ";
  }
  if (Player.BlackList.includes(Player.MemberNumber)) {
    player_icons += "⚫ "
  }
  if (Player.GhostList.includes(Player.MemberNumber)) {
    player_icons += "👻 ";
  }
  return player_icons;
}

function checkIfMe(player) {
  return player.MemberNumber == Player.MemberNumber ? true : false;
}

CommandCombine([{
  // implements the whisper+ command
  Tag: 'whisper+',
  Description: "Enables the /whisper+ command that is global to a map room",
  Action: args => {
    // parse arguments into membernumber and messsage
    const MEMBERNUMBER = parseInt(args.slice(0, args.indexOf(" ")));
    let message = args.slice(args.indexOf(" ") + 1)
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
    // find player based no membernumber
    const TARGET = ChatRoomCharacter.find(C => C.MemberNumber == MEMBERNUMBER);
    ChatRoomSendWhisperRanged(TARGET, message);
  }
}]);


CommandCombine([{
  // implements the /players command
  Tag: 'players',
  Description: "Show the player count, helpful in maps.",
  Action: args => {
    const SPLITARGS = args.split(" ");
    if (SPLITARGS[0].toLowerCase() == "help") {
      ChatRoomSendLocal(showhelp());
      return;
    }

    let me_output_html = "";  // holds data about user who ran script
    let admin_output_html = ""; // holds admins
    let vip_output_html = ""; // holds whitelisted users
    let player_output_html = ""; // holds normal players
    let player; // the person we found in the room
    let admin_count = 0; // number of admins in the room
    let badge =""; // holds the admin icon if the player is an admin
    let player_icons = ""; // holds the list of player/status icons (string)

    // filter variables, show or not show certain output
    let showme = true;  // person who ran the script (you)
    let showadmins = true;  // room admins
    let showvip = true;  // room whitelists
    let showplayers = true;  // normal players

    //get a list of players
    for (let person in ChatRoomData.Character) {

      // find membernumber for current player in list
      MemberNumber = ChatRoomData.Character[person].MemberNumber;

      // Find player
      player = ChatRoomCharacter.find(C => C.MemberNumber == MemberNumber);

      //bail out and return placeholder if player is not available.
      if (!player) {
        player_output_html += "❓ <span style='color:#FF0000'>[Unknown Person]</span>\n";
        continue;
      }

      // check if the player is also an admin or vip and add icon with admin given priority
      badge = setbadge(player);
      player_icons = setIcons(player);

      // if the player is me (person who ran the script)
      if (checkIfMe(player)) {

        // mark me with a star icon
        player_icons = "⭐ " + player_icons;

        // format my outpupt and store
        me_output_html = formatoutput(player, badge, player_icons, true);

      }

      // check if the player is an admin and update the count, also flad the player as admin in the output list.
      if (ChatRoomData.Admin.includes(player.MemberNumber)) {
        admin_count++;
        if (!checkIfMe(player, Player)) {
          // if the player is not me, output admin and skip rest of loop
          admin_output_html += formatoutput(player, badge, player_icons, false);
          continue;
        }
      }
      else if (ChatRoomData.Whitelist.includes(player.MemberNumber) && !checkIfMe(player, Player)) {
        // if the player isn't an admin, is the player is whitelested?
        vip_output_html += formatoutput(player, badge, player_icons, false);
        continue;
      }
      else if (!checkIfMe(player)){
        // player is normal, nonadmin, not whitelist, and not me.
        player_output_html += formatoutput(player, badge, player_icons, false);
      }

    }

    // if argument is "count", set filter vars and skip loop
    if (SPLITARGS.some(item => item.toLowerCase() === "count")) {
      console.log("count only");
      showme = false;
      showadmins = false;
      showvip = false;
      showplayers = false;
    }

    // if argument is admins, set filter vars to only show admins and continue
    if (SPLITARGS.some(item => item.toLowerCase() === "admins")) {
      console.log("admins only");
      showme = false;
      showvip = false;
      showplayers = false;
    }

    // if argument is vips, set filter vars to only show vips (whitelisted) and continue
    if (SPLITARGS.some(item => item.toLowerCase() === "vips")) {
      console.log("vips only");
      showme = false;
      showadmins = false;
      showplayers=false;
    }

    //output total number of players/admins
    //TODO: include this in the table space and add a header
    ChatRoomSendLocal("There are " + admin_count + "/" + ChatRoomData.Admin.length + " admins in the room.")
    ChatRoomSendLocal("There are " + ChatRoomCharacter.length + "/" + ChatRoomData.Limit + " total players in the room." );
    let output_html = "";

    // start the tabble and remove the boarders
    output_html += `<table style="border: 0px;">`

    // if the filter var resolves to true, add the respective output.
    output_html = showme ? output_html + me_output_html : output_html;
    output_html = showadmins ? output_html + admin_output_html : output_html;
    output_html = showvip ? output_html + vip_output_html : output_html;
    output_html = showplayers ? output_html + player_output_html : output_html;

    // finish the table
    output_html += `</table>`

    // show the final output
    ChatRoomSendLocal(output_html);

  }
}]);

