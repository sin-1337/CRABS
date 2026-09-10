/**
 * CRABS Settings Widgets
 *
 * Canvas and virtualized DOM UI control primitives for the CRABS settings
 * preference subscreen, providing checkboxes, text/color inputs, textareas,
 * action buttons, styled select dropdowns, and read-only labels.
 *
 * @module settings/widgets
 */

/**
 * 2D spatial bounding box defining component layout coordinates and dimensions.
 */
export interface Bounds {
  /** Left horizontal origin coordinate (px). */
  x: number;

  /** Vertical center/anchor coordinate (px). */
  y: number;

  /** Rendered width (px). */
  w: number;

  /** Rendered height (px). */
  h: number;
}

/**
 * Abstract base class for settings interface widgets rendered inside {@link LayoutEngine}.
 *
 * Coordinates canvas rendering routines, hit detection, dynamic label/hint evaluation,
 * and virtualized HTML DOM overlay lifecycle management.
 */
export abstract class UIWidget {
  /** Vertical row spacing allocated to this widget in the layout list (px). */
  public rowHeight: number = 75;

  /**
   * Initializes common widget properties.
   *
   * @param label - Display label string or dynamic evaluator function.
   * @param hint - Tooltip explanation string or dynamic evaluator function.
   * @param getIsDisabled - Evaluator returning whether this control is currently locked.
   */
  constructor(
    public label: string | (() => string),
    public hint: string | (() => string),
    public getIsDisabled: () => boolean,
  ) {}

  /**
   * Resolves the current label text.
   *
   * @protected
   * @returns Resolved display string.
   */
  protected getLabel(): string {
    return typeof this.label === "function" ? this.label() : this.label;
  }

  /**
   * Resolves the current tooltip explanation text.
   *
   * @protected
   * @returns Resolved tooltip string.
   */
  protected getHint(): string {
    return typeof this.hint === "function" ? this.hint() : this.hint;
  }

  /**
   * Draws the widget representation onto the settings 2D canvas context.
   *
   * @param ctx - Canvas 2D rendering context.
   * @param bounds - Computed spatial layout bounds.
   * @param setTooltip - Callback registering active hover tooltip text.
   */
  abstract draw(
    ctx: CanvasRenderingContext2D,
    bounds: Bounds,
    setTooltip: (hint: string) => void,
  ): void;

  /**
   * Processes a canvas mouse click within the active tab.
   *
   * @param bounds - Computed spatial layout bounds.
   * @param mouseX - Canvas relative mouse X coordinate.
   * @param mouseY - Canvas relative mouse Y coordinate.
   * @returns True if the click was consumed by this widget.
   */
  abstract click(bounds: Bounds, mouseX: number, mouseY: number): boolean;

  /**
   * Synchronizes underlying HTML DOM elements (inputs, textareas, selects)
   * with current viewport scroll offsets and visibility states.
   *
   * @param bounds - Computed spatial layout bounds.
   * @param isVisible - True if the host tab and settings dialog are actively shown.
   */
  abstract updateDOM(bounds: Bounds, isVisible: boolean): void;
}

/**
 * Boolean checkbox control rendered natively via the game's `DrawCheckbox` canvas API.
 */
export class CheckboxWidget extends UIWidget {
  /**
   * Initializes a new checkbox toggle widget.
   *
   * @param label - Display label string or dynamic evaluator function.
   * @param hint - Tooltip explanation string or dynamic evaluator function.
   * @param getIsDisabled - Evaluator returning whether the toggle is locked.
   * @param getValue - Accessor returning the current boolean value.
   * @param setValue - Mutation callback writing the updated boolean state.
   */
  constructor(
    label: string | (() => string),
    hint: string | (() => string),
    getIsDisabled: () => boolean,
    private getValue: () => boolean,
    private setValue: (val: boolean) => void,
  ) {
    super(label, hint, getIsDisabled);
  }

