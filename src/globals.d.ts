// globals.d.ts
declare global {
  const NAME: string;
  const NICKNAME: string;1
  const VERSION: string;
  var ChatRoomCharacter: Array<any>;
  var ChatRoomData: any;
  var Commands: Array<any>;
  var CurrentOnlinePlayers: number;
  var CurrentScreen: any;
  var data: {
    Content: string;
    Type: type;
    Dictionary: {};
    Target: number;
    Sender: number;
  };

  // unique to crabs
  interface Window {
    PlayerFocus: typeof Roster.showPlayerFocus;
    sendWhisper: typeof WhisperPlus.sentWhisper;
    fakePlayerCommand: typeof Roster.fakePlayerCommand;
    crabsCloseItem: typeof Roster.close;
    ChatRoomMessageWhisperPlus: typeof WhisperPlus.ChatRoomMessageWhisperPlusClick;
    crabsHelp: typeof HELP.showHelp;
    CommandSet(payload: string): void;
  }

  interface HTMLElement {
    value: string;
  }

  interface Lovership {
    Name: string;
    MemberNumber?: number;
    Stage?: 0 | 1 | 2;
    Start?: number;
  }

  interface CharacterPoseMapping {
    BodyLower?: string;
    BodyFull?: string;
    BodyAddon?: string;
    [key: string]: any;
  }

  interface PlayerCharacter {
    ID?: number;
    Name: string;
    MemberNumber?: number;
    Type?: string;

    AllowedInteractions: number;
    LabelColor?: string;
    LastChatRoom?: any;

    Lover?: string;
    Owner?: string;
    Effect: string[];
    Lovership: Lovership[];
    Attribute: string[];
    Appearance: any[];
    Inventory: any[];
    BlackList: Array<any>;
    GhostList: Array<any>;
    FriendList: Array<any>;
    FriendNames: Map;
    WhiteList: Array<any>;
    BCT: any; // only for BCTweaks

    PoseMapping: CharacterPoseMapping;
    DrawPoseMapping: Record<string, any>;
    ActivePoseMapping: Record<string, any>;
    AllowedActivePoseMapping: Record<string, string[]>;

    Stage: string;
    CurrentDialog: string;

    HasEffect(effect: string): boolean;
    IsPlayer(): this is PlayerCharacter;
    IsOwned(): boolean | string;
    IsOwnedByCharacter(C: PlayerCharacter): boolean;
    IsOwnedByPlayer(C: number): boolean;
    IsLoverOfCharacter(C: PlayerCharacter): boolean;
    GetLovership(MembersOnly?: boolean): Lovership[];
    GetLoversNumbers(): Array<number>;
    GetGenders(): string[];
    GetPronouns(): string;
    IsInFamilyOfMemberNumber(C: number): boolean;
    OwnerNumber(): number;

    ChatSettings: {
      OOCAutoClose: boolean;
    };

    MapData: {
      PrivateState: {
        HasKeyBronze?: boolean;
        HasKeySilver?: boolean;
        HasKeyGold?: boolean;
      };
    };

    // You can add the rest of the methods as needed
  }

  var Player: PlayerCharacter;

  function addChatMessage(msg: string): void;
  function CommandCombine(command: Array<any>);
  function CharacterGetEffects(Player: PlayerCharacter): Array<string>;
  function CharacterNickname(Player: PlayerCharacter): string;
  function ChatRoomFocusCharacter(player: PlayerCharacter): void;
  function ChatRoomGenerateChatRoomChatMessage(
    type: string,
    msg: string
  ): {
    Content: string;
    Type: type;
    Dictionary: {};
    Target?: number;
    Sender?: number;
  };
  function ChatRoomMessage(data: data): void;
  function ChatRoomRegisterMessageHandler(message: {
    Description: string;
    Priority: number;
    Callback: any;
  }): any;
  function ChatRoomSendLocal(Content: string, Timeout?: number): void;
  function ChatRoomSendLocalChatRoomSendLocal(
    Content: string,
    Timeout?: number
  ): void;
  function ChatRoomStatusUpdate(payload: string): any;
  function ChatRoomMapViewCharacterOnWhisperRange(
    target: PlayerCharacter
  ): boolean;
  function ChatRoomMapViewIsActive(): boolean;
  function ElementScrollToEnd(element: string): void;
  function ServerAccountUpdate();
  function ServerSend(message: string, ...args: any): Promise;
  function TextGet(text: string): void;
  function TextGetInScope(path_to_csv: string, permission: string): void;
}

export {};
