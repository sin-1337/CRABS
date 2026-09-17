import { describe, it, expect, beforeEach, vi } from "vitest";
import { WhisperPlus } from "../whisperplus";
import { Drawer } from "../../base";
import { Settings } from "../../settings";
import { createMockModSDK } from "mockups/mod-sdk";
import { createMockCharacter } from "mockups/character";

describe("WhisperPlus Module", () => {
  let mockSdk: ReturnType<typeof createMockModSDK>;
  let whisperPlus: WhisperPlus;

  beforeEach(() => {
    document.body.innerHTML = `<textarea id="InputChat"></textarea>`;
    const win = window as any;

    win.Player = createMockCharacter({
      MemberNumber: 10001,
      Name: "Tester",
      LabelColor: "#ffffff",
      FriendList: [20002],
      FriendNames: new Map([[20002, "Bestie"]]),
      BCT: { bctSettings: { bestFriendsList: [] } },
    });

    win.ChatRoomCharacter = [
      win.Player,
      createMockCharacter({
        MemberNumber: 30003,
        Name: "TargetUser",
        LabelColor: "#ff5555",
      }),
    ];

    win.ServerSend = vi.fn();
    win.ChatRoomSendLocal = vi.fn();
    win.ChatRoomMessage = vi.fn();
    win.TextGet = vi.fn((key: string) => key);
    win.ChatRoomMapViewIsActive = vi.fn(() => false);
    win.ChatRoomMapViewCharacterOnWhisperRange = vi.fn(() => true);
    win.ChatRoomGenerateChatRoomChatMessage = vi.fn(
      (_type: string, msg: string) => ({
        Type: "Whisper",
        Content: msg,
      }),
    );

    mockSdk = createMockModSDK();

    // Default settings stub
    (Settings as any).instance = {
      data: {
        whisperPlusAlwaysOn: false,
        autoBeepOnRegularWhisper: false,
        autoBeepOnLeave: false,
        closeDrawerOnWhisper: true,
        immersiveGag: false,
        respectBcxRules: false,
      },
    };

    whisperPlus = new WhisperPlus(mockSdk);
    whisperPlus.setupHooks();
  });

  it("registers UI injector with Drawer on instantiation", () => {
    const registerSpy = vi.spyOn(Drawer, "registerUIInjector");
    new WhisperPlus(mockSdk);

    expect(registerSpy).toHaveBeenCalledWith(expect.any(Function));
  });

  it("blocks whisper+ execution when immersiveGag is active and player is gagged", () => {
    Settings.instance.data.immersiveGag = true;
    (window as any).Player.HasEffect = (effect: string) =>
      effect === "GagTotal";

    const result = whisperPlus.whisperplus("30003 secret message", "");

    expect(result).toBe(1);
    expect((window as any).ServerSend).not.toHaveBeenCalled();
    expect((window as any).ChatRoomSendLocal).toHaveBeenCalledWith(
      expect.any(String),
      10000,
    );
  });

  it("formats standard whispers with '+:' prefix and converts parentheses to avoid base game OOC", () => {
    const closeSpy = vi.spyOn(Drawer, "close");

    const result = whisperPlus.whisperplus(
      "30003 hello (test)",
      "/whisper+ 30003 hello (test)",
    );

    expect(result).toBe(0);
    expect(closeSpy).toHaveBeenCalled();
    expect((window as any).ServerSend).toHaveBeenCalledWith(
      "ChatRoomChat",
      expect.objectContaining({
        Type: "Whisper",
        Target: 30003,
        Content: "+: hello ❪test❫",
      }),
    );
  });

  it("encloses message in parentheses when map is active and target is out of whisper range", () => {
    const win = window as any;
    win.ChatRoomMapViewIsActive.mockReturnValue(true);
    win.ChatRoomMapViewCharacterOnWhisperRange.mockReturnValue(false);

    const result = whisperPlus.whisperplus(
      "30003 across the map",
      "/whisper+ 30003 across the map",
    );

    expect(result).toBe(0);
    expect(win.ServerSend).toHaveBeenCalledWith(
      "ChatRoomChat",
      expect.objectContaining({
        Content: "(+: across the map)",
      }),
    );
  });

  it("treats whispering yourself as a local note-to-self without network transmission", () => {
    const win = window as any;

    const result = whisperPlus.whisperplus(
      "10001 my own thoughts",
      "/whisper+ 10001 my own thoughts",
    );

    expect(result).toBe(0);
    expect(win.ServerSend).not.toHaveBeenCalled();
    expect(win.ChatRoomSendLocal).toHaveBeenCalled();
  });

  it("falls back to AccountBeep if target leaves and autoBeepOnLeave is enabled for friends", () => {
    const win = window as any;
    Settings.instance.data.autoBeepOnLeave = true;

    // Target 20002 is on FriendList but NOT in ChatRoomCharacter
    const result = whisperPlus.whisperplus(
      "20002 see you later",
      "/whisper+ 20002 see you later",
    );

    expect(result).toBe(0);
    expect(win.ServerSend).toHaveBeenCalledWith("AccountBeep", {
      MemberNumber: 20002,
      BeepType: "",
      Message: "see you later",
    });
  });

  it("strips raw '+:' text node markers in ChatRoomMessageDisplay hook", () => {
    const displayHook = mockSdk.getHooks("ChatRoomMessageDisplay")[0];

    const mockDiv = document.createElement("div");
    mockDiv.appendChild(document.createTextNode("Whisper from Target: "));

    const contentSpan = document.createElement("span");
    contentSpan.className = "chat-room-message-content";
    contentSpan.innerHTML = "+: Hello secret";
    mockDiv.appendChild(contentSpan);

    const nextFn = vi.fn(() => mockDiv);

    const processedDiv = displayHook.callback(
      [{ Type: "Whisper" }, "+: Hello secret"],
      nextFn,
    );

    expect(processedDiv.innerHTML).toContain(
      '<span style="display:none;">+: </span>Hello secret',
    );
    expect(processedDiv.textContent).toContain("Whisper+");
  });

  it("resolves target by character Name (case-insensitive)", () => {
    const win = window as any;

    const result = whisperPlus.whisperplus(
      "targetuser hi there",
      "/whisper+ targetuser hi there",
    );

    expect(result).toBe(0);
    expect(win.ServerSend).toHaveBeenCalledWith(
      "ChatRoomChat",
      expect.objectContaining({
        Type: "Whisper",
        Target: 30003,
        Content: "+: hi there",
      }),
    );
  });

  it("resolves target by multi-word Nickname", () => {
    const win = window as any;
    win.ChatRoomCharacter.push(
      createMockCharacter({
        MemberNumber: 40004,
        Name: "RealName",
        Nickname: "Sweet Pea",
      }),
    );

    const result = whisperPlus.whisperplus(
      "Sweet Pea secret test",
      "/whisper+ Sweet Pea secret test",
    );

    expect(result).toBe(0);
    expect(win.ServerSend).toHaveBeenCalledWith(
      "ChatRoomChat",
      expect.objectContaining({
        Type: "Whisper",
        Target: 40004,
        Content: "+: secret test",
      }),
    );
  });

  it("blocks execution and warns when target name is ambiguous", () => {
    const win = window as any;
    win.ChatRoomCharacter.push(
      createMockCharacter({
        MemberNumber: 50005,
        Name: "TargetUser", // Duplicate name
      }),
    );

    const result = whisperPlus.whisperplus(
      "TargetUser hey",
      "/whisper+ TargetUser hey",
    );

    expect(result).toBe(1);
    expect(win.ServerSend).not.toHaveBeenCalled();
    expect(win.ChatRoomSendLocal).toHaveBeenCalledWith(
      expect.stringContaining('Multiple players match "TargetUser"'),
      30000,
    );
  });

  it("silently elevates /w and /whisper in CommandParse when whisperPlusAlwaysOn is true", () => {
    Settings.instance.data.whisperPlusAlwaysOn = true;
    const hook = mockSdk.getHooks("CommandParse")[0];
    const nextFn = vi.fn((args) => args[0]);

    const resWhisper = hook.callback(["/whisper 30003 hello"], nextFn);
    expect(resWhisper).toBe("/whisper+ 30003 hello");

    const resW = hook.callback(["/w 30003 hello"], nextFn);
    expect(resW).toBe("/whisper+ 30003 hello");
  });

  it("does not elevate /w or /whisper in CommandParse when whisperPlusAlwaysOn is false", () => {
    Settings.instance.data.whisperPlusAlwaysOn = false;
    const hook = mockSdk.getHooks("CommandParse")[0];
    const nextFn = vi.fn((args) => args[0]);

    const res = hook.callback(["/w 30003 hello"], nextFn);
    expect(res).toBe("/w 30003 hello");
  });
});
