import { describe, it, expect, beforeEach, vi } from "vitest";
import { Orchestrator } from "../orchestrator";
import { Drawer } from "@/modules/base";
import { Settings } from "@/modules/settings";
import { createMockModSDK } from "mockups/mod-sdk";
import { createMockCharacter } from "mockups/character";

describe("Orchestrator Module", () => {
  let mockSdk: ReturnType<typeof createMockModSDK>;
  let mockRoster: any;
  let mockBanner: any;
  let orchestrator: Orchestrator;

  beforeEach(() => {
    const win = window as any;

    win.CurrentScreen = "ChatRoom";
    win.CurrentCharacter = null;
    win.ChatRoomCharacter = [];
    win.ChatRoomData = {
      Name: "Dungeon_Cell",
      ID: "10101",
      Custom: { SizeMode: 0 },
    };
    win.Player = createMockCharacter({
      MemberNumber: 10001,
      Name: "Tester",
      LastChatRoom: { Name: "Dungeon_Cell" },
    });

    win.ChatRoomExit = vi.fn();
    win.MouseIn = vi.fn(() => false);
    win.InformationSheetSelection = null;

    mockSdk = createMockModSDK();
    mockRoster = {
      buildroster: vi.fn(() => "mock-roster-counts"),
    };
    mockBanner = {
      drawBanner: vi.fn(),
    };

    // Ensure Settings singleton data exists
    if (!Settings.instance) {
      (Settings as any).instance = {
        data: {
          showBanner: true,
          closeDrawerOnChat: true,
          respawnBannerOnMapView: true,
        },
        syncGameState: vi.fn(),
      };
    }

    orchestrator = new Orchestrator(mockSdk, mockRoster, mockBanner);
  });

  it("registers essential engine hooks on initialization", () => {
    const registeredHooks = [
      "ChatRoomExit",
      "ChatRoomRun",
      "ChatRoomSendChat",
      "ChatRoomUpdateDisplay",
      "CommonSetScreen",
      "ChatRoomFocusCharacter",
      "DialogLeave",
      "OnlineProfileRun",
      "OnlineProfileClick",
      "OnlineProfileUnload",
    ];

    for (const hookName of registeredHooks) {
      expect(mockSdk.hookFunction).toHaveBeenCalledWith(
        hookName,
        expect.any(Number),
        expect.any(Function),
      );
    }
  });

  it("resets room tracking and updates Drawer visibility on ChatRoomExit", () => {
    const updateVisibilitySpy = vi.spyOn(Drawer, "updateVisibility");

    mockSdk.triggerHook("ChatRoomExit");

    expect(updateVisibilitySpy).toHaveBeenCalled();
  });

  it("stows Drawer when submitting regular chat if closeDrawerOnChat is enabled", () => {
    const closeSpy = vi.spyOn(Drawer, "close");
    document.body.innerHTML = `<textarea id="InputChat">hello dungeon</textarea>`;

    mockSdk.triggerHook("ChatRoomSendChat");

    expect(closeSpy).toHaveBeenCalled();
  });

  it("does NOT stow Drawer when submitting CRABS slash commands", () => {
    const closeSpy = vi.spyOn(Drawer, "close");
    document.body.innerHTML = `<textarea id="InputChat">/crabs roster</textarea>`;

    mockSdk.triggerHook("ChatRoomSendChat");

    expect(closeSpy).not.toHaveBeenCalled();
  });

  it("triggers initial room join routine and dispatches Banner", () => {
    const drawBannerSpy = vi.spyOn(orchestrator, "drawbanner");

    mockSdk.triggerHook("ChatRoomUpdateDisplay");

    expect(drawBannerSpy).toHaveBeenCalled();
    expect(mockBanner.drawBanner).toHaveBeenCalledWith({
      RosterCounters: "mock-roster-counts",
    });
  });

  it("normalizes math alphanumerics and zalgo in profile text on click", () => {
    const win = window as any;
    win.MouseIn = vi.fn(() => true); // Simulate click on the Aa button coordinates
    win.OnlineProfileMode = "Description";

    const target = createMockCharacter({
      MemberNumber: 77777,
      Description: "𝐇𝐞𝐥𝐥𝐨 T̷e̵s̶t̸",
    });
    win.InformationSheetSelection = target;

    document.body.innerHTML = `<textarea id="DescriptionInput">${target.Description}</textarea>`;

    // Click to toggle normalization
    mockSdk.triggerHook("OnlineProfileClick");

    const input = document.getElementById(
      "DescriptionInput",
    ) as HTMLTextAreaElement;
    expect(input.value).toBe("Hello Test");
    expect(target.Description).toBe("Hello Test");

    // Click again to toggle back to raw original
    mockSdk.triggerHook("OnlineProfileClick");
    expect(input.value).toBe("𝐇𝐞𝐥𝐥𝐨 T̷e̵s̶t̸");
    expect(target.Description).toBe("𝐇𝐞𝐥𝐥𝐨 T̷e̵s̶t̸");
  });
});
