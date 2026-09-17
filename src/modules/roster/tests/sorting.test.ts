import { describe, it, expect, beforeEach } from "vitest";
import * as Sorting from "../sorting";

describe("Roster Occupant Sorting", () => {
  beforeEach(() => {
    const win = window as any;
    win.Player = { MemberNumber: 10001, FriendList: [20002] };
    win.ChatRoomData = { Admin: [30003], Whitelist: [40004] };
  });

  it("prioritizes self > admin > whitelist > standard in 'role' mode", () => {
    const playerChar = { MemberNumber: 10001, IsPlayer: () => true };
    const adminChar = { MemberNumber: 30003, IsPlayer: () => false };
    const guestChar = { MemberNumber: 99999, IsPlayer: () => false };

    const playerScore = Sorting.calculateSortScore(
      playerChar as any,
      "role",
      2,
    );
    const adminScore = Sorting.calculateSortScore(adminChar as any, "role", 1);
    const guestScore = Sorting.calculateSortScore(guestChar as any, "role", 0);

    expect(playerScore).toBeLessThan(adminScore);
    expect(adminScore).toBeLessThan(guestScore);
  });
});
