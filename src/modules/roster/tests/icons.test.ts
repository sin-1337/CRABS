import { describe, it, expect, beforeEach } from "vitest";
import { setStatusIcons, setbadge, setIcons } from "../icons";
import { createMockCharacter } from "mockups/character";
import { createMockChatRoomData } from "mockups/chatroom";

describe("Roster Icons Module", () => {
  beforeEach(() => {
    const win = window as any;
    win.CharacterGetEffects = () => [];
    win.ChatRoomData = createMockChatRoomData();
    win.Player = createMockCharacter({
      MemberNumber: 10001,
      Name: "PlayerUser",
      IsPlayer: () => true,
      FriendList: [],
      WhiteList: [],
      BlackList: [],
      GhostList: [],
      GetLoversNumbers: () => [],
      OwnerNumber: () => -1,
      IsInFamilyOfMemberNumber: () => false,
    });
  });

  describe("setStatusIcons", () => {
    it("renders default None icons when no effects are active", () => {
      const char = createMockCharacter({ MemberNumber: 20002 });
      const html = setStatusIcons(char);

      expect(html).toContain("gagNone");
      expect(html).toContain("blindNone");
      expect(html).toContain("deafNone");
    });

    it("selects the highest severity effect for each category", () => {
      (window as any).CharacterGetEffects = () => [
        "GagLight",
        "GagHeavy",
        "GagNormal",
        "BlindLight",
        "BlindTotal",
      ];

      const char = createMockCharacter({ MemberNumber: 20002 });
      const html = setStatusIcons(char);

      expect(html).toContain("gagHeavy");
      expect(html).not.toContain("gagLight");
      expect(html).toContain("blindTotal");
      expect(html).toContain("deafNone");
    });
  });

  describe("setbadge", () => {
    it("returns admin badge for room admins", () => {
      (window as any).ChatRoomData = createMockChatRoomData({
        Admin: [20002],
        Whitelist: [30003],
      });

      const adminChar = createMockCharacter({ MemberNumber: 20002 });
      expect(setbadge(adminChar)).toContain("admin");
    });

    it("returns vip badge for whitelisted non-admins", () => {
      (window as any).ChatRoomData = createMockChatRoomData({
        Admin: [20002],
        Whitelist: [30003],
      });

      const vipChar = createMockCharacter({ MemberNumber: 30003 });
      expect(setbadge(vipChar)).toContain("vip");
    });

    it("falls back to guest player badge", () => {
      (window as any).ChatRoomData = createMockChatRoomData({
        Admin: [20002],
        Whitelist: [30003],
      });

      const guestChar = createMockCharacter({ MemberNumber: 40004 });
      expect(setbadge(guestChar)).toContain("player");
    });
  });

  describe("setIcons", () => {
    it("returns 'you' badge for the local player", () => {
      const selfChar = createMockCharacter({
        MemberNumber: 10001,
        IsPlayer: () => true,
      });

      expect(setIcons(selfChar)).toContain("you");
    });

    it("evaluates D/s ownership relationships accurately", () => {
      const ownerChar = createMockCharacter({ MemberNumber: 50005 });
      (window as any).Player.OwnerNumber = () => 50005;

      expect(setIcons(ownerChar)).toContain("owner");

      const subChar = createMockCharacter({
        MemberNumber: 60006,
        IsOwnedByPlayer: () => true,
        Ownership: { MemberNumber: 10001, Stage: 1 },
      });

      expect(setIcons(subChar)).toContain("sub");

      const trialSub = createMockCharacter({
        MemberNumber: 70007,
        IsOwnedByPlayer: () => true,
        Ownership: { MemberNumber: 10001, Stage: 0 },
      });

      expect(setIcons(trialSub)).toContain("trial");
    });

    it("respects relationship hierarchy (lover overrides friend)", () => {
      const loverAndFriend = createMockCharacter({ MemberNumber: 80008 });
      (window as any).Player.GetLoversNumbers = () => [80008];
      (window as any).Player.FriendList = [80008];

      const html = setIcons(loverAndFriend);
      expect(html).toContain("lover");
      expect(html).not.toContain("friend");
    });

    it("appends moderation list badges correctly", () => {
      const target = createMockCharacter({ MemberNumber: 90009 });
      (window as any).Player.FriendList = [90009];
      (window as any).Player.WhiteList = [90009];

      const html = setIcons(target);
      expect(html).toContain("friend");
      expect(html).toContain("whitelist");
    });
  });
});
