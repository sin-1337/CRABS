import {ModSDKModAPI} from "bondage-club-mod-sdk";
import CRABS from "../base"
export default class WhisperPlus extends CRABS {

    constructor(icon_height: number, icon_width: number, CRABS: ModSDKModAPI) {
        super(icon_height, icon_width, CRABS);
        //this.wpWait();
        window.sendWhisper = WhisperPlus.sendWhisper;
    } 

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
            const SELFMESSAGE = `<span style="color:#989898">${this.printicon("thought")} Note to </span><span style="color:${Player.LabelColor}">self</span><span style="color:#989898">: ${msg}</span>`;
            ChatRoomSendLocal(SELFMESSAGE);
            return;
        }

        // Replace normal brackets with fake ones in the message
        msg = msg.replace(/\(/g, "❪"); //replace the ( for consistency
        msg = msg.replace(/\)/g, "❫"); // technically only this one is really needed


        // Prepare the message - now with ⤵ instead of :
        //let formattedMsg = `(Whisper+❩⤵\n${msg}`;
        //if (Player.ChatSettings.OOCAutoClose && !msg.endsWith('）')) {
        //    formattedMsg += '）';
        //}

        // check if target and player are the same
        if (target.MemberNumber == Player.MemberNumber) {
            addChatMessage(msg);
        } else {
            if (ChatRoomMapViewIsActive() && !ChatRoomMapViewCharacterOnWhisperRange(target) && msg[0] != "(") {
                msg = `(${msg})`;
            }

            // build data payload
            let data = ChatRoomGenerateChatRoomChatMessage("Whisper+", formattedMsg);
            if (!data) {
                data = ChatRoomGenerateChatRoomChatMessage("Whisper", formattedMsg);
            }
            
            // set the whisper target
            data.Target = target.MemberNumber;

            //send the whisper
            const serverData = { ...data, Type: "Whisper" }
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

    // This starts /whisper+ if you click on the roster
    public static sendWhisper(memberNumber: number): void {
      for ( const command of Commands ) {
        if (command.Tag == "whisper+") {
          window.CommandSet(command.Tag + " " + memberNumber)
        }
      }
    };

    // this runs when a player enters the /whisper+ command or clicks the roster
    public whisperplus(args: any, command: any, modlist: any): number {
        this.modlist = modlist;
        // parse arguments into MEMBERNUMBER and messsage
        const MEMBERNUMBER = parseInt(args.slice(0, args.indexOf(" ")));
        //const MESSAGE = args.slice(args.indexOf(" ") + 1);
        const MESSAGE = command.substring(command.indexOf(' ') + MEMBERNUMBER.toString().length + 2);
        console.log(MESSAGE);

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
            (C: any) => C.MemberNumber == MEMBERNUMBER
        );
        this.ChatRoomSendWhisperRanged(TARGET || MEMBERNUMBER, MESSAGE);
        return 0;
    }
    /*
    private loadReplyDisplay(): void {
        // Our main hook
        this.crabs.hookFunction("ChatRoomMessageDisplay", 0, (args, next) => {
          const [data, msg, SenderCharacter, metadata] = args;
          console.log("CRABS: running loadReplyDisplay hook function");
          // If it's not our special Whisper+ type, let it process normally
          if (data.Type !== "Whisper+") {
            console.log(`CRABS: data type is ${data.Type}`)
            return next(args);
          }
 
          // For Whisper+, we handle it ourselves but use most of the original function's structure
          const displayMessage = CommonCensor(ChatRoomActiveView.DisplayMessage(data, msg, SenderCharacter, metadata) ?? "¶¶¶");
          if (displayMessage == "¶¶¶") return;

          const divChildren = [];
          const whisperTarget = SenderCharacter.IsPlayer() ? ChatRoomCharacter.find(c => c.MemberNumber == data.Target) : SenderCharacter;

          divChildren.push(
            ElementButton.Create(
              null,
              window.sendWhisper(whisperTarget.MemberNumber),
              { noStyling: true },
              {
                button: {
                  classList: ["ReplyButton"],
                  children: ["\u21a9\ufe0f"]
                }
              },
            ),
            SenderCharacter.IsPlayer() ? TextGet("WhisperTo") : TextGetInScope("Screens/Online/ChatRoom/Text_ChatRoom.csv", "WhisperFrom"),
            " ",
            ElementButton.Create(
              null,
              window.sendWhisper(whisperTarget.MemberNumber),
              { noStyling: true },
              {
                button: {
                  classList: ["ChatMessageName"],
                  attributes: {
                    "tabindex": -1
                  },
                  style: { "--label-color": whisperTarget.LabelColor },
                  children: [CharacterNickname(whisperTarget)],
                },
              },
            ),
            ": ",
            displayMessage,
          );

          if (!whisperTarget.IsPlayer()) {
            document.querySelector(`
                      #TextAreaChatLog .ChatMessageWhisper[data-sender="${whisperTarget.MemberNumber}"] > .ReplyButton:not([tabindex='-1']),
                      #TextAreaChatLog .ChatMessageWhisper[data-target="${whisperTarget.MemberNumber}"] > .ReplyButton:not([tabindex='-1'])
                  `)?.setAttribute("tabindex", "-1");
          }

          const classList = ["ChatMessage"];
          classList.push("ChatMessageWhisper");  // Use Whisper styling

          const div = ElementCreate({
            tag: "div",
            classList,
            dataAttributes: {
              time: ChatRoomCurrentTime(),
              sender: data.Sender,
              target: data.Target,
            },
            children: divChildren,
          });

          ChatRoomAppendChat(div);
          return div;
        });
      }

    private wpWait(): void {
        if (CurrentScreen == null || CurrentScreen === "Login") {
          this.crabs.hookFunction("LoginResponse", 0, (args, next) => {
            next(args);
            const response = args[0];
            if (response && typeof response.Name === "string" && typeof response.AccountName === "string") {
              this.loadReplyDisplay();
            }
          });
        } else {
          this.loadReplyDisplay();
        }
      }
     */


}