  /**
   * Draws the native checkbox box, checkmark, and trailing text label.
   *
   * @param ctx - Canvas 2D rendering context.
   * @param bounds - Computed spatial layout bounds.
   * @param setTooltip - Callback registering active hover tooltip text.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    bounds: Bounds,
    setTooltip: (hint: string) => void,
  ): void {
    const globalWindow = window as any;
    const locked = this.getIsDisabled();

    globalWindow.DrawCheckbox(
      bounds.x,
      bounds.y - 32,
      64,
      64,
      "",
      this.getValue(),
      locked,
    );

    ctx.textAlign = "left";
    globalWindow.DrawText(
      this.getLabel(),
      bounds.x + 90,
      bounds.y,
      locked ? "#888888" : "Black",
      "",
    );

    if (globalWindow.MouseIn(bounds.x, bounds.y - 32, 500, 64)) {
      setTooltip(this.getHint());
    }
  }

  /**
   * No-op since checkboxes are drawn purely on canvas without DOM elements.
   */
  updateDOM(): void {}

  /**
   * Toggles the boolean state if the click lands within the row bounding box.
   *
   * @param bounds - Computed spatial layout bounds.
   * @param _mouseX - Canvas relative mouse X coordinate (unused).
   * @param _mouseY - Canvas relative mouse Y coordinate (unused).
   * @returns True if the toggle state changed.
   */
  click(bounds: Bounds, _mouseX: number, _mouseY: number): boolean {
    if (this.getIsDisabled()) return false;

    if ((window as any).MouseIn(bounds.x, bounds.y - 32, 500, 64)) {
      this.setValue(!this.getValue());
      return true;
    }
    return false;
  }
}

/**
 * Dropdown selection menu combining a canvas text label with a styled HTML `<select>` overlay.
 */
export class SelectWidget extends UIWidget {
  /**
   * Initializes a new select dropdown widget.
   *
   * @param label - Display label string or dynamic evaluator function.
   * @param hint - Tooltip explanation string or dynamic evaluator function.
   * @param getIsDisabled - Evaluator returning whether the select is locked.
   * @param domID - Unique HTML element ID assigned to the `<select>` tag.
   * @param getOptions - Supplier returning value/text pairs for options.
   * @param getValue - Accessor returning the active selected option value.
   * @param setValue - Mutation callback writing the selected option value.
   */
  constructor(
    label: string | (() => string),
    hint: string | (() => string),
    getIsDisabled: () => boolean,
    private domID: string,
    private getOptions: () => { value: string; text: string }[],
    private getValue: () => string,
    private setValue: (val: string) => void,
  ) {
    super(label, hint, getIsDisabled);
  }

  /**
   * Draws the leading canvas text label for the dropdown.
   *
   * @param ctx - Canvas 2D rendering context.
   * @param bounds - Computed spatial layout bounds.
   * @param setTooltip - Callback registering active hover tooltip text.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    bounds: Bounds,
    setTooltip: (hint: string) => void,
  ): void {
    const globalWindow = window as any;
    const locked = this.getIsDisabled();

    ctx.textAlign = "left";
    globalWindow.DrawText(
      `${this.getLabel()}:`,
      bounds.x,
      bounds.y,
      locked ? "#888888" : "Black",
      "",
    );

    if (globalWindow.MouseIn(bounds.x, bounds.y - 18, 500, 36)) {
      setTooltip(this.getHint());
    }
  }

  /**
   * Creates or repositions the HTML `<select>` element to align over the canvas row.
   *
   * @param bounds - Computed spatial layout bounds.
   * @param isVisible - True if the host tab and settings dialog are actively shown.
   */
  updateDOM(bounds: Bounds, isVisible: boolean): void {
    const globalWindow = window as any;
    const locked = this.getIsDisabled();
    let el = document.getElementById(this.domID) as HTMLSelectElement | null;

    if (!el && isVisible) {
      el = document.createElement("select");
      el.id = this.domID;
      el.className = "HideOnPopup";

      // Visual styling matching the dark BC UI
      el.style.position = "fixed";
      el.style.zIndex = "100";
      el.style.fontFamily = "Arial, sans-serif";
      el.style.color = "#FFFFFF";
      el.style.backgroundColor = "#2d2a3e";
      el.style.border = "2px solid #555555";
      el.style.borderRadius = "6px";
      el.style.padding = "0 32px 0 10px";
      el.style.lineHeight = "1";
      el.style.cursor = "pointer";
      el.style.boxSizing = "border-box";
      el.style.outline = "none";
      el.style.appearance = "none";
      el.style.backgroundImage =
        "url('https://sin-1337.github.io/CRABS/images/down-arrow.svg')";
      el.style.backgroundRepeat = "no-repeat";
      el.style.backgroundPosition = "right 10px center";
      el.style.backgroundSize = "14px";

      el.addEventListener("focus", () => {
        el!.style.borderColor = "#AAAAAA";
      });
      el.addEventListener("blur", () => {
        el!.style.borderColor = "#555555";
      });

      document.body.appendChild(el);

      el.addEventListener("change", (e) => {
        this.setValue((e.target as HTMLSelectElement).value);
      });
    }

    if (el) {
      const options = this.getOptions();
      const currentHtml = options
        .map(
          (opt) =>
            `<option value="${opt.value}" ${opt.value === this.getValue() ? "selected" : ""} style="background-color: #222222; color: #FFFFFF;">${opt.text}</option>`,
        )
        .join("");

      if (el.innerHTML !== currentHtml) {
        el.innerHTML = currentHtml;
      }
      el.value = this.getValue();
    }

    if (!locked && isVisible && el) {
      const inputWidth = 320;
      // Positioned immediately following the "Mod Language:" text label
      const inputStartX = bounds.x + 230;
      const centerX = inputStartX + inputWidth / 2;
      const centerY = bounds.y - 18;

      if (typeof globalWindow.ElementPositionFix === "function") {
        globalWindow.ElementPositionFix(
          this.domID,
          20,
          centerX,
          centerY,
          inputWidth,
          36,
        );
      } else {
        globalWindow.ElementPosition(
          this.domID,
          centerX,
          centerY,
          inputWidth,
          36,
        );
      }
    } else if (el) {
      globalWindow.ElementPosition(this.domID, -1000, -1000, 0, 0);
    }
  }

