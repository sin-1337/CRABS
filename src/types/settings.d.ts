type UIElementType = 'Checkbox' | 'Button' | 'Input' | 'BackNext';

interface BaseUIElement {
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

interface CheckboxElement extends BaseUIElement {
	type: 'Checkbox';
	setting: string;
	elementText?: string;
}

interface ButtonElement extends BaseUIElement {
	type: 'Button';
	elementText: string;
	clickFunction: () => void;
}

interface InputElement extends BaseUIElement {
	type: 'Input';
	setting: string;
	identifier: string;
}

interface BackNextElement extends BaseUIElement {
	type: 'BackNext';
	setting: string;
	backNextOptions: string[];
	index: number;
}

type UIElement = CheckboxElement | ButtonElement | InputElement | BackNextElement;

interface CRABS_Settings {
	showBanner: boolean;
	rosterOpensDrawer: boolean;
	showDrawerTab: boolean;
	immersiveBlind: boolean;
	immersiveGag: boolean;
	respectBcxRules: boolean;
	compactDrawer: boolean;
	closeDrawerOnWhisper: boolean;
	closeDrawerOnChat: boolean;
	disableDrawer: boolean;
	lockImmersive: boolean;
	showMapCompass: boolean;
	mapSuperZoom: boolean;
	pageFocusHover: boolean,
	checkForUpdates: boolean;
	animatedCrabsLogo: boolean;
}
