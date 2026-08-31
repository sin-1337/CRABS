export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export abstract class UIWidget {
  public rowHeight: number = 75;

  constructor(
    public label: string | (() => string),
    public hint: string | (() => string),
    public getIsDisabled: () => boolean,
  ) {}

  protected getLabel(): string {
    return typeof this.label === "function" ? this.label() : this.label;
  }

  protected getHint(): string {
    return typeof this.hint === "function" ? this.hint() : this.hint;
  }

  abstract draw(
    ctx: CanvasRenderingContext2D,
    bounds: Bounds,
    setTooltip: (hint: string) => void,
  ): void;
  abstract click(bounds: Bounds, mouseX: number, mouseY: number): boolean;
  abstract updateDOM(bounds: Bounds, isVisible: boolean): void;
}

export class CheckboxWidget extends UIWidget {
  constructor(
    label: string | (() => string),
    hint: string | (() => string),
    getIsDisabled: () => boolean,
    private getValue: () => boolean,
    private setValue: (val: boolean) => void,
  ) {
    super(label, hint, getIsDisabled);
  }

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

  updateDOM() {}

  click(bounds: Bounds, _mouseX: number, _mouseY: number): boolean {
    if (this.getIsDisabled()) return false;

    if ((window as any).MouseIn(bounds.x, bounds.y - 32, 500, 64)) {
      this.setValue(!this.getValue());
      return true;
    }
    return false;
  }
}

export class SelectWidget extends UIWidget {
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

    if (globalWindow.MouseIn(bounds.x, bounds.y - 18, 500, 36)) {
      setTooltip(this.getHint());
    }
  }

  updateDOM(bounds: Bounds, isVisible: boolean): void {
    const globalWindow = window as any;
    const locked = this.getIsDisabled();
    let el = document.getElementById(this.domID) as HTMLSelectElement | null;

    if (!el && isVisible) {
      el = document.createElement("select");
      el.id = this.domID;
      el.className = "HideOnPopup";
      el.style.position = "fixed";
      el.style.zIndex = "100";
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
            `<option value="${opt.value}" ${opt.value === this.getValue() ? "selected" : ""}>${opt.text}</option>`,
        )
        .join("");

      if (el.innerHTML !== currentHtml) {
        el.innerHTML = currentHtml;
      }
      el.value = this.getValue();
    }

    if (!locked && isVisible && el) {
      const inputWidth = 260;
      const inputStartX = bounds.x + 320;
      const centerX = inputStartX + inputWidth / 2;
      globalWindow.ElementPosition(
        this.domID,
        centerX,
        bounds.y,
        inputWidth,
        36,
      );
    } else if (el) {
      globalWindow.ElementPosition(this.domID, -1000, -1000, 0, 0);
    }
  }

  click() {
    return false;
  }
}

export class InputWidget extends UIWidget {
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

  click() {
    return false;
  }
}

export class ButtonWidget extends UIWidget {
  public onClick: () => void;

  constructor(
    label: string | (() => string),
    hint: string | (() => string),
    onClick: () => void,
    isDisabled: () => boolean = () => false,
  ) {
    super(label, hint, isDisabled);
    this.onClick = onClick;
  }

  updateDOM(_bounds: Bounds, _isVisible: boolean): void {}

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

export class TextLabelWidget extends UIWidget {
  private textContent: string | (() => string);

  constructor(
    textContent: string | (() => string),
    hint: string | (() => string) = "",
    getIsDisabled: () => boolean = () => false,
  ) {
    super(textContent, hint, getIsDisabled);
    this.textContent = textContent;
  }

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

  updateDOM(): void {}

  click(): boolean {
    return false;
  }
}

export class TextAreaWidget extends UIWidget {
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

  click() {
    return false;
  }
}
