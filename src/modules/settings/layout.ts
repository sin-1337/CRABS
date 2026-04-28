// layout.ts
import { UIWidget } from "./widgets";

export type ComponentCategory = "General" | "Drawer" | "Immersion" | "Maps" | "Chat";

export interface ConfiguredWidget {
	category: ComponentCategory;
	indent: number;
	widget: UIWidget;
}

export class LayoutEngine {
	private readonly BASE_X = 600;
	private readonly INDENT_WIDTH = 50;
	private readonly ROW_HEIGHT = 75;
	private readonly TABS: ComponentCategory[] = ["General", "Drawer", "Immersion", "Maps", "Chat"];

	public activeTab: ComponentCategory = "General";
	public scrollOffset: number = 0;
	public maxScroll: number = 0;
	public currentTooltip: string = "";

	constructor(private registry: ConfiguredWidget[]) { }

	private getVisibleWidgets(): ConfiguredWidget[] {
		return this.registry.filter(w => w.category === this.activeTab);
	}

	public updateDOM(isMenuOpen: boolean): void {
		const visible = this.getVisibleWidgets();

		for (const item of this.registry) {
			const isVisibleOnTab = visible.includes(item);

			// Default off-screen bounds
			let bounds = { x: -1000, y: -1000, w: 0, h: 0 };
			let isSafelyOnScreen = false;

			if (isVisibleOnTab) {
				const index = visible.indexOf(item);
				const yPos = 280 + (index * this.ROW_HEIGHT) - this.scrollOffset;
				bounds = { x: this.BASE_X + (item.indent * this.INDENT_WIDTH), y: yPos, w: 500, h: this.ROW_HEIGHT };

				isSafelyOnScreen = isMenuOpen && yPos > 210 && yPos < 870;
			}

			item.widget.updateDOM(bounds, isSafelyOnScreen);
		}
	}

	public draw(context: CanvasRenderingContext2D, isModalOpen: boolean = false): void {
		const globalWindow = window as any;
		this.currentTooltip = "";

		const visible = this.getVisibleWidgets();
		this.maxScroll = Math.max(0, (visible.length * this.ROW_HEIGHT) - 500);

		// Background
		globalWindow.DrawRect(40, 40, 420, 920, "#222222aa");
		globalWindow.DrawCharacter(globalWindow.Player, 50, 50, 0.9);

		context.textAlign = "center";
		context.textBaseline = "middle";
		globalWindow.DrawText("- CRABS Mod Settings -", 1140, 80, "Black", "Gray");

		// --- Draw Top-Right Nav Buttons (Greyed out if modal is open) ---
		const btnColor = isModalOpen ? "#888888" : "White";
		globalWindow.DrawButton(1815, 75, 90, 90, "", btnColor, "Icons/Exit.png", "Back");

		const isInChat = typeof ChatRoomData !== "undefined" && ChatRoomData !== null;
		globalWindow.DrawButton(1710, 75, 90, 90, "", isModalOpen || !isInChat ? "#888888" : "White", "Icons/Chat.png", isInChat ? "Return to Chat" : "Not in a Chat Room");

		globalWindow.DrawButton(1605, 75, 90, 90, "", btnColor, "Icons/Reset.png", "Restore Defaults");

		// Tabs
		let tabX = 500;
		for (const tab of this.TABS) {
			const isActive = this.activeTab === tab;
			// Grey out the tab if the modal is open OR if it's currently active
			const tabColor = isModalOpen || isActive ? "#888888" : "White";
			globalWindow.DrawButton(tabX, 130, 160, 45, tab, tabColor, "", "");
			tabX += 175;
		}

		// Clip Region (so scrolling cuts off perfectly)
		context.save();
		context.beginPath();
		context.rect(500, 200, 1280, 680);
		context.clip();

		// PASS 1: Draw the tree hierarchy lines
		context.beginPath();
		context.strokeStyle = "#666666"; // A subtle grey color
		context.lineWidth = 3;

		let currentY = 280 - this.scrollOffset;
		for (let i = 0; i < visible.length; i++) {
			const item = visible[i];

			// Only calculate lines for indented children
			if (item.indent > 0) {
				// Look backwards to find the immediate parent
				let parentY = null;
				for (let j = i - 1; j >= 0; j--) {
					if (visible[j].indent === item.indent - 1) {
						parentY = 280 + (j * this.ROW_HEIGHT) - this.scrollOffset;
						break;
					}
				}

				if (parentY !== null) {
					const spineX = this.BASE_X + ((item.indent - 1) * this.INDENT_WIDTH) + 32;
					const childX = this.BASE_X + (item.indent * this.INDENT_WIDTH);

					context.moveTo(spineX, parentY + 32);  // Start spine at the bottom edge of parent checkbox
					context.lineTo(spineX, currentY);      // Drop down to the child's level
					context.lineTo(childX - 10, currentY); // Branch right to touch the child
				}
			}
			currentY += this.ROW_HEIGHT;
		}
		context.stroke(); // Draw all lines at once!

		// PASS 2: Draw the actual Widgets
		currentY = 280 - this.scrollOffset;
		for (const item of visible) {
			if (currentY > 180 && currentY < 900) {
				const bounds = { x: this.BASE_X + (item.indent * this.INDENT_WIDTH), y: currentY, w: 500, h: this.ROW_HEIGHT };
				item.widget.draw(context, bounds, (hint) => { this.currentTooltip = hint; });
			}
			currentY += this.ROW_HEIGHT;
		}
		context.restore();

		// footer
		if (this.currentTooltip) globalWindow.DrawText(this.currentTooltip, 1140, 920, "Black", "Gray");
	}

	public click(mouseX: number, mouseY: number): boolean {
		const globalWindow = window as any;

		// Check tabs
		let tabX = 500;
		for (const tab of this.TABS) {
			if (globalWindow.MouseIn(tabX, 130, 160, 45)) {
				// Only process the click if they clicked a DIFFERENT tab
				if (this.activeTab !== tab) {
					this.activeTab = tab;
					this.scrollOffset = 0;
					return true;
				}
			}
			tabX += 175;
		}

		// Check widgets
		const visible = this.getVisibleWidgets();
		let currentY = 280 - this.scrollOffset;
		for (const item of visible) {
			if (currentY > 180 && currentY < 900) {
				const bounds = { x: this.BASE_X + (item.indent * this.INDENT_WIDTH), y: currentY, w: 500, h: this.ROW_HEIGHT };
				if (item.widget.click(bounds, mouseX, mouseY)) return true;
			}
			currentY += this.ROW_HEIGHT;
		}
		return false;
	}
}
