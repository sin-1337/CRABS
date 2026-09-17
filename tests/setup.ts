import { beforeEach } from "vitest";
import { createMockCharacter } from "../src/mockups/character";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as any;

beforeEach(() => {
  document.body.innerHTML = `
    <canvas id="MainCanvas" width="2000" height="1000"></canvas>
    <div id="TextAreaChatLog" style="width: 1000px; height: 400px; top: 600px; right: 0;"></div>
  `;

  const win = window as any;
  win.CurrentScreen = "ChatRoom";
  win.CurrentCharacter = null;
  win.ChatRoomCharacter = [];
  win.ChatRoomData = {
    Name: "Test_Chamber",
    ID: "99999",
    Limit: 10,
    Admin: [10001],
    Whitelist: [],
    Custom: { SizeMode: 0 },
  };

  win.Player = createMockCharacter({
    MemberNumber: 10001,
    Name: "Tester",
    IsPlayer: () => true,
    LastChatRoom: { Name: "Test_Chamber" },
    FriendList: [],
    MapData: {
      PrivateState: {
        HasKeyBronze: false,
        HasKeySilver: false,
        HasKeyGold: false,
      },
    },
    OnlineSettings: { ShowNames: true },
  });

  win.Commands = [];
});
