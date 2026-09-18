import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  trackedMapPlayer,
  hoveredMapPlayer,
  isMouseOverCanvas,
  currentFrameHoveredPlayer,
  setCurrentFrameHoveredPlayer,
  setTrackedMapPlayer,
  setHoveredMapPlayer,
  setIsMouseOverCanvas,
  onPlayerToggleTrack,
  clearTracking,
  onPlayerHover,
  onPlayerLeave,
  onPlayerCardClick,
  syncCanvasHoverToDOM,
  autoPaginateToPlayer,
  drawCompass,
  drawNameIndicator,
  drawFocusGlow,
  clearNameWidthCache,
} from "../compass";
import { CRABS_Base, PerformanceLevel } from "../../base";
import { Settings } from "../../settings/settings";
import { Notification } from "../../notifications/notifications";
import { createMockCharacter } from "mockups/character";

function createMockContext2D(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    clip: vi.fn(),
    fillRect: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    measureText: vi.fn(() => ({ width: 80 })),
    font: "",
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    globalAlpha: 1,
    filter: "",
  } as unknown as CanvasRenderingContext2D;
}

describe("Roster Compass Module", () => {
  let mockCtx: CanvasRenderingContext2D;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    vi.useFakeTimers();
    clearTracking();
    setHoveredMapPlayer(null);
    setIsMouseOverCanvas(false);
    clearNameWidthCache();

    mockCtx = createMockContext2D();
    mockCanvas = {
      getContext: vi.fn(() => mockCtx),
    } as unknown as HTMLCanvasElement;

    const win = window as any;
    win.MainCanvas = mockCanvas;
    win.CurrentScreen = "ChatRoom";
    win.ChatRoomCharacterViewOffset = 0;
    win.ChatRoomCharacter = [];
    win.ChatRoomCharacterDrawlist = [];
    win.ChatRoomUpdateDisplay = vi.fn(() => {
      const offset = win.ChatRoomCharacterViewOffset || 0;
      win.ChatRoomCharacterDrawlist = win.ChatRoomCharacter.slice(
        offset,
        offset + 10,
      );
    });
    win.CharacterNickname = (c: any) => c.Name;

    vi.spyOn(CRABS_Base, "isCompassBlocked").mockReturnValue(false);
    vi.spyOn(Notification, "send").mockImplementation(() => {});

    Settings.instance = {
      data: {
        showMapCompass: true,
        pageFocusHover: true,
        autoScrollRoster: true,
        enableFocusHalo: true,
      },
    } as any;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Tracking State & Room Opt-out", () => {
    it("toggles tracking state on and off", () => {
      onPlayerToggleTrack("10001");
      expect(trackedMapPlayer).toBe(10001);

      onPlayerToggleTrack("10001");
      expect(trackedMapPlayer).toBeNull();
    });

    it("resets active tracking and dispatches notification when room blocks compass", () => {
      vi.spyOn(CRABS_Base, "isCompassBlocked").mockReturnValue(true);

      setTrackedMapPlayer(10001);
      onPlayerToggleTrack("10001");

      expect(trackedMapPlayer).toBeNull();
      expect(Notification.send).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Compass Disabled" }),
      );
    });

    it("clears tracking and removes active CSS indicators via clearTracking", () => {
      document.body.innerHTML = `
        <div class="CRABS_track-compass CRABS_compass-active"></div>
      `;

      setTrackedMapPlayer(10001);
      clearTracking();

      expect(trackedMapPlayer).toBeNull();
      expect(document.querySelector(".CRABS_compass-active")).toBeNull();
    });
  });

  describe("Hover & Click Interactivity", () => {
    it("schedules auto-pagination with a 500ms delay on hover", () => {
      const win = window as any;
      win.ChatRoomCharacter = Array.from({ length: 15 }, (_, i) =>
        createMockCharacter({ MemberNumber: 10000 + i }),
      );

      onPlayerHover("10012");
      expect(hoveredMapPlayer).toBe(10012);

      vi.advanceTimersByTime(499);
      expect(win.ChatRoomCharacterViewOffset).toBe(0);

      vi.advanceTimersByTime(1);
      expect(win.ChatRoomCharacterViewOffset).toBe(10);
    });

    it("cancels pending pagination if hover leaves before delay expires", () => {
      const win = window as any;
      win.ChatRoomCharacter = Array.from({ length: 15 }, (_, i) =>
        createMockCharacter({ MemberNumber: 10000 + i }),
      );

      onPlayerHover("10012");
      onPlayerLeave();

      vi.advanceTimersByTime(500);
      expect(hoveredMapPlayer).toBeNull();
      expect(win.ChatRoomCharacterViewOffset).toBe(0);
    });

    it("triggers immediate pagination on direct card click", () => {
      const win = window as any;
      win.ChatRoomCharacter = Array.from({ length: 15 }, (_, i) =>
        createMockCharacter({ MemberNumber: 10000 + i }),
      );

      onPlayerCardClick("10012");
      expect(win.ChatRoomCharacterViewOffset).toBe(10);
    });
  });

  describe("DOM Hover Synchronization", () => {
    it("adds simulated-hover class and schedules auto-scroll for cards inside drawer", () => {
      document.body.innerHTML = `
        <div id="CRABS_Drawer_Roster">
          <div class="CRABS_card" id="CRABS_card_10001"></div>
        </div>
      `;

      const card = document.getElementById("CRABS_card_10001")!;
      card.scrollIntoView = vi.fn();

      syncCanvasHoverToDOM(10001);
      expect(card.classList.contains("CRABS_simulated-hover")).toBe(true);

      vi.advanceTimersByTime(150);
      expect(card.scrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "nearest",
      });
    });

    it("clears simulated hover when memberNumber is null", () => {
      document.body.innerHTML = `
        <div class="CRABS_card CRABS_simulated-hover" id="CRABS_card_10001"></div>
      `;

      syncCanvasHoverToDOM(null);
      expect(document.querySelector(".CRABS_simulated-hover")).toBeNull();
    });
  });

  describe("Pagination Algorithm", () => {
    it("bails out if total room occupants are 10 or fewer", () => {
      const win = window as any;
      win.ChatRoomCharacter = [createMockCharacter({ MemberNumber: 10001 })];

      autoPaginateToPlayer(10001);
      expect(win.ChatRoomUpdateDisplay).not.toHaveBeenCalled();
    });

    it("falls back to sequential search if index math does not resolve drawlist match", () => {
      const win = window as any;
      win.ChatRoomCharacter = Array.from({ length: 25 }, (_, i) =>
        createMockCharacter({ MemberNumber: 20000 + i }),
      );

      // Simulate mismatch between character index and drawlist layout
      win.ChatRoomUpdateDisplay.mockImplementation(() => {
        if (win.ChatRoomCharacterViewOffset === 20) {
          win.ChatRoomCharacterDrawlist = [{ MemberNumber: 20022 }];
        } else {
          win.ChatRoomCharacterDrawlist = [];
        }
      });

      autoPaginateToPlayer(20022);
      expect(win.ChatRoomCharacterViewOffset).toBe(20);
    });
  });

  describe("Canvas Indicator & Glow Drawing", () => {
    it("suppresses compass rendering if CRABS_Base.isCompassBlocked returns true", () => {
      vi.spyOn(CRABS_Base, "isCompassBlocked").mockReturnValue(true);
      setTrackedMapPlayer(10001);

      drawCompass(() => 200);
      expect(mockCtx.beginPath).not.toHaveBeenCalled();
      expect(trackedMapPlayer).toBeNull();
    });

    it("renders name indicator arrow with left-edge flip detection", () => {
      const char = createMockCharacter({
        MemberNumber: 10001,
        Name: "Alice",
        LabelColor: "#ffffff",
      });

      // Positioned close to left boundary (x = 20), forcing angle to flip to Math.PI
      drawNameIndicator(char, 20, 100, () => 200);

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.rotate).toHaveBeenCalledWith(Math.PI);
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    it("renders focus glow with blur in NORMAL performance mode", () => {
      const char = createMockCharacter({
        MemberNumber: 10001,
        LabelColor: "#00ffff",
        ActivePose: ["Kneel"],
      });

      drawFocusGlow(char, 100, 100, 1, PerformanceLevel.NORMAL);

      expect(mockCtx.filter).toBe("blur(25px)");
      expect(mockCtx.ellipse).toHaveBeenCalled();
    });

    it("renders focus glow with lightweight gradient in CRITICAL performance mode", () => {
      const char = createMockCharacter({
        MemberNumber: 10001,
        LabelColor: "#00ffff",
      });

      drawFocusGlow(char, 100, 100, 1, PerformanceLevel.CRITICAL);

      expect(mockCtx.createRadialGradient).toHaveBeenCalled();
      expect(mockCtx.arc).toHaveBeenCalled();
    });
  });
  describe("Canvas Mouse Boundary Tracking", () => {
    it("updates currentFrameHoveredPlayer when mouse is over canvas, and ignores when off canvas", () => {
      const win = window as any;
      win.MouseX = 50;
      win.MouseY = 50;

      const char = createMockCharacter({
        MemberNumber: 10001,
        Name: "Alice",
      });

      // 1. Mouse is NOT over canvas -> should not set currentFrameHoveredPlayer
      setIsMouseOverCanvas(false);
      setCurrentFrameHoveredPlayer(null);

      // Simulating the collision check done in DrawCharacter hook
      const isMapActive = false;
      const drawX = 0;
      const drawY = 0;
      const zoom = 1;

      const checkHover = () => {
        if (
          isMouseOverCanvas &&
          !isMapActive &&
          win.MouseX >= drawX &&
          win.MouseX <= drawX + 500 * zoom &&
          win.MouseY >= drawY &&
          win.MouseY <= drawY + 1000 * zoom
        ) {
          setCurrentFrameHoveredPlayer(char.MemberNumber);
        }
      };

      checkHover();
      expect(currentFrameHoveredPlayer).toBeNull();

      // 2. Mouse IS over canvas -> should capture character ID
      setIsMouseOverCanvas(true);
      checkHover();
      expect(currentFrameHoveredPlayer).toBe(10001);
    });
  });
});
