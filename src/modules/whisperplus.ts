export default class WhisperPlus {

    // send chat message at range
    private ChatRoomSendWhisperRanged(target: any, msg: string): boolean {
        if (msg == "") {
            return false;
        }

        // First ensure we have a valid target object
        const TARGETMEMEBER = typeof target === 'object' ? target : ChatRoomCharacter.find(C => C.MemberNumber === parseInt(target));
        if (!TARGETMEMEBER) {
            ChatRoomSendLocalChatRoomSendLocal(`${TextGet("CommandNoWhisperTarget")} ${target}.`, 30_000);
            return;
        }

        // Handle self whispers with gray text and memo emoji
        if (TARGETMEMEBER.MemberNumber === Player.MemberNumber) {
            const SELFMESSAGE = `<span style="color:#989898">💭 Log to </span><span style="color:${Player.LabelColor}">self</span><span style="color:#989898">: ${msg.replace(/\)/g, "）")}</span>`;
            ChatRoomSendLocal(SELFMESSAGE);
            return;
        }

        // Replace normal brackets with fake ones in the message
        msg = msg.replace(/\)/g, "）");

        // Prepare the message - now with ⤵ instead of :
        let formattedMsg = `(Whisper+❩⤵\n${msg}`;
        if (Player.ChatSettings.OOCAutoClose && !msg.endsWith('）')) {
            formattedMsg += '）';
        }

        // check if target and player are the same
        if (target.MemberNumber == Player.MemberNumber) {
            addChatMessage(msg);
        } else {
            if (ChatRoomMapViewIsActive() && !ChatRoomMapViewCharacterOnWhisperRange(target) && msg[0] != "(") {
                msg = `(${msg})`;
            }

            // build data payload
            const DATA = ChatRoomGenerateChatRoomChatMessage("Whisper", msg);
            
            // set the whisper target
            DATA.Target = target.MemberNumber;

            //send the whisper
            const serverData = { ...DATA, Type: "Whisper" }
            ServerSend("ChatRoomChat", serverData);

            // tell it who we are
            DATA.Sender = Player.MemberNumber;

            // send the chat to our window too
            ChatRoomMessage(DATA);

            // message was sent
            return true;
        }
    }

    // This starts /whisper+ if you click on the roster
    public static sendWhisper(memberNumber: number): void {
      for ( const command of Commands ) {
        if (command.Tag == "whisper+") {
          window.CommandSet(command.Tag + " " + memberNumber)
        }
      }
    };

    // this runs when a player enters the /whisper+ command or clicks the roster
    public whisperplus(args: any): number {
        // parse arguments into MEMBERNUMBER and messsage
        const MEMBERNUMBER = parseInt(args.slice(0, args.indexOf(" ")));
        const MESSAGE = args.slice(args.indexOf(" ") + 1);

        // if membernumber is not a valid number, bail
        if (Number.isNaN(MEMBERNUMBER)) {
            ChatRoomSendLocal("Member number is invalid.");
            return 1;
        }

        if (MESSAGE == "") {
            ChatRoomSendLocal("Message was blank");
            return 1;
        }

        // find player based no membernumber
        const TARGET = ChatRoomCharacter.find(
            (C: any) => C.MemberNumber == MEMBERNUMBER
        );
        this.ChatRoomSendWhisperRanged(TARGET || MEMBERNUMBER, MESSAGE);
        return 0;
    }
}
