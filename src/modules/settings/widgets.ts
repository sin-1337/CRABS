// widgets.ts

export interface Bounds { x: number; y: number; w: number; h: number; }

export abstract class UIWidget {
	// Defines how much vertical space this widget consumes in the layout engine
	public rowHeight: number = 75;

	constructor(
		public label: string,
		public hint: string,
		public getIsDisabled: () => boolean
	) { }

	abstract draw(ctx: CanvasRenderingContext2D, bounds: Bounds, setTooltip: (hint: string) => void): void;
	abstract click(bounds: Bounds, mouseX: number, mouseY: number): boolean;
	abstract updateDOM(bounds: Bounds, isVisible: boolean): void;
}

export class CheckboxWidget extends UIWidget {
	constructor(
		label: string,
		hint: string,
		getIsDisabled: () => boolean,
		private getValue: () => boolean,
		private setValue: (val: boolean) => void
	) {
		super(label, hint, getIsDisabled);
	}

	draw(ctx: CanvasRenderingContext2D, bounds: Bounds, setTooltip: (hint: string) => void): void {
		const globalWindow = window as any;
		const locked = this.getIsDisabled();

		globalWindow.DrawCheckbox(bounds.x, bounds.y - 32, 64, 64, "", this.getValue(), locked);

		ctx.textAlign = "left";
		globalWindow.DrawText(this.label, bounds.x + 90, bounds.y, locked ? "#888888" : "Black", "");

		if (globalWindow.MouseIn(bounds.x, bounds.y - 32, 500, 64)) {
			setTooltip(this.hint);
		}
	}

	updateDOM() { /* No DOM for checkboxes */ }

	click(bounds: Bounds, _mouseX: number, _mouseY: number): boolean {
		if (this.getIsDisabled()) return false;

		if ((window as any).MouseIn(bounds.x, bounds.y - 32, 500, 64)) {
			this.setValue(!this.getValue());
			return true;
		}
		return false;
	}
}

export class InputWidget extends UIWidget {
	constructor(
		label: string,
		hint: string,
		getIsDisabled: () => boolean,
		private domID: string,
		private inputType: "text" | "color",
		private getValue: () => string,
		private setValue: (val: string) => void
	) {
		super(label, hint, getIsDisabled);
	}

	draw(ctx: CanvasRenderingContext2D, bounds: Bounds, setTooltip: (hint: string) => void): void {
		const globalWindow = window as any;
		const locked = this.getIsDisabled();

		ctx.textAlign = "left";
		globalWindow.DrawText(this.label, bounds.x, bounds.y, locked ? "#888888" : "Black", "");

		if (globalWindow.MouseIn(bounds.x, bounds.y - 18, 500, 36)) setTooltip(this.hint);
	}

	updateDOM(bounds: Bounds, isVisible: boolean): void {
		const globalWindow = window as any;
		const locked = this.getIsDisabled();
		const el = document.getElementById(this.domID);

		if (!el && isVisible) {
			globalWindow.ElementCreateInput(this.domID, this.inputType, this.getValue(), this.inputType === "color" ? 180 : 250);
			document.getElementById(this.domID)?.addEventListener("input", (e) => {
				this.setValue((e.target as HTMLInputElement).value);
			});
		}

		if (!locked && isVisible) {
			const inputWidth = this.inputType === "color" ? 180 : 260;
			const inputStartX = bounds.x + 320;
			const centerX = inputStartX + (inputWidth / 2);
			globalWindow.ElementPosition(this.domID, centerX, bounds.y, inputWidth, 36);
		} else if (document.getElementById(this.domID)) {
			globalWindow.ElementPosition(this.domID, -1000, -1000, 0, 0);
		}
	}

	click() { return false; /* Handled by HTML DOM */ }
}

export class ButtonWidget extends UIWidget {
	public onClick: () => void;

	constructor(
		label: string,
		hint: string,
		onClick: () => void,
		isDisabled: () => boolean = () => false
	) {
		super(label, hint, isDisabled);
		this.onClick = onClick;
	}

