// globals.d.ts
declare global {
	const NAME: string;
	const NICKNAME: string;
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

	type crabs = {
		readonly name: string,
		readonly fullname: string,
		readonly version: string,
		readonly branch: string,
	}

	type PrintImage = {
		key: Extract<keyof typeof Assets.IMAGES.image, string>,
		css_class_override?: string,
		css_style?: string,
		tooltip_override?: string,
		alt_override?: string,
		data?: [string, string]
	};

	interface HTMLElement {
		value: string;
	}

	export type UIElementType = 'Checkbox' | 'Button' | 'Input' | 'BackNext';

	export interface BaseUIElement {
		type: UIElementType;
		text: string;
		hint: string;
		yPos: number;
		width: number;
		height?: number;
		category?: string;
		xModifier?: number;
		yModifier?: number;
		grayedOut?: boolean | (() => boolean);
	}

	export interface CheckboxElement extends BaseUIElement {
		type: 'Checkbox';
		setting: string;
		elementText?: string;
	}

	export interface ButtonElement extends BaseUIElement {
		type: 'Button';
		elementText: string;
		clickFunction: () => void;
	}

	export interface InputElement extends BaseUIElement {
		type: 'Input';
		setting: string;
		identifier: string;
	}

	export interface BackNextElement extends BaseUIElement {
		type: 'BackNext';
		setting: string;
		backNextOptions: string[];
		index: number;
	}

	export type UIElement = CheckboxElement | ButtonElement | InputElement | BackNextElement;

	export interface CRABS_Settings {
		showBanner: boolean;
		rosterOpensDrawer: boolean;
		hideDrawerTab: boolean;
		immersiveBlind: boolean;
		immersiveGag: boolean;
		respectBcxRules: boolean;
		compactDrawer: boolean;
		closeDrawerOnWhisper: boolean;
		closeDrawerOnChat: boolean;
		disableDrawer: boolean;
		lockImmersive: boolean;
	}


	// BC objects

	interface Window {
		PlayerFocus: typeof Roster.showPlayerFocus;
		sendWhisper: typeof WhisperPlus.sentWhisper;
		fakePlayerCommand: typeof Roster.fakePlayerCommand;
		crabsCloseItem: typeof Roster.close;
		ChatRoomMessageWhisperPlus: typeof WhisperPlus.ChatRoomMessageWhisperPlusClick;
		crabsHelp: typeof HELP.showHelp;
		CommandSet(payload: string): void;

		// Add this line here
		ChatRoomExit(): void;
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

	type QueueDataPayload = {
		AllowedInteractions: typeof Player.AllowedInteractions;
	};

	declare const ServerAccountUpdate: {
		QueueData(data: QueueDataPayload): void;
	};

	var Player: PlayerCharacter;

	function addChatMessage(msg: string): void;
	function CommandCombine(command: Array<any>);
	function CharacterGetEffects(Player: PlayerCharacter): Array<string>;
	function CharacterNickname(Player: PlayerCharacter): string;
	function ChatRoomExit(): void;
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
	function ServerSend(message: string, ...args: any): Promise;
	function TextGet(text: string): void;
	function TextGetInScope(path_to_csv: string, permission: string): void;
}

export { };
