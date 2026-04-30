// widgets.ts

export interface Bounds { x: number; y: number; w: number; h: number; }

export abstract class UIWidget {
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

	updateDOM(_bounds: Bounds, _isVisible: boolean): void {
		// This is a canvas-only widget, so no HTML DOM updates are needed.
	}

	draw(_ctx: CanvasRenderingContext2D, bounds: Bounds, setTooltip: (hint: string) => void): void {
		const globalWindow = window as any;
		const disabled = this.getIsDisabled();

		// Shrink the width from 320 down to 200. This pulls the text leftward,
		// centering it beautifully underneath the text of the parent checkbox!
		globalWindow.DrawButton(bounds.x, bounds.y - 32, 200, 64, this.label, disabled ? "#888" : "White", "");

		// Tooltip hover check (hitbox updated to match the 200 width)
		if (globalWindow.MouseIn(bounds.x, bounds.y - 32, 200, 64)) {
			setTooltip(this.hint);
		}
	}

	click(bounds: Bounds, _mouseX: number, _mouseY: number): boolean {
		const globalWindow = window as any;

		// Ensure the click hitbox matches the new 200px bounds
		if (!this.getIsDisabled() && globalWindow.MouseIn(bounds.x, bounds.y - 32, 200, 64)) {
			this.onClick();
			return true;
		}
		return false;
	}
}