	updateDOM(_bounds: Bounds, _isVisible: boolean): void { }

	draw(ctx: CanvasRenderingContext2D, bounds: Bounds, setTooltip: (hint: string) => void): void {
		const globalWindow = window as any;
		const disabled = this.getIsDisabled();

		// Override the state from the previous widgets
		ctx.textAlign = "center";

		globalWindow.DrawButton(bounds.x, bounds.y - 32, 200, 64, this.label, disabled ? "#888" : "White", "");

		if (globalWindow.MouseIn(bounds.x, bounds.y - 32, 200, 64)) {
			setTooltip(this.hint);
		}
	}

	click(bounds: Bounds, _mouseX: number, _mouseY: number): boolean {
		const globalWindow = window as any;

		if (!this.getIsDisabled() && globalWindow.MouseIn(bounds.x, bounds.y - 32, 200, 64)) {
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
		hint: string = "",
		getIsDisabled: () => boolean = () => false
	) {
		// Pass a fallback string to the base UIWidget constructor
		super(typeof textContent === 'string' ? textContent : "Dynamic Label", hint, getIsDisabled);
		this.textContent = textContent;
	}

	draw(ctx: CanvasRenderingContext2D, bounds: Bounds, setTooltip: (hint: string) => void): void {
		const globalWindow = window as any;
		const disabled = this.getIsDisabled();

		// Evaluate the text if it's a function, otherwise use the string
		const textToDraw = typeof this.textContent === 'function' ? this.textContent() : this.textContent;

		ctx.textAlign = "left";

		// Draw the text left-aligned to the bounds.x (which includes the layout engine's indent)
		globalWindow.DrawText(textToDraw, bounds.x, bounds.y, disabled ? "#888888" : "Black", "");

		// Add a hover zone for the hint if one is provided
		if (this.hint && globalWindow.MouseIn(bounds.x, bounds.y - 18, 500, 36)) {
			setTooltip(this.hint);
		}
	}

	updateDOM(): void { /* No DOM elements needed */ }

	click(): boolean { return false; /* Labels aren't clickable */ }
}

export class TextAreaWidget extends UIWidget {
	constructor(
		label: string,
		hint: string,
		getIsDisabled: () => boolean,
		private domID: string,
		private getValue: () => string,
		private setValue: (val: string) => void
	) {
		super(label, hint, getIsDisabled);
		this.rowHeight = 120; // Override the base layout height!
	}

	draw(ctx: CanvasRenderingContext2D, bounds: Bounds, setTooltip: (hint: string) => void): void {
		const globalWindow = window as any;
		const locked = this.getIsDisabled();

		ctx.textAlign = "left";
		// Shift the text up slightly so it aligns with the top of the tall input box
		globalWindow.DrawText(this.label, bounds.x, bounds.y - 20, locked ? "#888888" : "Black", "");

		if (globalWindow.MouseIn(bounds.x, bounds.y - 40, 500, this.rowHeight)) setTooltip(this.hint);
	}

	updateDOM(bounds: Bounds, isVisible: boolean): void {
		const globalWindow = window as any;
		const locked = this.getIsDisabled();
		let el = document.getElementById(this.domID) as HTMLTextAreaElement;

		if (!el && isVisible) {
			// BC Engine natively supports TextAreas, but we fall back just in case
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
				el.value = this.getValue();
				el.style.resize = "vertical"; // Let the player drag to resize!
				el.addEventListener("input", (e) => {
					this.setValue((e.target as HTMLTextAreaElement).value);
				});
			}
		}

		if (!locked && isVisible) {
			const inputWidth = 260;
			const inputStartX = bounds.x + 320;
			const centerX = inputStartX + (inputWidth / 2);

			// Draw it 90px tall, which fits perfectly inside our 120px rowHeight constraint
			globalWindow.ElementPosition(this.domID, centerX, bounds.y + 10, inputWidth, 90);
		} else if (document.getElementById(this.domID)) {
			globalWindow.ElementPosition(this.domID, -1000, -1000, 0, 0);
		}
	}

	click() { return false; /* Handled by HTML DOM */ }
}
