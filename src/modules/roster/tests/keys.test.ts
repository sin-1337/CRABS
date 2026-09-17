import { describe, it, expect, beforeEach, vi } from "vitest";
import * as Keys from "../keys";

describe("Roster Keys Logic", () => {
  beforeEach(() => {
    const win = window as any;
    win.Player = {
      MemberNumber: 10001,
      MapData: {
        PrivateState: {
          HasKeyBronze: false,
          HasKeySilver: false,
          HasKeyGold: false,
        },
      },
    };
    win.ChatRoomMapViewIsActive = () => true;
    win.ServerSend = vi.fn();
    win.ChatRoomSendLocal = vi.fn();
  });

  it("calculates key states and binary string accurately", () => {
    const win = window as any;
    win.Player.MapData.PrivateState.HasKeyBronze = true;
    win.Player.MapData.PrivateState.HasKeyGold = true;

    const state = Keys.getKeyState();
    expect(state.hasBronze).toBe(true);
    expect(state.hasSilver).toBe(false);
    expect(state.hasGold).toBe(true);
    expect(state.hasAny).toBe(true);
    expect(state.keyStateString).toBe("101");
  });

  it("returns fallback zeros when player has no MapData", () => {
    const win = window as any;
    delete win.Player.MapData;

    const state = Keys.getKeyState();
    expect(state.hasAny).toBe(false);
    expect(state.keyStateString).toBe("000");
  });

  it("drops key and synchronizes state via ServerSend when on active map", () => {
    const win = window as any;
    win.Player.MapData.PrivateState.HasKeySilver = true;

    const mockTranslate = vi.fn((key: string) => key);
    const dropped = Keys.dropMapKey("silver", mockTranslate);

    expect(dropped).toBe(true);
    expect(win.Player.MapData.PrivateState.HasKeySilver).toBe(false);
    expect(win.ServerSend).toHaveBeenCalledWith("ChatRoomChat", {
      Type: "MapData",
      Content: "PrivateState",
      Dictionary: [{ MapDataPrivateState: win.Player.MapData.PrivateState }],
    });
  });

  it("refuses to drop key when not in an active map room", () => {
    const win = window as any;
    win.ChatRoomMapViewIsActive = () => false;
    win.Player.MapData.PrivateState.HasKeyBronze = true;

    const mockTranslate = vi.fn((key: string) => key);
    const dropped = Keys.dropMapKey("bronze", mockTranslate);

    expect(dropped).toBe(false);
    expect(win.Player.MapData.PrivateState.HasKeyBronze).toBe(true);
    expect(win.ServerSend).not.toHaveBeenCalled();
  });
});
