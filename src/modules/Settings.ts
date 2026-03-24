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
};

/**
 * Combined Settings and UI Manager for CRABS.
 */
export class Settings extends CRABS_Base {
    public data: CRABS_Settings;
    private elements: UIElement[] = [];
    private readonly STORAGE_KEY = "CRABS_Settings";
    
    private menuElementXOffset: number = 1000;
    private startY: number = 240;
    private spacingY: number = 70;

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
            "Respect Blindfolds", 
            "immersiveBlind", 
            "Roster visibility will be blurred based on your character's blindness level.",
            { category: "Immersion" }
        );
        this.addCheckbox(
            "Respect Gags", 
            "immersiveGag", 
            "Prevent sending Whisper+ messages if your character is gagged.",
            { category: "Immersion" }
        );
        this.addCheckbox(
            "Respect BCX Rules", 
            "respectBcxRules", 
            "Allow supported BCX rules to impact CRABS functionality.",
            { category: "Immersion" }
        );
    }

    private getNewYPos(category?: string): number {
        const catElements = this.elements.filter(e => e.category === category);
        if (catElements.length === 0) {
            // New category positioning
            if (category === "Banner") return 240;
            if (category === "Drawer") return 380;
            if (category === "Immersion") return 240;
            return this.startY;
        }
        const lastElement = catElements[catElements.length - 1];
        return lastElement.yPos + this.spacingY;
    }

    private addCheckbox(text: string, setting: keyof CRABS_Settings & string, hint: string, options?: Partial<CheckboxElement>) {
        const category = options?.category;
        const element: CheckboxElement = {
            type: 'Checkbox',
            text,
            setting,
            hint,
            yPos: this.getNewYPos(category),
            width: 64,
            height: 64,
            xModifier: category === "Immersion" ? 450 : 0, // Split into two columns
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
        
        // Header
        MainCanvas.textAlign = "center";
        DrawText("- CRABS Mod Settings -", 1000, 80, "Black", "Gray");
        DrawButton(1815, 75, 90, 90, "", "White", "Icons/Exit.png", "Back to Extensions");

        if (PreferenceMessage && PreferenceMessage !== "") {
            DrawText(PreferenceMessage, 1000, 150, "Red", "Black");
        } else {
            DrawText("Hover/Click setting names for detailed descriptions", 1000, 150, "Gray", "Black");
        }

        // Draw Section Cards
        // Left Column: Banner & Drawer
        DrawRect(480, 200, 700, 120, "#ffffff11"); // Banner card
        DrawText("Banner Options", 830, 220, "White", "Gray");
        
        DrawRect(480, 340, 700, 420, "#ffffff11"); // Drawer card
        DrawText("Drawer Options", 830, 360, "White", "Gray");

        // Right Column: Immersion
        DrawRect(1200, 200, 600, 280, "#ffffff11"); // Immersion card
        DrawText("Immersion & Rules", 1500, 220, "White", "Gray");

        MainCanvas.textAlign = "left";
        for (const element of this.elements) {
            const x = this.menuElementXOffset + (element.xModifier || 0);
            const y = element.yPos;
            const labelX = element.category === "Immersion" ? 1220 : 500;

            if (element.type === 'Checkbox') {
                DrawText(element.text, labelX, y, "Black", "Gray");
                DrawCheckbox(x, y - 32, 64, 64, "", this.data[element.setting as keyof CRABS_Settings]);
                
                if (isMouseIn(labelX, y - 18, 450, 36)) {
                    MainCanvas.textAlign = "center";
                    (window as any).DrawText(element.hint, 1000, 950, "Black", "Gray");
                    MainCanvas.textAlign = "left";
                }
            }
        }
        MainCanvas.textAlign = "center";
    }

    public click(): void {
        const isMouseIn = (window as any).MouseIn;
        const mouseX = (window as any).MouseX;
        const mouseY = (window as any).MouseY;

        // Corrected Back button using native clear function
        if (isMouseIn(1815, 75, 90, 90)) {
            (window as any).PreferenceMessage = "";
            (window as any).PreferenceSubscreenExtensionsClear();
            return;
        }

        for (const element of this.elements) {
            const x = this.menuElementXOffset + (element.xModifier || 0);
            const y = element.yPos - (element.height || 0) / 2;
            const w = element.width;
            const h = element.height || 36;
            const labelX = element.category === "Immersion" ? 1220 : 500;

            // Check for click on the checkbox
            if (isMouseIn(x, y, w, h)) {
                if (element.type === 'Checkbox') {
                    (this.data as any)[element.setting] = !(this.data as any)[element.setting];
                    this.save();
                }
                return;
            }

            // Click label to lock hint
            if (isMouseIn(labelX, element.yPos - 18, 450, 36)) {
                (window as any).PreferenceMessage = element.hint;
                return;
            }
        }
    }
}
