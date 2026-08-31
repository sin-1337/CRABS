import { UIWidget } from "./widgets";
import { CRABS_Base } from "../base";

export type ComponentCategory =
  | "General"
  | "Drawer"
  | "Immersion"
  | "Maps"
  | "Chat"
  | "Config";

export interface ConfiguredWidget {
  category: ComponentCategory;
  indent: number;
  widget: UIWidget;
}

export class LayoutEngine {
  private readonly BASE_X = 600;
  private readonly INDENT_WIDTH = 50;
  private readonly TABS: ComponentCategory[] = [
    "General",
    "Drawer",
    "Immersion",
    "Maps",
    "Chat",
    "Config",
  ];

  public activeTab: ComponentCategory = "General";
  public scrollOffset: number = 0;
  public maxScroll: number = 0;
  public currentTooltip: string = "";

  constructor(private registry: ConfiguredWidget[]) {}

  private getVisibleWidgets(): ConfiguredWidget[] {
    return this.registry.filter((w) => w.category === this.activeTab);
  }

  public updateDOM(isMenuOpen: boolean): void {
    const visible = this.getVisibleWidgets();
    let currentY = 280 - this.scrollOffset;

    for (const item of this.registry) {
      const isVisibleOnTab = visible.includes(item);
      let bounds = { x: -1000, y: -1000, w: 0, h: 0 };
      let isSafelyOnScreen = false;

      if (isVisibleOnTab) {
        bounds = {
          x: this.BASE_X + item.indent * this.INDENT_WIDTH,
          y: currentY,
          w: 500,
          h: item.widget.rowHeight,
        };
        isSafelyOnScreen = isMenuOpen && currentY > 210 && currentY < 870;
        currentY += item.widget.rowHeight;
      }

      item.widget.updateDOM(bounds, isSafelyOnScreen);
    }
  }

