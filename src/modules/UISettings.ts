
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

/**
 * A barebones UI Settings System inspired by ULTRAbc.
 * This class manages UI element definitions and provides hooks for drawing and interaction.
 */
export class UISettingsManager<TSettings extends Record<string, any>> {
    private elements: Map<string, UIElement[]> = new Map();
    private currentSubscreen: string = 'Main';
    private settings: TSettings;
    private menuElementXOffset: number = 1000;
    private startY: number = 200;
    private spacingY: number = 75;

    constructor(settings: TSettings, options?: { xOffset?: number, startY?: number, spacingY?: number }) {
        this.settings = settings;
        if (options?.xOffset) this.menuElementXOffset = options.xOffset;
        if (options?.startY) this.startY = options.startY;
        if (options?.spacingY) this.spacingY = options.spacingY;
        this.elements.set(this.currentSubscreen, []);
    }

    /** Sets the current subscreen for element operations. */
    setSubscreen(subscreen: string) {
        this.currentSubscreen = subscreen;
        if (!this.elements.has(subscreen)) {
            this.elements.set(subscreen, []);
        }
    }

    private getNewYPos(): number {
        const subscreenElements = this.elements.get(this.currentSubscreen) || [];
        if (subscreenElements.length === 0) return this.startY;
        const lastElement = subscreenElements[subscreenElements.length - 1];
        return lastElement.yPos + (lastElement.yModifier || 0) + this.spacingY;
    }

    addCheckbox(text: string, setting: keyof TSettings & string, hint: string, options?: Partial<CheckboxElement>) {
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
        this.elements.get(this.currentSubscreen)?.push(element);
    }

    addButton(text: string, elementText: string, clickFunction: () => void, hint: string, options?: Partial<ButtonElement>) {
        const element: ButtonElement = {
            type: 'Button',
            text,
            elementText,
            clickFunction,
            hint,
            yPos: this.getNewYPos(),
            width: 200,
            height: 64,
            xModifier: 0,
            yModifier: 0,
            ...options
        };
        this.elements.get(this.currentSubscreen)?.push(element);
    }

    addInput(text: string, setting: keyof TSettings & string, identifier: string, hint: string, options?: Partial<InputElement>) {
        const element: InputElement = {
            type: 'Input',
            text,
            setting,
            identifier,
            hint,
            yPos: this.getNewYPos(),
            width: 300,
            xModifier: 0,
            yModifier: 0,
            ...options
        };
        this.elements.get(this.currentSubscreen)?.push(element);
    }

    addBackNext(text: string, setting: keyof TSettings & string, options: string[], hint: string, config?: Partial<BackNextElement>) {
        const currentIndex = options.indexOf(this.settings[setting]);
        const element: BackNextElement = {
            type: 'BackNext',
            text,
            setting,
            backNextOptions: options,
            index: currentIndex >= 0 ? currentIndex : 0,
            hint,
            yPos: this.getNewYPos(),
            width: 300,
            height: 64,
            xModifier: 0,
            yModifier: 0,
            ...config
        };
        this.elements.get(this.currentSubscreen)?.push(element);
    }

    /**
     * Iterates through elements for the current subscreen.
     * Use this in your draw loop to render the UI.
     */
    forEachElement(callback: (element: UIElement, x: number, y: number) => void) {
        const elements = this.elements.get(this.currentSubscreen) || [];
        for (const element of elements) {
            const x = this.menuElementXOffset + (element.xModifier || 0);
            const y = element.yPos;
            callback(element, x, y);
        }
    }

    /**
     * Handles clicks for the current subscreen.
     * You should pass mouse coordinates and a helper function to check if the mouse is in a rectangle.
     */
    handleClick(
        mouseX: number, 
        mouseY: number, 
        isMouseIn: (x: number, y: number, w: number, h: number) => boolean,
        onHintChange?: (hint: string) => void
    ) {
        const elements = this.elements.get(this.currentSubscreen) || [];
        for (const element of elements) {
            const x = this.menuElementXOffset + (element.xModifier || 0);
            const y = element.yPos - (element.height || 0) / 2;
            const w = element.width;
            const h = element.height || 36; // Default height for text hitboxes

            // Check for click on the interactive part
            if (isMouseIn(x, y, w, h)) {
                this.handleElementAction(element, mouseX, x);
                return true;
            }

            // Check for click/hover on the label (to show hints)
            if (isMouseIn(500, element.yPos - 18, this.menuElementXOffset - 500, 36)) {
                if (onHintChange) onHintChange(element.hint);
            }
        }
        return false;
    }

    private handleElementAction(element: UIElement, mouseX: number, elementX: number) {
        const isGrayedOut = typeof element.grayedOut === 'function' ? element.grayedOut() : element.grayedOut;
        if (isGrayedOut) return;

        switch (element.type) {
            case 'Checkbox':
                this.settings[element.setting as keyof TSettings] = !this.settings[element.setting] as any;
                break;
            case 'Button':
                element.clickFunction();
                break;
            case 'BackNext':
                if (mouseX <= elementX + element.width / 2) {
                    element.index = (element.index - 1 + element.backNextOptions.length) % element.backNextOptions.length;
                } else {
                    element.index = (element.index + 1) % element.backNextOptions.length;
                }
                this.settings[element.setting as keyof TSettings] = element.backNextOptions[element.index] as any;
                break;
        }
    }

    /** Returns the current subscreen name. */
    getCurrentSubscreen(): string {
        return this.currentSubscreen;
    }

    /** Returns all elements for a given subscreen. */
    getElements(subscreen: string = this.currentSubscreen): UIElement[] {
        return this.elements.get(subscreen) || [];
    }
}
