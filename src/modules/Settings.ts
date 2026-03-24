import { CRABS_Base } from "./base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { UISettingsManager } from "./UISettings";

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

export class Settings extends CRABS_Base {
    public data: CRABS_Settings;
    public ui: UISettingsManager<CRABS_Settings>;
    private readonly STORAGE_KEY = "CRABS_Settings";

    constructor(CRABS: ModSDKModAPI) {
        super(CRABS);
        this.data = this.load();
        this.ui = new UISettingsManager(this.data);
        this.setupUI();
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
        this.ui.setSubscreen('Main');
        
        this.ui.addCheckbox(
            "Show Banner on Entry", 
            "showBanner", 
            "Automatically display the room information banner whenever you join a new chat room."
        );

        this.ui.addCheckbox(
            "/roster opens drawer", 
            "rosterOpensDrawer", 
            "Redirect the standard /roster command to toggle the drawer instead of printing to chat."
        );

        this.ui.addCheckbox(
            "Immersive Mode", 
            "immersiveMode", 
            "Respect in-game sensory restrictions. Roster blur levels will match your blindness level."
        );

        this.ui.addCheckbox(
            "Respect BCX Rules", 
            "respectBcxRules", 
            "Allow supported BCX rules (like room interaction limits or sensory rules) to impact CRABS functionality."
        );

        this.ui.addCheckbox(
            "Compact Drawer", 
            "compactDrawer", 
            "Reduce the drawer height to 77% of the chat area so some messages remain visible."
        );

        this.ui.addCheckbox(
            "Auto-stow on Whisper+", 
            "closeDrawerOnWhisper", 
            "Automatically close the drawer after you successfully send a /whisper+ message."
        );

        this.ui.addCheckbox(
            "Auto-stow on Chat", 
            "closeDrawerOnChat", 
            "Automatically close the drawer when you send a normal chat message."
        );

        this.ui.addCheckbox(
            "Disable Drawer UI", 
            "disableDrawer", 
            "Completely disable the drawer interface and hide the logo tab from the screen edge."
        );
    }

    /**
     * Renders the settings UI.
     * Designed to be called within a ModSDK hook for the preference screen.
     */
    public draw(): void {
        const isMouseIn = (window as any).MouseIn;
        const DrawText = (window as any).DrawText;
        const DrawCheckbox = (window as any).DrawCheckbox;
        const MainCanvas = (window as any).MainCanvas;

        if (!MainCanvas) return;

        this.ui.forEachElement((element, x, y) => {
            if (element.type === 'Checkbox') {
                DrawText(element.text, 500, y, "White", "left");
                DrawCheckbox(x, y - 32, 64, 64, "", this.data[element.setting as keyof CRABS_Settings]);
                
                // Show hint on hover
                if (isMouseIn(500, y - 18, 500, 36)) {
                    (window as any).DrawText(element.hint, 1000, 950, "White", "center");
                }
            }
        });
    }

    /**
     * Handles clicks for the settings UI.
     */
    public click(): void {
        const isMouseIn = (window as any).MouseIn;
        const mouseX = (window as any).MouseX;
        const mouseY = (window as any).MouseY;

        const clicked = this.ui.handleClick(mouseX, mouseY, isMouseIn);
        if (clicked) {
            this.save();
        }
    }
}
