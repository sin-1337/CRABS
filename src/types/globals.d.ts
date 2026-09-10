declare const __NAME__: string;
declare const __NICKNAME__: string;
declare const __VERSION__: string;
declare const __BRANCH__: string;

declare var ChatRoomCharacter: Character[];
declare var ChatRoomData: ChatRoom | null;
declare var Commands: Array<any>;
declare var CurrentOnlinePlayers: number;
declare var CurrentScreen: string;

declare var data: {
  Content: string;
  Type: string;
  Dictionary: {};
  Target: number;
  Sender: number;
};

interface Window {
  PlayerFocus: typeof import("../modules/roster").showPlayerFocus;
  sendWhisper: typeof import("../modules/whisperplus").sentWhisper;
  fakePlayerCommand: typeof import("../modules/roster").fakePlayerCommand;
  crabsCloseItem: typeof import("../modules/roster").close;
  ChatRoomMessageWhisperPlus: typeof import("../modules/whisperplus").ChatRoomMessageWhisperPlusClick;
  crabsHelp: typeof import("../modules/help").showHelp;
  CommandSet(payload: string): void;
  ChatRoomExit(): void;
}

type crabs = {
  readonly name: string;
  readonly fullname: string;
  readonly version: string;
  readonly branch: string;
};

type QueueDataPayload = {
  AllowedInteractions: typeof Player.AllowedInteractions;
};

declare const ServerAccountUpdate: {
  QueueData(data: QueueDataPayload): void;
};

declare var Player: PlayerCharacter;

declare function addChatMessage(msg: string): void;
declare function CommandCombine(command: Array<any>): void;
declare function CharacterGetEffects(C: Character): Array<string>;
declare function CharacterNickname(C: Character): string;
declare function ChatRoomExit(): void;
declare function ChatRoomFocusCharacter(C: Character): void;
declare function ChatRoomGenerateChatRoomChatMessage(
  type: string,
  msg: string,
): {
  Content: string;
  Type: string;
  Dictionary: {};
  Target?: number;
  Sender?: number;
};
declare function ChatRoomMessage(data: any): void;
declare function ChatRoomRegisterMessageHandler(message: {
  Description: string;
  Priority: number;
  Callback: any;
}): any;
declare function ChatRoomSendLocal(Content: string, Timeout?: number): void;
declare function ChatRoomSendLocalChatRoomSendLocal(
  Content: string,
  Timeout?: number,
): void;
declare function ChatRoomStatusUpdate(payload: string): any;
declare function ChatRoomMapViewCharacterOnWhisperRange(
  target: Character,
): boolean;
declare function ChatRoomMapViewIsActive(): boolean;
declare function ElementScrollToEnd(element: string): void;
declare function ServerSend(message: string, ...args: any): Promise<any>;
declare function TextGet(text: string): void;
declare function TextGetInScope(path_to_csv: string, permission: string): void;
