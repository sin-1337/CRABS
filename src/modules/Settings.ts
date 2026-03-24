import { CRABS_Base } from "./base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";

export type UIElementType = 'Checkbox' | 'Button' | 'Input' | 'BackNext';

export interface BaseUIElement {
    type: UIElementType;
    text: string;
    hint: string;
    yPos: number;
    width: number;
    height?: number;
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
    immersiveMode: boolean;
    respectBcxRules: boolean;
    compactDrawer: boolean;
    closeDrawerOnWhisper: boolean;
    closeDrawerOnChat: boolean;
    disableDrawer: boolean;
}

const DEFAULT_SETTINGS: CRABS_Settings = {
    showBanner: true,
    rosterOpensDrawer: true,
    immersiveMode: false,
    respectBcxRules: true,
    compactDrawer: false,
    closeDrawerOnWhisper: false,
    closeDrawerOnChat: false,
    disableDrawer: false,
};

/**
 * Combined Settings and UI Manager for CRABS.
 */
export class Settings extends CRABS_Base {
    public data: CRABS_Settings;
    private elements: UIElement[] = [];
    private readonly STORAGE_KEY = "CRABS_Settings";
    
    private menuElementXOffset: number = 1000;
    private startY: number = 200;
    private spacingY: number = 75;

    constructor(CRABS: ModSDKModAPI) {
        super(CRABS);
        this.data = this.load();
        this.setupUI();
        this.registerExtension();
    }