  /**
   * No-op for canvas clicks since input is captured directly by the DOM `<select>`.
   *
   * @returns False.
   */
  click(): boolean {
    return false;
  }
}

/**
 * Text or color input field combining a canvas label with an HTML `<input>` overlay.
 */
export class InputWidget extends UIWidget {
  /**
   * Initializes a new single-line input widget.
   *
   * @param label - Display label string or dynamic evaluator function.
   * @param hint - Tooltip explanation string or dynamic evaluator function.
   * @param getIsDisabled - Evaluator returning whether the input is locked.
   * @param domID - Unique HTML element ID assigned to the `<input>` tag.
   * @param inputType - Input type attribute (`"text"` or `"color"`).
   * @param getValue - Accessor returning the current string value.
   * @param setValue - Mutation callback writing the updated string value.
   */
  constructor(
    label: string | (() => string),
    hint: string | (() => string),
    getIsDisabled: () => boolean,
    private domID: string,
    private inputType: "text" | "color",
    private getValue: () => string,
    private setValue: (val: string) => void,
  ) {
    super(label, hint, getIsDisabled);
  }

  /**
   * Draws the leading canvas text label for the input.
   *
   * @param ctx - Canvas 2D rendering context.
   * @param bounds - Computed spatial layout bounds.
   * @param setTooltip - Callback registering active hover tooltip text.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    bounds: Bounds,
    setTooltip: (hint: string) => void,
  ): void {
    const globalWindow = window as any;
    const locked = this.getIsDisabled();

    ctx.textAlign = "left";
    globalWindow.DrawText(
      this.getLabel(),
      bounds.x,
      bounds.y,
      locked ? "#888888" : "Black",
      "",
    );

    if (globalWindow.MouseIn(bounds.x, bounds.y - 18, 500, 36))
      setTooltip(this.getHint());
  }

  /**
   * Synchronizes positioning and value states for the underlying HTML input.
   *
   * @param bounds - Computed spatial layout bounds.
   * @param isVisible - True if the host tab and settings dialog are actively shown.
   */
  updateDOM(bounds: Bounds, isVisible: boolean): void {
    const globalWindow = window as any;
    const locked = this.getIsDisabled();
    const el = document.getElementById(this.domID);

    if (!el && isVisible) {
      globalWindow.ElementCreateInput(
        this.domID,
        this.inputType,
        this.getValue(),
        this.inputType === "color" ? 180 : 250,
      );
      document.getElementById(this.domID)?.addEventListener("input", (e) => {
        this.setValue((e.target as HTMLInputElement).value);
      });
    }

    if (!locked && isVisible) {
      const inputWidth = this.inputType === "color" ? 180 : 260;
      const inputStartX = bounds.x + 320;
      const centerX = inputStartX + inputWidth / 2;
      globalWindow.ElementPosition(
        this.domID,
        centerX,
        bounds.y,
        inputWidth,
        36,
      );
    } else if (document.getElementById(this.domID)) {
      globalWindow.ElementPosition(this.domID, -1000, -1000, 0, 0);
    }
  }

