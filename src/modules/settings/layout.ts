/**
 * CRABS Settings Layout Engine
 *
 * Tabbed navigation, hierarchy tree-spine graphics, viewport clipping,
 * virtualized DOM positioning, custom scrollbar calculations, and touch/drag
 * scrolling physics for the settings preference subscreen.
 *
 * @module settings/layout
 */

import { translate } from "../base";
import { UIWidget } from "./widgets";

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

/**
 * Renders and handles input for the settings canvas preference interface.
 *
 * Coordinates tab selection, hierarchy spine connectors, viewport clipping,
 * virtualized DOM element positioning, scroll physics, pointer dragging,
 * and tooltip presentation.
 */
export class LayoutEngine {
  /** Base X coordinate (px) for top-level (unindented) widget rows. */
  private readonly BASE_X = 600;

  /** Horizontal offset (px) per tree hierarchy indentation level. */
  private readonly INDENT_WIDTH = 50;

  /** Ordered list of available setting navigation tabs. */
  private readonly TABS: ComponentCategory[] = [
    "General",
    "Drawer",
    "Immersion",
    "Maps",
    "Chat",
    "Config",
  ];

  /** Content viewport boundary definitions. */
  public readonly VIEWPORT = {
    x: 500,
    y: 200,
    w: 1280,
    h: 680,
  };

  /** Scrollbar visual geometry definitions. */
  public readonly SCROLLBAR = {
    x: 1760,
    y: 200,
    w: 20,
    h: 680,
    minThumbH: 40,
  };

  /** Minimum drag displacement (px) required before suppressing click actions. */
  private readonly DRAG_SLOP_PX = 8;

  /** Currently selected setting category tab. */
  public activeTab: ComponentCategory = "General";

  /** Vertical scroll distance (px) from the top of the active tab. */
  public scrollOffset: number = 0;

  /** Maximum scrollable vertical distance (px) computed from row heights. */
  public maxScroll: number = 0;

  /** Active hover tooltip string to render at the bottom of the canvas. */
  public currentTooltip: string = "";

  /** Active pointer dragging state. */
  public isDragging: boolean = false;

  /** Vertical coordinate of active drag origin. */
  private dragStartY: number = 0;

  /** Scroll offset captured at the beginning of the active drag gesture. */
  private dragStartOffset: number = 0;

  /** Indicates whether the current gesture has exceeded the drag slop threshold. */
  public hasDraggedBeyondThreshold: boolean = false;

  /** Indicates whether the scrollbar thumb is being dragged directly. */
  private isThumbDragging: boolean = false;

  /**
   * Initializes the settings layout engine with registered widgets.
   *
   * @param registry - Array of configured widget definitions.
   */
  constructor(private registry: ConfiguredWidget[]) {}

  /**
   * Filters the complete widget registry down to items matching the active tab.
   *
   * @private
   * @returns Widgets assigned to the current tab.
   */
  private getVisibleWidgets(): ConfiguredWidget[] {
    return this.registry.filter((w) => w.category === this.activeTab);
  }

  /**
   * Calculates the current height and vertical position of the scrollbar thumb.
   *
   * @private
   * @returns Computed thumb height and Y origin coordinates.
   */
  private getThumbMetrics(): { thumbH: number; thumbY: number } {
    const visibleRatio = Math.min(
      1,
      this.SCROLLBAR.h / (this.SCROLLBAR.h + this.maxScroll),
    );
    const thumbH = Math.max(
      this.SCROLLBAR.minThumbH,
      this.SCROLLBAR.h * visibleRatio,
    );
    const thumbY =
      this.SCROLLBAR.y +
      (this.maxScroll > 0 ? this.scrollOffset / this.maxScroll : 0) *
        (this.SCROLLBAR.h - thumbH);
    return { thumbH, thumbY };
  }

  /**
   * Checks whether coordinates reside within the interactive viewport list area.
   *
   * @param x - Normalized canvas X coordinate.
   * @param y - Normalized canvas Y coordinate.
   * @returns True if coordinate is within the scrollable content bounds.
   */
  public isInsideContentArea(x: number, y: number): boolean {
    return (
      x >= this.VIEWPORT.x &&
      x <= this.VIEWPORT.x + this.VIEWPORT.w &&
      y >= this.VIEWPORT.y &&
      y <= this.VIEWPORT.y + this.VIEWPORT.h
    );
  }

  /**
   * Initiates pointer drag gestures. Detects thumb or content viewport origin.
   *
   * @param x - Normalized canvas X coordinate.
   * @param y - Normalized canvas Y coordinate.
   */
  public startDrag(x: number, y: number): void {
    if (this.maxScroll <= 0) return;

    const { thumbH, thumbY } = this.getThumbMetrics();
    const isOnThumb =
      x >= this.SCROLLBAR.x &&
      x <= this.SCROLLBAR.x + this.SCROLLBAR.w &&
      y >= thumbY &&
      y <= thumbY + thumbH;

    if (isOnThumb) {
      this.isDragging = true;
      this.isThumbDragging = true;
      this.hasDraggedBeyondThreshold = true;
      this.dragStartY = y;
      this.dragStartOffset = this.scrollOffset;
      return;
    }

    if (this.isInsideContentArea(x, y)) {
      this.isDragging = true;
      this.isThumbDragging = false;
      this.hasDraggedBeyondThreshold = false;
      this.dragStartY = y;
      this.dragStartOffset = this.scrollOffset;
    }
  }

