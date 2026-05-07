// globals.d.ts
declare global {
	const __NAME__: string;
	const __NICKNAME__: string;
	const __VERSION__: string;
	const __BRANCH__: string;

	// Upgraded using the new ambient types!
	var ChatRoomCharacter: Character[];
	var ChatRoomData: ChatRoom | null;
	var Commands: Array<any>;
	var CurrentOnlinePlayers: number;
	var CurrentScreen: string;

	var data: {
		Content: string;
		Type: string;
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
		ChatRoomExit(): void;
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

	type NotificationParams = {
		message: string;
		title?: string;
		image?: Extract<keyof typeof Assets.IMAGES.image, string>;
		duration?: number;
	};

	type ErrorNotificationParams = {
		message: string;
		duration?: number;
	};

	type AudioStore = {
		readonly basePath: string;
		readonly [key: string]: string | {
			readonly file: string;
		};
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

	// Because of Declaration Merging, this adds `BCT` to the base game's PlayerCharacter type!
	interface PlayerCharacter {
		BCT?: any; // only for BCTweaks
	}

	type QueueDataPayload = {
		AllowedInteractions: typeof Player.AllowedInteractions;
	};

	declare const ServerAccountUpdate: {
		QueueData(data: QueueDataPayload): void;
	};

	var Player: PlayerCharacter;

	// Base game global functions
	function addChatMessage(msg: string): void;
	function CommandCombine(command: Array<any>): void;
	function CharacterGetEffects(C: Character): Array<string>;
	function CharacterNickname(C: Character): string;
	function ChatRoomExit(): void;
	function ChatRoomFocusCharacter(C: Character): void;
	function ChatRoomGenerateChatRoomChatMessage(
		type: string,
		msg: string
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
		Timeout?: number
	): void;
	function ChatRoomStatusUpdate(payload: string): any;
	function ChatRoomMapViewCharacterOnWhisperRange(
		target: Character
	): boolean;
	function ChatRoomMapViewIsActive(): boolean;
	function ElementScrollToEnd(element: string): void;
	function ServerSend(message: string, ...args: any): Promise<any>;
	function TextGet(text: string): void;
	function TextGetInScope(path_to_csv: string, permission: string): void;
}

export { };
