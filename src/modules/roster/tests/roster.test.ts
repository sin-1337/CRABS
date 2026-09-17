import { describe, it, expect, beforeEach, vi } from "vitest";
import { Roster } from "../roster";
import { Drawer } from "../../base";
import { createMockModSDK } from "mockups/mod-sdk";
import { createMockCharacter } from "mockups/character";

describe("Roster Module", () => {
  let mockSdk: ReturnType<typeof createMockModSDK>;
  let roster: Roster;

  beforeEach(() => {
    localStorage.clear();
    const win = window as any;

    win.CurrentScreen = "ChatRoom";
    win.CurrentCharacter = null;
    win.ChatRoomCharacter = [
      createMockCharacter({
        MemberNumber: 10001,
        Name: "Tester",
        LabelColor: "#ffffff",
        IsPlayer: () => true,
      }),
      createMockCharacter({
        MemberNumber: 20002,
        Name: "AdminUser",
        LabelColor: "#ff0000",
        IsPlayer: () => false,
      }),
    ];
    win.ChatRoomData = {
      Name: "Dungeon_Cell",
      ID: "12345",
      Limit: 10,
      Admin: [20002],
      Whitelist: [],
      Custom: { SizeMode: 0 },
    };
    win.Player = createMockCharacter({
      MemberNumber: 10001,
      Name: "Tester",
      IsPlayer: () => true,
      LastChatRoom: { Name: "Dungeon_Cell" },
      FriendList: [30003],
      MapData: {
        PrivateState: {
          HasKeyBronze: false,
          HasKeySilver: false,
          HasKeyGold: false,
        },
      },
    });
    win.CharacterNickname = (c: any) => c.Name;
    win.CharacterGetEffects = () => [];
    win.ServerPlayerIsInChatRoom = () => true;

    mockSdk = createMockModSDK();
    roster = new Roster(mockSdk);
  });

  it("registers views and state delegates with Drawer on construction", () => {
    const registerViewSpy = vi.spyOn(Drawer, "registerView");
    const registerDelegateSpy = vi.spyOn(Drawer, "registerStateDelegate");

    new Roster(mockSdk);

    expect(registerDelegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        isDirty: expect.any(Function),
        clearDirty: expect.any(Function),
        updateUI: expect.any(Function),
        layoutMode: expect.any(Function),
        cycleLayout: expect.any(Function),
      }),
    );

    expect(registerViewSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: "roster" }),
    );
    expect(registerViewSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: "history" }),
    );
    expect(registerViewSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: "keys" }),
    );
  });

  it("cycles through supported layout modes and sets dirty flag", () => {
    roster.isDirty = false;
    expect(roster.layoutMode).toBe("layout-grid");

    roster.layoutMode = "layout-compact";
    expect(roster.layoutMode).toBe("layout-compact");
    expect(localStorage.getItem("CRABS_RosterLayout")).toBe("layout-compact");
    expect(roster.isDirty).toBe(true);
  });

  it("renders occupant cards inside the live roster HTML", () => {
    const rendered = roster.buildroster("all", false);

    expect(rendered).toContain('id="CRABS_card_10001"');
    expect(rendered).toContain('id="CRABS_card_20002"');
    expect(rendered).toContain("Tester");
    expect(rendered).toContain("AdminUser");
  });

  it("updates DOM stat counters surgically via updateRosterUI", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <div id="drawer-title"></div>
      <div id="CRABS_header_admins"></div>
      <div id="CRABS_header_players"></div>
      <div class="CRABS_card-container">
        <div class="CRABS_card" id="CRABS_card_10001">
          <span class="CRABS_player-name">OldName</span>
        </div>
        <div class="CRABS_card" id="CRABS_card_20002">
          <span class="CRABS_player-name">OldAdmin</span>
        </div>
      </div>
    `;

    roster.updateRosterUI(root);

    expect(root.querySelector("#drawer-title")?.textContent).toBe(
      "Dungeon_Cell",
    );
    expect(root.querySelector("#CRABS_header_admins")?.textContent).toBe("1/1");
    expect(root.querySelector("#CRABS_header_players")?.textContent).toBe(
      "2/10",
    );
    expect(
      root.querySelector("#CRABS_card_10001 .CRABS_player-name")?.textContent,
    ).toBe("Tester");
    expect(
      root.querySelector("#CRABS_card_20002 .CRABS_player-name")?.textContent,
    ).toBe("AdminUser");
  });

  it("flags module dirty on room sync and member transition hooks", () => {
    roster.isDirty = false;

    mockSdk.triggerHook("ChatRoomSyncMemberJoin", [
      { Character: { MemberNumber: 40004 } },
    ]);
    expect(roster.isDirty).toBe(true);

    roster.isDirty = false;
    mockSdk.triggerHook("ChatRoomSyncMemberLeave", [20002]);
    expect(roster.isDirty).toBe(true);
  });
});
