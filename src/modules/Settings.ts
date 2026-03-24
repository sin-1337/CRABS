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
    immersiveBlind: boolean;
    immersiveGag: boolean;
    respectBcxRules: boolean;
    compactDrawer: boolean;
    closeDrawerOnWhisper: boolean;
    closeDrawerOnChat: boolean;
    disableDrawer: boolean;
    lockImmersive: boolean;
}

const DEFAULT_SETTINGS: CRABS_Settings = {
    showBanner: true,
    rosterOpensDrawer: true,
    immersiveBlind: false,
    immersiveGag: false,
    respectBcxRules: true,
    compactDrawer: false,
    closeDrawerOnWhisper: false,
    closeDrawerOnChat: false,
    disableDrawer: false,
    lockImmersive: false,
};

/**
 * Combined Settings and UI Manager for CRABS.
 */
export class Settings extends CRABS_Base {
    public data: CRABS_Settings;
    private elements: UIElement[] = [];
    private readonly STORAGE_KEY = "CRABS_Settings";
    
    // Adjusted Layout Constants to clear character area
    private readonly LEFT_COL_X = 550; // Card start
    private readonly RIGHT_COL_X = 1250; // Card start
    private readonly CHECKBOX_X_OFFSET = 30; // Relative to card start
    private readonly LABEL_X_OFFSET = 110; // Relative to card start
    private readonly CHECKBOX_WIDTH = 64;
    private readonly SPACING_Y = 75;

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

    private isRestricted(): boolean {
        // Character is restricted if hands are bound or they cannot reach their own items
        return (window as any).Player.IsRestrained() || (window as any).Player.IsBound();
    }

    private setupUI(): void {
        this.elements = []; 
        
        // Category: Banner
        this.addCheckbox(
            "Show Banner on Entry", 
            "showBanner", 
            "Automatically display the room information banner whenever you join a new chat room.",
            { category: "Banner" }
        );

        // Category: Drawer
        this.addCheckbox(
            "Disable Drawer UI", 
            "disableDrawer", 
            "Completely disable the drawer interface and hide the side tab.",
            { category: "Drawer" }
        );
        this.addCheckbox(
            "/roster toggles drawer", 
            "rosterOpensDrawer", 
            "The standard /roster command will toggle the drawer instead of printing to chat.",
            { category: "Drawer" }
        );
        this.addCheckbox(
            "Compact Height", 
            "compactDrawer", 
            "Limit drawer height to 77% so some of the chat remains visible.",
            { category: "Drawer" }
        );
        this.addCheckbox(
            "Auto-stow on Whisper+", 
            "closeDrawerOnWhisper", 
            "Automatically close the drawer after you successfully send a /whisper+ message.",
            { category: "Drawer" }
        );
        this.addCheckbox(
            "Auto-stow on Chat", 
            "closeDrawerOnChat", 
            "Automatically close the drawer when you send a normal chat message.",
            { category: "Drawer" }
        );

        // Category: Immersion
        this.addCheckbox(
            "Hardcore Lock", 
            "lockImmersive", 
            "Locks immersive settings in the ON position while you are bound. You must be free to disable them.",
            { category: "Immersion" }
        );

        // Functional helper to check if a specific setting should be grayed out (locked)
        const isLocked = (setting: keyof CRABS_Settings) => {
            return () => this.data.lockImmersive && this.isRestricted() && this.data[setting] === true;
        };

        this.addCheckbox(
            "Respect Blindfolds", 
            "immersiveBlind", 
            "Roster visibility will be blurred based on your character's blindness level.",
            { category: "Immersion", grayedOut: isLocked("immersiveBlind") }
        );
        this.addCheckbox(
            "Respect Gags", 
            "immersiveGag", 
            "Prevent sending Whisper+ messages if your character is gagged.",
            { category: "Immersion", grayedOut: isLocked("immersiveGag") }
        );
        this.addCheckbox(
            "Respect BCX Rules", 
            "respectBcxRules", 
            "Allow supported BCX rules to impact CRABS functionality.",
            { category: "Immersion", grayedOut: isLocked("respectBcxRules") }
        );
    }

    private getNewYPos(category?: string): number {
        const catElements = this.elements.filter(e => e.category === category);
        if (catElements.length === 0) {
            if (category === "Banner") return 240;
            if (category === "Drawer") return 385;
            if (category === "Immersion") return 240;
            return 240;
        }
        const lastElement = catElements[catElements.length - 1];
        return lastElement.yPos + this.SPACING_Y;
    }

