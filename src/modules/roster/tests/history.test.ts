import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import {
  syncRoomContext,
  loadHistory,
  recordHistoryCharacter,
  removeRejoinedCharacter,
  sendFriendBeep,
  buildHistoryRoster,
} from "../history";
import { Roster } from "@/modules/roster";
import { createMockCharacter } from "mockups/character";
import { createMockModSDK } from "mockups/mod-sdk";

describe("Roster History Module", () => {
  beforeAll(() => {
    new Roster(createMockModSDK());
  });
  beforeEach(() => {
    sessionStorage.clear();
    const win = window as any;

    win.Player = createMockCharacter({
      MemberNumber: 10001,
      Name: "Tester",
      FriendList: [20002],
    });

    win.CharacterNickname = (c: any) => c.Nickname || c.Name;
    win.CommandSet = vi.fn();

    // Reset module-level context to a known baseline
    syncRoomContext("Baseline_Room");
  });

  describe("Room Scoping & Session Storage", () => {
    it("preserves history when re-entering the exact same room", () => {
      syncRoomContext("Room_A");
      recordHistoryCharacter({ MemberNumber: 20002, Name: "UserA" });

      // Simulate reconnect/refresh into the same room
      syncRoomContext("Room_A");
      const history = loadHistory();

      expect(history.length).toBe(1);
      expect(history[0].MemberNumber).toBe(20002);
    });

    it("purges history when switching to a different room", () => {
      syncRoomContext("Room_A");
      recordHistoryCharacter({ MemberNumber: 20002, Name: "UserA" });

      // Move to Room B
      syncRoomContext("Room_B");
      const history = loadHistory();

      expect(history.length).toBe(0);
      expect(sessionStorage.getItem("CRABS_CurrentRoomHistory")).toContain(
        "Room_B",
      );
    });
  });

  describe("Record Management & Limits", () => {
    it("does not record the local player", () => {
      recordHistoryCharacter({ MemberNumber: 10001, Name: "Tester" });
      expect(loadHistory().length).toBe(0);
    });

    it("unshifts recent departures to the top and updates timestamp on duplicate", () => {
      recordHistoryCharacter({ MemberNumber: 20002, Name: "UserA" });
      recordHistoryCharacter({ MemberNumber: 30003, Name: "UserB" });

      let history = loadHistory();
      expect(history[0].MemberNumber).toBe(30003);
      expect(history[1].MemberNumber).toBe(20002);

      // UserA leaves again later
      recordHistoryCharacter({ MemberNumber: 20002, Name: "UserA_Renamed" });
      history = loadHistory();

      expect(history.length).toBe(2);
      expect(history[0].MemberNumber).toBe(20002);
      expect(history[0].Name).toBe("UserA_Renamed");
    });

    it("enforces the 50-record maximum buffer cap", () => {
      for (let i = 1; i <= 60; i++) {
        recordHistoryCharacter({ MemberNumber: 100000 + i, Name: `User_${i}` });
      }

      const history = loadHistory();
      expect(history.length).toBe(50);
      expect(history[0].MemberNumber).toBe(100060);
      expect(history[49].MemberNumber).toBe(100011);
    });

    it("removes rejoined occupants from the history cache", () => {
      recordHistoryCharacter({ MemberNumber: 20002, Name: "UserA" });
      recordHistoryCharacter({ MemberNumber: 30003, Name: "UserB" });

      removeRejoinedCharacter(20002);
      const history = loadHistory();

      expect(history.length).toBe(1);
      expect(history[0].MemberNumber).toBe(30003);
    });
  });

  describe("External Actions & Messaging", () => {
    it("calls CommandSet when beeping a friend", () => {
      const win = window as any;
      sendFriendBeep(20002);

      expect(win.CommandSet).toHaveBeenCalledWith("beep 20002 ");
    });

    it("falls back to InputChat event dispatching if CommandSet is missing", () => {
      const win = window as any;
      win.CommandSet = undefined;

      const input = document.createElement("textarea");
      input.id = "InputChat";
      document.body.appendChild(input);

      sendFriendBeep(20002);

      expect(input.value).toBe("/beep 20002 ");
      document.body.removeChild(input);
    });

    it("aborts beeping if the target member is not on Player.FriendList", () => {
      const win = window as any;
      win.$ = { notify: vi.fn() };

      sendFriendBeep(99999);

      expect(win.CommandSet).not.toHaveBeenCalled();
      expect(win.$.notify).toHaveBeenCalledWith(
        "Member is not on your friend list.",
        "info",
      );
    });
  });

  describe("HTML Template Rendering", () => {
    it("renders empty state placeholder when no records exist", () => {
      const output = buildHistoryRoster(
        () => "",
        (n) => n,
        () => "",
        () => "",
      );
      expect(output).toContain("No departed occupants recorded.");
    });

    it("compiles records using provided template engine and helpers", () => {
      recordHistoryCharacter({
        MemberNumber: 20002,
        Name: "DepartedUser",
        LabelColor: "#00ff00",
      });

      const mockEngine = vi.fn(
        (_tpl: string, vars: Record<string, string>) =>
          `<div class="card">${vars.PlayerName} #${vars.PlayerNumber}</div>`,
      );

      const output = buildHistoryRoster(
        mockEngine,
        (name) => name.toUpperCase(),
        (color) => `rgba(${color}, 0.5)`,
        () => "none",
        "natural",
      );

      expect(mockEngine).toHaveBeenCalled();
      expect(output).toContain("DEPARTEDUSER #20002");
    });
  });
});