  /**
   * Processes active pointer movements and adjusts scroll offsets.
   *
   * @param _x - Normalized canvas X coordinate (unused).
   * @param y - Normalized canvas Y coordinate.
   * @returns True if scroll offset changed.
   */
  public onDrag(_x: number, y: number): boolean {
    if (!this.isDragging || this.maxScroll <= 0) return false;

    const deltaY = y - this.dragStartY;

    if (!this.hasDraggedBeyondThreshold) {
      if (Math.abs(deltaY) > this.DRAG_SLOP_PX) {
        this.hasDraggedBeyondThreshold = true;
      } else {
        return false;
      }
    }

    if (this.isThumbDragging) {
      const { thumbH } = this.getThumbMetrics();
      const trackAvailable = this.SCROLLBAR.h - thumbH;
      if (trackAvailable <= 0) return false;

      const offsetChange = (deltaY / trackAvailable) * this.maxScroll;
      const targetOffset = Math.max(
        0,
        Math.min(this.maxScroll, this.dragStartOffset + offsetChange),
      );

      if (targetOffset !== this.scrollOffset) {
        this.scrollOffset = targetOffset;
        return true;
      }
    } else {
      // Swiping up pulls content up, increasing scroll offset
      const targetOffset = Math.max(
        0,
        Math.min(this.maxScroll, this.dragStartOffset - deltaY),
      );

      if (targetOffset !== this.scrollOffset) {
        this.scrollOffset = targetOffset;
        return true;
      }
    }

    return false;
  }

  /**
   * Concludes the active pointer drag gesture.
   *
   * @returns True if movement exceeded the drag slop threshold and should suppress clicks.
   */
  public endDrag(): boolean {
    const wasScrollAction = this.isDragging && this.hasDraggedBeyondThreshold;
    this.isDragging = false;
    this.isThumbDragging = false;
    return wasScrollAction;
  }

  /**
   * Resets gesture tracking states after event execution.
   */
  public resetGestureState(): void {
    this.hasDraggedBeyondThreshold = false;
  }

  /**
   * Synchronizes DOM input elements (HTML inputs, dropdowns) with canvas scroll positions.
   *
   * Offscreen or inactive tab elements are translated out of the visible viewport
   * (`-1000px`) to prevent ghost interactions.
   *
   * @param isMenuOpen - True if the preference subscreen is currently visible.
   */
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

  /**
   * Main rendering routine executed per frame when the preference screen is open.
   *
   * Draws character preview backdrops, navigation tabs, action buttons, clipped
   * hierarchical spine trees, widget rows, the custom scrollbar, and tooltips.
   *
   * @param context - Canvas 2D rendering context.
   * @param isModalOpen - True if an overlay modal is blocking input.
   */
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
      translate("settings.nav.title"),
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
      translate("settings.nav.back"),
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
        ? translate("settings.nav.chat")
        : translate("settings.nav.no_chat"),
    );

    globalWindow.DrawButton(
      1605,
      75,
      90,
      90,
      "",
      btnColor,
      "Icons/Reset.png",
      translate("settings.nav.restore_defaults"),
    );

    let tabX = 500;
    for (const tab of this.TABS) {
      const isActive = this.activeTab === tab;
      const tabColor = isModalOpen || isActive ? "#888888" : "White";
      const tabLabel = translate(`settings.tabs.${tab.toLowerCase()}`);
      globalWindow.DrawButton(tabX, 130, 160, 45, tabLabel, tabColor, "", "");
      tabX += 175;
    }

    context.save();
    context.beginPath();
    context.rect(
      this.VIEWPORT.x,
      this.VIEWPORT.y,
      this.VIEWPORT.w,
      this.VIEWPORT.h,
    );
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
        item.widget.draw(context, bounds, (hint: string) => {
          this.currentTooltip = hint;
        });
      }
      currentY += item.widget.rowHeight;
    }
    context.restore();

    if (this.maxScroll > 0) {
      globalWindow.DrawRect(
        this.SCROLLBAR.x,
        this.SCROLLBAR.y,
        this.SCROLLBAR.w,
        this.SCROLLBAR.h,
        "#333333",
      );

      const { thumbH, thumbY } = this.getThumbMetrics();
      const isHovering =
        globalWindow.MouseX >= this.SCROLLBAR.x &&
        globalWindow.MouseX <= this.SCROLLBAR.x + this.SCROLLBAR.w &&
        globalWindow.MouseY >= this.SCROLLBAR.y &&
        globalWindow.MouseY <= this.SCROLLBAR.y + this.SCROLLBAR.h;

      globalWindow.DrawRect(
        this.SCROLLBAR.x,
        thumbY,
        this.SCROLLBAR.w,
        thumbH,
        isHovering || this.isDragging ? "#AAAAAA" : "#888888",
      );
    }

    if (this.currentTooltip)
      globalWindow.DrawText(this.currentTooltip, 1140, 920, "Black", "Gray");
  }

  /**
   * Dispatches click coordinates to navigation tabs, scrollbar tracks, or visible widgets.
   *
   * @param mouseX - Normalized canvas X coordinate.
   * @param mouseY - Normalized canvas Y coordinate.
   * @returns True if a tab, scrollbar, or widget consumed the click.
   */
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
      const isOverScrollbar =
        mouseX >= this.SCROLLBAR.x &&
        mouseX <= this.SCROLLBAR.x + this.SCROLLBAR.w &&
        mouseY >= this.SCROLLBAR.y &&
        mouseY <= this.SCROLLBAR.y + this.SCROLLBAR.h;

      if (isOverScrollbar) {
        const { thumbH } = this.getThumbMetrics();
        const clickPercent =
          (mouseY - this.SCROLLBAR.y - thumbH / 2) /
          (this.SCROLLBAR.h - thumbH);

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
