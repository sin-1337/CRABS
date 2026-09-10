// modules/whisperplus/types.d.ts

declare global {
  interface Window {
    sendWhisper: (memberNumber: number) => void;
    ChatRoomMessageWhisperPlus?: (event: MouseEvent | any) => void;
  }
}

export {};