    private load(): CRABS_Settings {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            try {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
            } catch (e) {
                console.error("CRABS: Failed to parse settings", e);
            }
        }
        return { ...DEFAULT_SETTINGS };
    }

    public save(): void {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    }

    private setupUI(): void {
        this.elements = []; // Clear existing elements
        
        this.addCheckbox(
            "Show Banner on Entry", 
            "showBanner", 
            "Automatically display the room information banner whenever you join a new chat room."
        );

        this.addCheckbox(
            "/roster opens drawer", 
            "rosterOpensDrawer", 
            "Redirect the standard /roster command to toggle the drawer instead of printing to chat."
        );

        this.addCheckbox(
            "Immersive Mode", 
            "immersiveMode", 
            "Respect in-game sensory restrictions. Roster blur levels will match your blindness level."
        );

        this.addCheckbox(
            "Respect BCX Rules", 
            "respectBcxRules", 
            "Allow supported BCX rules (like room interaction limits or sensory rules) to impact CRABS functionality."
        );

        this.addCheckbox(
            "Compact Drawer", 
            "compactDrawer", 
            "Reduce the drawer height to 77% of the chat area so some messages remain visible."
        );

        this.addCheckbox(
            "Auto-stow on Whisper+", 
            "closeDrawerOnWhisper", 
            "Automatically close the drawer after you successfully send a /whisper+ message."
        );

        this.addCheckbox(
            "Auto-stow on Chat", 
            "closeDrawerOnChat", 
            "Automatically close the drawer when you send a normal chat message."
        );

        this.addCheckbox(
            "Disable Drawer UI", 
            "disableDrawer", 
            "Completely disable the drawer interface and hide the logo tab from the screen edge."
        );
    }

    private getNewYPos(): number {
        if (this.elements.length === 0) return this.startY;
        const lastElement = this.elements[this.elements.length - 1];
        return lastElement.yPos + (lastElement.yModifier || 0) + this.spacingY;
    }

    private addCheckbox(text: string, setting: keyof CRABS_Settings & string, hint: string, options?: Partial<CheckboxElement>) {
        const element: CheckboxElement = {
            type: 'Checkbox',
            text,
            setting,
            hint,
            yPos: this.getNewYPos(),
            width: 64,
            height: 64,
            xModifier: 0,
            yModifier: 0,
            ...options
        };
        this.elements.push(element);
    }

    /**
     * Registers the mod in the game's Extensions menu.
     */
    private registerExtension(): void {
        const waitForFunc = () => {
            if (typeof (window as any).PreferenceRegisterExtensionSetting === "function") {
                (window as any).PreferenceRegisterExtensionSetting({
                    Identifier: "CRABS",
                    ButtonText: "CRABS",
                    Image: "https://sin-1337.github.io/CRABS/images/CRABS_Logo.png",
                    click: () => this.click(),
                    run: () => this.draw(),
                    exit: () => {
                        (window as any).PreferenceMessage = "";
                        (window as any).PreferenceExtensionsCurrent = null;
                        (window as any).CurrentSubScreen = "Extension";
                    },
                    load: () => {
                        (window as any).PreferenceMessage = "";
                    }
                });
            } else {
                setTimeout(waitForFunc, 1000);
            }
        };
        waitForFunc();
    }

    /**
     * Renders the settings UI.
     */
    public draw(): void {
        const isMouseIn = (window as any).MouseIn;
        const DrawText = (window as any).DrawText;
        const DrawCheckbox = (window as any).DrawCheckbox;
        const DrawButton = (window as any).DrawButton;
        const DrawCharacter = (window as any).DrawCharacter;
        const MainCanvas = (window as any).MainCanvas;
        const PreferenceMessage = (window as any).PreferenceMessage;

        if (!MainCanvas) return;

        // Draw the player & controls
        DrawCharacter(Player, 50, 50, 0.9);
        DrawButton(1815, 75, 90, 90, "", "White", "Icons/Exit.png", "Back");

        if (PreferenceMessage && PreferenceMessage !== "") {
            DrawText(PreferenceMessage, 1400, 125, "Red", "Black");
        }
        
        DrawText("CRABS Settings - Click on a setting name for more info", 500, 125, "Black", "Gray");

        for (const element of this.elements) {
            const x = this.menuElementXOffset + (element.xModifier || 0);
            const y = element.yPos;

            if (element.type === 'Checkbox') {
                DrawText(element.text, 500, y, "Black", "Gray");
                DrawCheckbox(x, y - 32, 64, 64, "", this.data[element.setting as keyof CRABS_Settings]);
                
                // Show hint on hover/click of the label
                if (isMouseIn(500, y - 18, 500, 36)) {
                    (window as any).DrawText(element.hint, 1000, 950, "Black", "Gray");
                }
            }
        }
    }

    /**
     * Handles clicks for the settings UI.
     */
    public click(): void {
        const isMouseIn = (window as any).MouseIn;
        const mouseX = (window as any).MouseX;
        const mouseY = (window as any).MouseY;

        for (const element of this.elements) {
            const x = this.menuElementXOffset + (element.xModifier || 0);
            const y = element.yPos - (element.height || 0) / 2;
            const w = element.width;
            const h = element.height || 36;

            // Check for click on the interactive part
            if (isMouseIn(x, y, w, h)) {
                this.handleElementAction(element, mouseX, x);
                this.save();
                return;
            }

            // Check for click on the label to show hint as message
            if (isMouseIn(500, element.yPos - 18, 500, 36)) {
                (window as any).PreferenceMessage = element.hint;
                return;
            }
        }

        // Handle the Back button (native BC preference screen behavior)
        if (isMouseIn(1815, 75, 90, 90)) {
            (window as any).PreferenceMessage = "";
            (window as any).PreferenceExtensionsCurrent = null;
            (window as any).CurrentSubScreen = "Extension";
        }
    }

    private handleElementAction(element: UIElement, mouseX: number, elementX: number) {
        const isGrayedOut = typeof element.grayedOut === 'function' ? element.grayedOut() : element.grayedOut;
        if (isGrayedOut) return;

        switch (element.type) {
            case 'Checkbox':
                this.data[element.setting as keyof CRABS_Settings] = !this.data[element.setting as keyof CRABS_Settings] as any;
                break;
        }
    }
}
