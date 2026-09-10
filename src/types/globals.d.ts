// types/global.d.ts
/// <reference path="./bondageclub.d.ts" />

// Any imports needed for types must be dynamic or placed outside,
// but the symbols themselves MUST be exposed in declare global:
declare global {
  const __NAME__: string;
  const __NICKNAME__: string;
  const __VERSION__: string;
  const __BRANCH__: string;

  var ChatRoomCharacter: Character[];
  var ChatRoomData: ChatRoom | null;
  var Commands: Array<any>;
  var CurrentOnlinePlayers: number;
  var CurrentScreen: string;
  var Player: PlayerCharacter;

  var data: {
    Content: string;
    Type: string;
    Dictionary: {};
    Target: number;
    Sender: number;
  };

  // Window extensions
  interface Window {
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

  const ServerAccountUpdate: {
    QueueData(data: QueueDataPayload): void;
  };

  function addChatMessage(msg: string): void;
  function CommandCombine(command: Array<any>): void;
  function CharacterGetEffects(C: Character): Array<string>;
  function CharacterNickname(C: Character): string;
  function ChatRoomExit(): void;
  function ChatRoomFocusCharacter(C: Character): void;
  function ChatRoomGenerateChatRoomChatMessage(
    type: string,
    msg: string,
  ): {
    Content: string;
    Type: string;
    Dictionary: {};
    Target?: number;
    Sender?: number;
  };
  function ChatRoomMessage(data: any): void;
  function ChatRoomRegisterMessageHandler(message: {
    Description: string;
    Priority: number;
    Callback: any;
  }): any;
  function ChatRoomSendLocal(Content: string, Timeout?: number): void;
  function ChatRoomSendLocalChatRoomSendLocal(
    Content: string,
    Timeout?: number,
  ): void;
  function ChatRoomStatusUpdate(payload: string): any;
  function ChatRoomMapViewCharacterOnWhisperRange(target: Character): boolean;
  function ChatRoomMapViewIsActive(): boolean;
  function ElementScrollToEnd(element: string): void;
  function ServerSend(message: string, ...args: any): Promise<any>;
  function TextGet(text: string): void;
  function TextGetInScope(path_to_csv: string, permission: string): void;
}

export {};
