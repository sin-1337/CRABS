export function createMockChatRoomData<T extends Record<string, any>>(
  overrides: T = {} as T,
) {
  return {
    Name: "Dungeon_Cell",
    ID: "12345",
    Description: "",
    Limit: 10,
    Admin: [20002],
    Whitelist: [],
    Ban: [],
    BlockCategory: [],
    Game: "",
    Visibility: ["All"],
    Access: ["All"],
    Language: "EN",
    Space: "X",
    Custom: { SizeMode: 0 },
    Character: [
      { MemberNumber: 10001, Name: "Tester" },
      { MemberNumber: 20002, Name: "AdminUser" },
    ],
    ...overrides,
  };
}