  /**
   * No-op for canvas clicks since input is captured directly by the DOM `<input>`.
   *
   * @returns False.
   */
  click(): boolean {
    return false;
  }
}

/**
 * Interactive button control rendered via the game's `DrawButton` canvas API.
 */
export class ButtonWidget extends UIWidget {
  /** Execution callback invoked when the button is clicked. */
  public onClick: () => void;

  /**
   * Initializes a new button widget.
   *
   * @param label - Display label string or dynamic evaluator function.
   * @param hint - Tooltip explanation string or dynamic evaluator function.
   * @param onClick - Execution callback invoked when the button is clicked.
   * @param isDisabled - Optional evaluator returning whether the button is disabled.
   */
  constructor(
    label: string | (() => string),
    hint: string | (() => string),
    onClick: () => void,
    isDisabled: () => boolean = () => false,
  ) {
    super(label, hint, isDisabled);
    this.onClick = onClick;
  }

  /**
   * No-op since buttons are rendered purely on canvas.
   *
   * @param _bounds - Computed spatial layout bounds (unused).
   * @param _isVisible - Active visibility state (unused).
   */
  updateDOM(_bounds: Bounds, _isVisible: boolean): void {}

  /**
   * Draws the button background, outline, and centered label text.
   *
   * @param ctx - Canvas 2D rendering context.
   * @param bounds - Computed spatial layout bounds.
   * @param setTooltip - Callback registering active hover tooltip text.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    bounds: Bounds,
    setTooltip: (hint: string) => void,
  ): void {
    const globalWindow = window as any;
    const disabled = this.getIsDisabled();

    ctx.textAlign = "center";
    globalWindow.DrawButton(
      bounds.x,
      bounds.y - 32,
      200,
      64,
      this.getLabel(),
      disabled ? "#888" : "White",
      "",
    );

    if (globalWindow.MouseIn(bounds.x, bounds.y - 32, 200, 64)) {
      setTooltip(this.getHint());
    }
  }

  /**
   * Triggers {@link onClick} if the click lands within button bounds and is enabled.
   *
   * @param bounds - Computed spatial layout bounds.
   * @param _mouseX - Canvas relative mouse X coordinate (unused).
   * @param _mouseY - Canvas relative mouse Y coordinate (unused).
   * @returns True if the button consumed the click.
   */
  click(bounds: Bounds, _mouseX: number, _mouseY: number): boolean {
    const globalWindow = window as any;

    if (
      !this.getIsDisabled() &&
      globalWindow.MouseIn(bounds.x, bounds.y - 32, 200, 64)
    ) {
      this.onClick();
      return true;
    }
    return false;
  }
}

/**
 * Static or dynamic read-only text label rendered directly onto the canvas.
 */
export class TextLabelWidget extends UIWidget {
  /** Internal text resolver source. */
  private textContent: string | (() => string);

  /**
   * Initializes a new text label widget.
   *
   * @param textContent - Static string or evaluator function returning text to draw.
   * @param hint - Optional tooltip explanation string or dynamic evaluator function.
   * @param getIsDisabled - Optional evaluator returning whether text should draw greyed out.
   */
  constructor(
    textContent: string | (() => string),
    hint: string | (() => string) = "",
    getIsDisabled: () => boolean = () => false,
  ) {
    super(textContent, hint, getIsDisabled);
    this.textContent = textContent;
  }