    private addCheckbox(text: string, setting: keyof CRABS_Settings & string, hint: string, options?: Partial<CheckboxElement>) {
        const category = options?.category;
        const element: CheckboxElement = {
            type: 'Checkbox',
            text,
            setting,
            hint,
            yPos: this.getNewYPos(category),
            width: this.CHECKBOX_WIDTH,
            height: this.CHECKBOX_WIDTH,
            xModifier: 0,
            yModifier: 0,
            ...options
        };
        this.elements.push(element);
    }

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

    public draw(): void {
        const isMouseIn = (window as any).MouseIn;
        const DrawText = (window as any).DrawText;
        const DrawCheckbox = (window as any).DrawCheckbox;
        const DrawButton = (window as any).DrawButton;
        const DrawCharacter = (window as any).DrawCharacter;
        const DrawRect = (window as any).DrawRect;
        const MainCanvas = (window as any).MainCanvas;
        const PreferenceMessage = (window as any).PreferenceMessage;

        if (!MainCanvas) return;

        // Draw character background card
        DrawRect(40, 40, 420, 920, "#222222aa");
        DrawCharacter(Player, 50, 50, 0.9);
        
        // Main Header
        MainCanvas.textAlign = "center";
        DrawText("- CRABS Mod Settings -", 1000, 80, "Black", "Gray");
        DrawButton(1815, 75, 90, 90, "", "White", "Icons/Exit.png", "Back to Extensions");

        // Info message / Hint area
        if (PreferenceMessage && PreferenceMessage !== "") {
            DrawText(PreferenceMessage, 1100, 150, "Red", "Black");
        } else {
            DrawText("Hover setting names for detailed descriptions", 1100, 150, "Black", "Gray");
        }

        // Draw Section Cards
        // Left Column: Banner & Drawer
        DrawRect(this.LEFT_COL_X - 20, 200, 650, 125, "#ffffff11"); // Banner card
        DrawText("Banner Options", this.LEFT_COL_X + 305, 220, "White", "Gray");
        
        DrawRect(this.LEFT_COL_X - 20, 345, 650, 420, "#ffffff11"); // Drawer card
        DrawText("Drawer Options", this.LEFT_COL_X + 305, 365, "White", "Gray");

        // Right Column: Immersion
        DrawRect(this.RIGHT_COL_X - 20, 200, 650, 350, "#ffffff11"); // Immersion card
        DrawText("Immersion & Rules", this.RIGHT_COL_X + 305, 220, "White", "Gray");

        for (const element of this.elements) {
            const isImmersion = element.category === "Immersion";
            const cardX = isImmersion ? this.RIGHT_COL_X : this.LEFT_COL_X;
            const y = element.yPos;
            const checkboxX = cardX + this.CHECKBOX_X_OFFSET;
            const textX = cardX + this.LABEL_X_OFFSET;

            const isGrayedOut = typeof element.grayedOut === 'function' ? element.grayedOut() : element.grayedOut;

            if (element.type === 'Checkbox') {
                // Checkbox on the left
                DrawCheckbox(checkboxX, y - 32, 64, 64, "", (this.data as any)[element.setting], isGrayedOut);
                
                // Text on the right
                MainCanvas.textAlign = "left";
                DrawText(element.text, textX, y, isGrayedOut ? "Gray" : "Black", "Gray");
                
                // Hover hint logic
                if (isMouseIn(textX, y - 18, 400, 36) || isMouseIn(checkboxX, y - 32, 64, 64)) {
                    MainCanvas.textAlign = "center";
                    DrawText(element.hint, 1100, 950, "Black", "Gray");
                    MainCanvas.textAlign = "left";
                }
            }
        }
        MainCanvas.textAlign = "center";
    }

    public click(): void {
        const isMouseIn = (window as any).MouseIn;

        // Back button
        if (isMouseIn(1815, 75, 90, 90)) {
            (window as any).PreferenceMessage = "";
            (window as any).PreferenceSubscreenExtensionsClear();
            return;
        }

        for (const element of this.elements) {
            const isImmersion = element.category === "Immersion";
            const cardX = isImmersion ? this.RIGHT_COL_X : this.LEFT_COL_X;
            const y = element.yPos;
            const checkboxX = cardX + this.CHECKBOX_X_OFFSET;
            const textX = cardX + this.LABEL_X_OFFSET;

            const isGrayedOut = typeof element.grayedOut === 'function' ? element.grayedOut() : element.grayedOut;
            if (isGrayedOut) continue;

            // Only allow click on the checkbox itself
            if (isMouseIn(checkboxX, y - 32, 64, 64)) {
                if (element.type === 'Checkbox') {
                    (this.data as any)[element.setting] = !(this.data as any)[element.setting];
                    this.save();
                }
                return;
            }
        }
    }
}
