import {ModSDKModAPI} from "bondage-club-mod-sdk";
import CRABS from "../base"
import { isBCXRuleEnforced } from "../bcx";
export class WhisperPlus extends CRABS {

    constructor(CRABS: ModSDKModAPI) {
        super(CRABS);
    } 

    /** 
     * Send chat message at range.
     * 
     * @param {Character} target - whisper target.
     * @param {string} string - message to send.
     * @returns {boolean} Was the message sent?
     */
    private ChatRoomSendWhisperRanged(targetArg: Character | number, msg: string): boolean {
        if (msg == "") {
            return false;
        }

        if (isBCXRuleEnforced("speech_restrict_whisper_send")) {
            ChatRoomSendLocal(`Sending whispers is blocked by BCX.`, 30_000);
            return false;
        }

        // First ensure we have a valid target object
        const target = typeof targetArg === 'object' ? targetArg : ChatRoomCharacter.find(C => C.MemberNumber === parseInt(targetArg, 10));
        if (!target) {
            ChatRoomSendLocal(`${TextGet("CommandNoWhisperTarget")} ${targetArg}.`, 30_000);
            return false;
        }

        // Handle self whispers with gray text and memo emoji
        if (target.MemberNumber === Player.MemberNumber) {
            const SELFMESSAGE = `<span style="color:#989898">${this.printimage("thought")} Note to </span><span style="color:${Player.LabelColor}">self</span><span style="color:#989898">: ${msg}</span>`;
            ChatRoomSendLocal(SELFMESSAGE);
            return false;
        }

        // Replace normal brackets with fake ones in the message
        msg = msg.replace(/\(/g, "❪"); //replace the ( for consistency
        msg = msg.replace(/\)/g, "❫"); // technically only this one is really needed


        // check if target and player are the same
        if (target.IsPlayer()) {
            addChatMessage(msg);
        } else {
            if (ChatRoomMapViewIsActive() && !ChatRoomMapViewCharacterOnWhisperRange(target) && msg[0] != "(") {
                msg = `(${msg})`;
            }

            // Prepare the message - now with ⤵ instead of :
            const formattedMsg = `+: ${msg}`;
            //if (Player.ChatSettings.OOCAutoClose && !msg.endsWith('）')) {
            //    formattedMsg += '）';
            //}

            // build data payload
            const data = ChatRoomGenerateChatRoomChatMessage("Whisper", formattedMsg);
            /*if (!data) {
                data = ChatRoomGenerateChatRoomChatMessage("Whisper", formattedMsg);
            }*/

            // set the whisper target
            data.Target = target.MemberNumber;

            //send the whisper
            const serverData: ServerChatRoomMessage = { ...data, Type: "Whisper" }
            ServerSend("ChatRoomChat", serverData);

            // tell it who we are
            data.Sender = Player.MemberNumber;

            // send the chat to our window too
            ChatRoomMessage(data);

            // message was sent
            return true;
        }
        return false;
    }

    /** 
     * This starts /whisper+ if you click on the roster.
     * 
     * @param {number} memberNumber - Member number of the target.
     * @returns {void}
     */
    public sendWhisper(memberNumber: number): void {
      for ( const command of Commands ) {
        if (command.Tag == "whisper+") {
          window.CommandSet(command.Tag + " " + memberNumber)
        }
      }
    };

    /** 
     * This runs when a player enters the /whisper+ command or clicks the roster.
     * 
     * @param {string} args - arguments passed from player (message).
     * @param {string} command - arguments passed as command (BC quirk).
     * @returns {number} 0 indicts success, 1 is an error.
     */
    public whisperplus(args: string, command: string): number {
        // parse arguments into MEMBERNUMBER and messsage
        const MEMBERNUMBER = parseInt(args.slice(0, args.indexOf(" ")));
        //const MESSAGE = args.slice(args.indexOf(" ") + 1);
        const MESSAGE = command.substring(command.indexOf(' ') + MEMBERNUMBER.toString().length + 2);

        // if membernumber is not a valid number, bail
        if (Number.isNaN(MEMBERNUMBER)) {
            ChatRoomSendLocal("Member number is invalid.", 30_000);
            return 1;
        }

        if (MESSAGE == "") {
            ChatRoomSendLocal("Message was blank", 30_000);
            return 1;
        }

        // find player based no membernumber
        const TARGET = ChatRoomCharacter.find(
            (C) => C.MemberNumber == MEMBERNUMBER
        );
        this.ChatRoomSendWhisperRanged(TARGET || MEMBERNUMBER, MESSAGE);
        return 0;
    }
}