  public draw(
    context: CanvasRenderingContext2D,
    isModalOpen: boolean = false,
  ): void {
    const globalWindow = window as any;
    this.currentTooltip = "";

    const visible = this.getVisibleWidgets();

    let totalHeight = 0;
    for (const item of visible) totalHeight += item.widget.rowHeight;
    this.maxScroll = Math.max(0, totalHeight - 500);

    globalWindow.DrawRect(40, 40, 420, 920, "#222222aa");
    globalWindow.DrawCharacter(globalWindow.Player, 50, 50, 0.9);

    context.textAlign = "center";
    context.textBaseline = "middle";
    globalWindow.DrawText(
      CRABS_Base.translate("settings.nav.title"),
      1140,
      80,
      "Black",
      "Gray",
    );

    const btnColor = isModalOpen ? "#888888" : "White";
    globalWindow.DrawButton(
      1815,
      75,
      90,
      90,
      "",
      btnColor,
      "Icons/Exit.png",
      CRABS_Base.translate("settings.nav.back"),
    );

    const isInChat =
      typeof ChatRoomData !== "undefined" && ChatRoomData !== null;
    globalWindow.DrawButton(
      1710,
      75,
      90,
      90,
      "",
      isModalOpen || !isInChat ? "#888888" : "White",
      "Icons/Chat.png",
      isInChat
        ? CRABS_Base.translate("settings.nav.chat")
        : CRABS_Base.translate("settings.nav.no_chat"),
    );

    globalWindow.DrawButton(
      1605,
      75,
      90,
      90,
      "",
      btnColor,
      "Icons/Reset.png",
      CRABS_Base.translate("settings.nav.restore_defaults"),
    );

    let tabX = 500;
    for (const tab of this.TABS) {
      const isActive = this.activeTab === tab;
      const tabColor = isModalOpen || isActive ? "#888888" : "White";
      const tabLabel = CRABS_Base.translate(
        `settings.tabs.${tab.toLowerCase()}`,
      );
      globalWindow.DrawButton(tabX, 130, 160, 45, tabLabel, tabColor, "", "");
      tabX += 175;
    }

    context.save();
    context.beginPath();
    context.rect(500, 200, 1280, 680);
    context.clip();

    context.beginPath();
    context.strokeStyle = "#666666";
    context.lineWidth = 3;

    let currentY = 280 - this.scrollOffset;
    for (let i = 0; i < visible.length; i++) {
      const item = visible[i];

      if (item.indent > 0) {
        let parentY = null;
        let parentScanY = 280 - this.scrollOffset;

        for (let j = 0; j < i; j++) {
          if (visible[j].indent === item.indent - 1) {
            parentY = parentScanY;
          }
          parentScanY += visible[j].widget.rowHeight;
        }

        if (parentY !== null) {
          const spineX =
            this.BASE_X + (item.indent - 1) * this.INDENT_WIDTH + 32;
          const childX = this.BASE_X + item.indent * this.INDENT_WIDTH;

          context.moveTo(spineX, parentY + 32);
          context.lineTo(spineX, currentY);
          context.lineTo(childX - 10, currentY);
        }
      }
      currentY += item.widget.rowHeight;
    }
    context.stroke();

    currentY = 280 - this.scrollOffset;
    for (const item of visible) {
      if (currentY > 180 && currentY < 900) {
        const bounds = {
          x: this.BASE_X + item.indent * this.INDENT_WIDTH,
          y: currentY,
          w: 500,
          h: item.widget.rowHeight,
        };
        item.widget.draw(context, bounds, (hint) => {
          this.currentTooltip = hint;
        });
      }
      currentY += item.widget.rowHeight;
    }
    context.restore();

    if (this.maxScroll > 0) {
      const trackX = 1760;
      const trackY = 200;
      const trackW = 20;
      const trackH = 680;

      globalWindow.DrawRect(trackX, trackY, trackW, trackH, "#333333");

      const visibleRatio = Math.min(1, trackH / (trackH + this.maxScroll));
      const thumbH = Math.max(40, trackH * visibleRatio);
      const thumbY =
        trackY + (this.scrollOffset / this.maxScroll) * (trackH - thumbH);

      const isHovering =
        globalWindow.MouseX >= trackX &&
        globalWindow.MouseX <= trackX + trackW &&
        globalWindow.MouseY >= trackY &&
        globalWindow.MouseY <= trackY + trackH;

      globalWindow.DrawRect(
        trackX,
        thumbY,
        trackW,
        thumbH,
        isHovering ? "#AAAAAA" : "#888888",
      );
    }

    if (this.currentTooltip)
      globalWindow.DrawText(this.currentTooltip, 1140, 920, "Black", "Gray");
  }

  public click(mouseX: number, mouseY: number): boolean {
    const globalWindow = window as any;

    let tabX = 500;
    for (const tab of this.TABS) {
      if (globalWindow.MouseIn(tabX, 130, 160, 45)) {
        if (this.activeTab !== tab) {
          this.activeTab = tab;
          this.scrollOffset = 0;
          return true;
        }
      }
      tabX += 175;
    }

    if (this.maxScroll > 0) {
      const trackX = 1760;
      const trackY = 200;
      const trackW = 20;
      const trackH = 680;

      if (
        mouseX >= trackX &&
        mouseX <= trackX + trackW &&
        mouseY >= trackY &&
        mouseY <= trackY + trackH
      ) {
        const visibleRatio = Math.min(1, trackH / (trackH + this.maxScroll));
        const thumbH = Math.max(40, trackH * visibleRatio);

        const clickPercent = (mouseY - trackY - thumbH / 2) / (trackH - thumbH);

        this.scrollOffset = Math.max(
          0,
          Math.min(this.maxScroll, clickPercent * this.maxScroll),
        );
        return true;
      }
    }

    const visible = this.getVisibleWidgets();
    let currentY = 280 - this.scrollOffset;
    for (const item of visible) {
      if (currentY > 180 && currentY < 900) {
        const bounds = {
          x: this.BASE_X + item.indent * this.INDENT_WIDTH,
          y: currentY,
          w: 500,
          h: item.widget.rowHeight,
        };
        if (item.widget.click(bounds, mouseX, mouseY)) return true;
      }
      currentY += item.widget.rowHeight;
    }
    return false;
  }
}
