// globals.d.ts
declare global {
  const NAME: string;
  const NICKNAME: string;
  const VERSION: string;

  // unique to crabs
  interface Window {
    PlayerFocus: typeof Roster.showPlayerFocus;
    sendWhisper: typeof WhisperPlus.sentWhisper;
    fakePlayerCommand: typeof Roster.fakePlayerCommand;
    crabsCloseItem: typeof Roster.close;
    crabsHelp: typeof HELP.showHelp;
  }

  // XXX: this… doesn't exist, yet has a call?
  function addChatMessage(msg: string): void;
}

export {};
