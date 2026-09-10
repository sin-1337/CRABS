// modules/help/types.d.ts

declare global {
  interface Window {
    crabsHelp: (typeof import("./help").Help)["prototype"]["showHelp"];
  }
}

export {};