  /**
   * Draws the text string onto the canvas and tests for hover tooltips.
   *
   * @param ctx - Canvas 2D rendering context.
   * @param bounds - Computed spatial layout bounds.
   * @param setTooltip - Callback registering active hover tooltip text.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    bounds: Bounds,
    setTooltip: (hint: string) => void,
  ): void {
    const globalWindow = window as any;
    const disabled = this.getIsDisabled();
    const textToDraw =
      typeof this.textContent === "function"
        ? this.textContent()
        : this.textContent;

    ctx.textAlign = "left";
    globalWindow.DrawText(
      textToDraw,
      bounds.x,
      bounds.y,
      disabled ? "#888888" : "Black",
      "",
    );

    const hintStr = this.getHint();
    if (hintStr && globalWindow.MouseIn(bounds.x, bounds.y - 18, 500, 36)) {
      setTooltip(hintStr);
    }
  }

  /**
   * No-op since labels are purely canvas-based.
   */
  updateDOM(): void {}

  /**
   * Text labels do not capture or react to click events.
   *
   * @returns False.
   */
  click(): boolean {
    return false;
  }
}

/**
 * Multi-line text entry field combining a canvas title with an HTML `<textarea>` overlay.
 */
export class TextAreaWidget extends UIWidget {
  /**
   * Initializes a new multi-line textarea widget.
   *
   * @param label - Display label string or dynamic evaluator function.
   * @param hint - Tooltip explanation string or dynamic evaluator function.
   * @param getIsDisabled - Evaluator returning whether the textarea is locked.
   * @param domID - Unique HTML element ID assigned to the `<textarea>` tag.
   * @param getValue - Accessor returning the current text content.
   * @param setValue - Mutation callback writing the updated text content.
   */
  constructor(
    label: string | (() => string),
    hint: string | (() => string),
    getIsDisabled: () => boolean,
    private domID: string,
    private getValue: () => string,
    private setValue: (val: string) => void,
  ) {
    super(label, hint, getIsDisabled);
    this.rowHeight = 105;
  }

  /**
   * Draws the heading canvas text label above the textarea bounds.
   *
   * @param ctx - Canvas 2D rendering context.
   * @param bounds - Computed spatial layout bounds.
   * @param setTooltip - Callback registering active hover tooltip text.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    bounds: Bounds,
    setTooltip: (hint: string) => void,
  ): void {
    const globalWindow = window as any;
    const locked = this.getIsDisabled();

    ctx.textAlign = "left";
    globalWindow.DrawText(
      this.getLabel(),
      bounds.x,
      bounds.y - 20,
      locked ? "#888888" : "Black",
      "",
    );

    if (globalWindow.MouseIn(bounds.x, bounds.y - 40, 500, this.rowHeight))
      setTooltip(this.getHint());
  }

  /**
   * Creates or positions the HTML `<textarea>` element to align over the canvas row.
   *
   * @param bounds - Computed spatial layout bounds.
   * @param isVisible - True if the host tab and settings dialog are actively shown.
   */
  updateDOM(bounds: Bounds, isVisible: boolean): void {
    const globalWindow = window as any;
    const locked = this.getIsDisabled();
    let el = document.getElementById(this.domID) as HTMLTextAreaElement;

    if (!el && isVisible) {
      if (typeof globalWindow.ElementCreateTextArea === "function") {
        globalWindow.ElementCreateTextArea(this.domID);
      } else {
        el = document.createElement("textarea");
        el.id = this.domID;
        el.className = "HideOnPopup";
        document.body.appendChild(el);
      }

      el = document.getElementById(this.domID) as HTMLTextAreaElement;
      if (el) {
        el.value = this.getValue() || "";
        el.style.resize = "vertical";
        el.addEventListener("input", (e) => {
          this.setValue((e.target as HTMLTextAreaElement).value);
        });
      }
    }

    if (!locked && isVisible) {
      const inputWidth = 350;
      const inputStartX = bounds.x + 320;
      const centerX = inputStartX + inputWidth / 2;

      globalWindow.ElementPosition(
        this.domID,
        centerX,
        bounds.y + 15,
        inputWidth,
        120,
      );
    } else if (document.getElementById(this.domID)) {
      globalWindow.ElementPosition(this.domID, -1000, -1000, 0, 0);
    }
  }

  /**
   * No-op for canvas clicks since input is captured directly by the DOM `<textarea>`.
   *
   * @returns False.
   */
  click(): boolean {
    return false;
  }
}
