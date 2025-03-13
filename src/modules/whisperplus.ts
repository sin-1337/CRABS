export default class WhisperPlus {

    constructor() {
        // expose the ChatRoomMessageWhisperPlusClick method to the DOM
        window.WhisperPlusClick = WhisperPlus.ChatRoomMessageWhisperPlusClick;
    }

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

    // This static var attaches the function to the window dom
    public static sendWhisper(memberNumber: number): void {
      for ( const command of Commands ) {
        if (command.Tag == "whisper+") {
          window.CommandSet(command.Tag + " " + memberNumber)
        }
      }
    };

    private static ChatRoomMessageWhisperPlusClick(this: HTMLElement): void {
        console.log("clicked")
        // Similar to ChatRoomMessageNameClick, but for whisper+
        const sender = Number.parseInt(this.parentElement?.dataset.sender ?? '', 10);
        const target = Number.parseInt(this.parentElement?.dataset.target ?? '', 10);
        const memberNumber = sender === Player.MemberNumber && !Number.isNaN(target) ? target : sender;

        const chatInput = document.getElementById("InputChat") as HTMLTextAreaElement | null;

        if (!chatInput || !ChatRoomCharacter.some(C => C.MemberNumber === memberNumber)) {
            ChatRoomSendLocal(`${TextGet("CommandNoWhisperTarget")} ${memberNumber}.`, 30_000);
            return;
        }

        // Handle the input text similar to the original whisper
        const currentText = chatInput.value;
        const whisperPlusCmd = `/whisper+ ${memberNumber} `;

        // Check if the current input starts with a whisper command
        const whisperMatch = currentText.match(/^\/whisper\+?\s*\d+\s*/);

        if (whisperMatch) {
            // Replace just the member number if there's already a whisper command
            chatInput.value = whisperPlusCmd + currentText.substring(whisperMatch[0].length);
        } else {
            // Add the command to the start if there isn't one
            chatInput.value = whisperPlusCmd + currentText;
        }

        chatInput.focus();
    }

    public initWPlus(): void {
        if (!window.bcModSdk) {
            setTimeout(() => this.initWPlus(), 500);
            return;
        }
        console.log("WP init")
        this.init();
    }

    private init(): void {
        // Our main hook
        console.log("run init")
        WPlus.hookFunction("ChatRoomMessageDisplay", 0, (args: any[], next: Function): void => {
            const [data, msg, SenderCharacter, metadata] = args;
            
            console.log("run hook")
            // If it's not our special Whisper+ type, let it process normally
            if (data.Type !== "Whisper+") {
                return next(args);
            }

            // For Whisper+, we handle it ourselves but use most of the original function's structure
            const displayMessage = CommonCensor(ChatRoomActiveView.DisplayMessage(data, msg, SenderCharacter, metadata) ?? "¶¶¶");
            if (displayMessage === "¶¶¶") return;

            const divChildren: any[] = [];
            const whisperTarget = SenderCharacter.IsPlayer() ? ChatRoomCharacter.find(c => c.MemberNumber === data.Target) : SenderCharacter;
            
            console.log("push");
            divChildren.push(
                ElementButton.Create(
                    null,
                    WhisperPlusClick,
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
                    WhisperPlusClick,
                    { noStyling: true },
                    {
                        button: {
                            classList: ["ChatMessageName"],
                            attributes: {
                                "tabindex": "-1"
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

            const classList: string[] = ["ChatMessage"];
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

    public initWait(): void {
        if (CurrentScreen == null || CurrentScreen === "Login") {
            WPlus.hookFunction("LoginResponse", 0, (args: any[], next: Function): void => {
                next(args);
                const response = args[0];
                if (response && typeof response.Name === "string" && typeof response.AccountName === "string") {
                    this.init();
                }
            });
        } else {
            this.init();
        }
    }

    public whisperplus(args: any) {
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


        // find player based no membernumber
        const TARGET = ChatRoomCharacter.find(
            (C: any) => C.MemberNumber == MEMBERNUMBER
        );
        this.ChatRoomSendWhisperRanged(TARGET, message);
    }
}
