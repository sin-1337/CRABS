export default class whisperplus {
    ChatRoomSendWhisperRanged(target, msg) {
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
}
