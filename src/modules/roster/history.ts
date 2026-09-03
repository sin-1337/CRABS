/**
 * CRABS Roster History Module
 *
 * Provides persistent tracking, UI rendering, and external mod integration
 * for recently departed room occupants.
 *
 * Core capabilities:
 * - Scoped strictly to the active chat room; purges when switching to a different room.
 * - Restores cache across page reloads, disconnects, and lobby exits when re-entering the same room.
 * - Records strictly departed occupants into a true 50-slot FIFO/LRU memory buffer backed by sessionStorage.
 * - Renders historical occupant cards in a compact, scannable format.
 * - Evaluates real-time relationship statuses (lovers, friends, ownership) for past occupants.
 * - Integrates with Bondage Club Enhanced (WCE) to load historical character profiles from IndexedDB.
 * - Provides targeted messaging utilities (direct beep shortcut for mutual friends).
 */

import { Assets } from "../assets";
import * as Icons from "./icons";
import { CrossMod } from "../crossmod";
import historycardstemplate from "./templates/history_cards.html";

/**
 * Represents an entry in the historical room occupant cache.
 */
export interface HistoryRecord {
  /** The unique numerical identifier for the character. */
  MemberNumber: number;
  /** The base account name of the character. */
  Name: string;
  /** The display nickname configured by or for the character, if available. */
  Nickname?: string;
  /** The hex or CSS color string used for the character's nameplate and border accents. */
  LabelColor?: string;
  /** Epoch timestamp (in milliseconds) representing when the player left the room. */
  seen: number;
}

/**
 * Encapsulates the room-scoped storage schema preserved in session memory.
 */
interface StoredRoomHistory {
  /** The active room name associated with the historical record collection. */
  roomName: string;
  /** The collection of occupant entries recorded within the room. */
  records: HistoryRecord[];
}

/** The sessionStorage key where the serialized occupant history payload is preserved. */
const STORAGE_KEY = "CRABS_CurrentRoomHistory";

/** Maximum number of historical records retained in memory and persistent storage. */
const MAX_HISTORY = 50;

/** Tracks the active room name to distinguish reloads/rejoins from room transitions. */
let currentRoomName: string = "";

/** In-memory cache holding the deserialized array of historical occupants. */
let historyCache: HistoryRecord[] = [];

/**
 * Reconciles the active chat room context against persisted session history.
 *
 * If the room name matches the saved session entry, history is restored
 * (handling reconnects, refreshes, and lobby exits). If entering a genuinely
 * different room, the prior occupant log is cleared.
 *
 * @param {string} roomName - The name of the room currently joined.
 * @returns {void}
 */
export function syncRoomContext(roomName: string): void {
  if (!roomName) return;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: StoredRoomHistory = JSON.parse(raw);
      if (parsed.roomName === roomName) {
        currentRoomName = roomName;
        historyCache = parsed.records || [];
        return;
      }
    }
  } catch {
    // Ignore parse errors
  }

  currentRoomName = roomName;
  historyCache = [];
  persistHistory();
}

/**
 * Initializes and retrieves the occupant history cache from persistent browser storage.
 *
 * Attempts to parse the JSON array stored under {@link STORAGE_KEY}. Falls back
 * safely to an empty collection if parsing fails or storage is unpopulated.
 *
 * @returns {HistoryRecord[]} The loaded array of historical records.
 */
export function loadHistory(): HistoryRecord[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: StoredRoomHistory = JSON.parse(raw);
      currentRoomName = parsed.roomName || "";
      historyCache = parsed.records || [];
    } else {
      historyCache = [];
    }
  } catch {
    historyCache = [];
  }
  return historyCache;
}

/**
 * Writes the active in-memory history cache and room association to sessionStorage.
 *
 * Wraps serialization in a try/catch block to silently handle quota limits
 * or security exceptions raised by the browser storage engine.
 *
 * @internal
 * @returns {void}
 */
function persistHistory(): void {
  try {
    const payload: StoredRoomHistory = {
      roomName: currentRoomName,
      records: historyCache,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("CRABS: Failed to save room history", err);
  }
}

/**
 * Constructs relationship and status icons for a historical character record.
 *
 * Re-evaluates relationship data live against the local Player account state
 * (friends, lovers, club status, whitelist/blacklist) to ensure icons remain
 * accurate even if relationships change after the character leaves the room.
 *
 * @internal
 * @param {number} memberNumber - The member ID of the historical character.
 * @returns {string} Compiled HTML string representing the relationship icons.
 */
function generateHistoryPlayerIcons(memberNumber: number): string {
  const globalWindow = window as any;
  const player = globalWindow.Player;

  // Fully-stubbed proxy matching Character helper contract
  const charProxy: any = {
    MemberNumber: memberNumber,
    IsPlayer: () => false,
    IsOwnedByPlayer: () => {
      if (!player) return false;
      if (typeof player.IsOwnerOf === "function")
        return player.IsOwnerOf(charProxy);
      return player.Ownership?.MemberNumber === memberNumber;
    },
    IsOwnerOfPlayer: () => {
      if (!player) return false;
      if (typeof player.IsOwnedBy === "function")
        return player.IsOwnedBy(charProxy);
      return player.OwnerNumber ? player.OwnerNumber() === memberNumber : false;
    },
    IsLoverOfPlayer: () => {
      if (!player) return false;
      return player.GetLoversNumbers
        ? player.GetLoversNumbers().includes(memberNumber)
        : false;
    },
    IsInFamilyOfPlayer: () => {
      if (!player?.IsInFamilyOfMemberNumber) return false;
      return player.IsInFamilyOfMemberNumber(memberNumber);
    },
  };

  let iconsHTML = "";
  try {
    iconsHTML = Icons.setIcons(charProxy);
  } catch (err) {
    console.warn(
      "CRABS: Failed evaluating relationship icons for history proxy",
      err,
    );
  }

  // AFC Lovers check
  if (typeof memberNumber === "number" && CrossMod.isAFCLover(memberNumber)) {
    const afcRoom = CrossMod.getAFCLoverRoom(memberNumber);
    const tooltip = afcRoom ? `AFC Lover (Room: ${afcRoom})` : "AFC Lover";

    iconsHTML += Assets.printimage({
      key: "lover",
      tooltip_override: tooltip,
      css_class_override: "CRABS_icon",
    });
  }

  return iconsHTML;
}

/**
 * Ingests a departing character into the true 50-slot history buffer.
 *
 * Skips the local client character (`Player`). Moves existing records
 * to index 0 with refreshed timestamps, strictly capping capacity at 50.
 *
 * @param {any} character - The character instance or character sync bundle to record.
 * @returns {void}
 */
export function recordHistoryCharacter(character: any): void {
  if (!character || !character.MemberNumber) return;

  const globalWindow = window as any;
  if (
    globalWindow.Player &&
    character.MemberNumber === globalWindow.Player.MemberNumber
  ) {
    return;
  }

  historyCache = historyCache.filter(
    (c) => c.MemberNumber !== character.MemberNumber,
  );

  historyCache.unshift({
    MemberNumber: character.MemberNumber,
    Name: character.Name || "",
    Nickname:
      typeof globalWindow.CharacterNickname === "function"
        ? globalWindow.CharacterNickname(character)
        : character.Nickname,
    LabelColor: character.LabelColor || "#FFFFFF",
    seen: Date.now(),
  });

  if (historyCache.length > MAX_HISTORY) {
    historyCache.length = MAX_HISTORY;
  }

  persistHistory();
}

/**
 * Removes a member from the history cache if they rejoin the active room.
 *
 * @param {number} memberNumber - The ID of the rejoining character.
 * @returns {void}
 */
export function removeRejoinedCharacter(memberNumber: number): void {
  const prevLen = historyCache.length;
  historyCache = historyCache.filter((c) => c.MemberNumber !== memberNumber);
  if (historyCache.length !== prevLen) {
    persistHistory();
  }
}

/**
 * Triggers WCE's /profiles command for a specific player number.
 *
 * @param {number | string} memberInput - The target character's member number.
 * @param {(action: string, tag: string) => void} [runCommand] - Base instance command execution callback.
 * @returns {void}
 */
export function openWCEProfile(
  memberInput: number | string,
  runCommand?: (action: string, tag: string) => void,
): void {
  const globalWindow = window as any;
  const memberNumber = Number(memberInput);

  if (isNaN(memberNumber)) return;

  if (!CrossMod.isWCEInstalled()) {
    console.warn("[CRABS] WCE is not installed.");
    globalWindow.$?.notify?.(
      "Bondage Club Enhanced (WCE) is not installed.",
      "warning",
    );
    return;
  }

  if (!CrossMod.isWCEPastProfilesEnabled()) {
    console.warn("[CRABS] WCE Past Profiles disabled.");
    globalWindow.$?.notify?.(
      "WCE 'Past Profiles' is disabled in settings.",
      "warning",
    );
    return;
  }

  const drawer = document.getElementById("crabs-drawer");
  if (drawer) {
    drawer.classList.remove("drawer-open");
    drawer.classList.add("drawer-closed");
  }

  if (runCommand) {
    console.log(`[CRABS] Executing /profiles ${memberNumber}`);
    runCommand(memberNumber.toString(), "profiles");
  }
}

/**
 * Initiates an account beep message to a target occupant if they are a confirmed friend.
 *
 * @param {number} memberNumber - The member number to send a beep to.
 * @returns {void}
 */
export function sendFriendBeep(memberNumber: number): void {
  const globalWindow = window as any;
  const friendList: number[] = globalWindow.Player?.FriendList || [];

  if (!friendList.includes(memberNumber)) {
    if (typeof globalWindow.$?.notify === "function") {
      globalWindow.$.notify("Member is not on your friend list.", "info");
    }
    return;
  }

  const msg = prompt(`Send beep to Friend #${memberNumber}:`);
  if (msg !== null && msg.trim() !== "") {
    globalWindow.ServerSend("AccountBeep", {
      MemberNumber: memberNumber,
      BeepType: "",
      Message: msg.trim(),
    });
    if (typeof globalWindow.$?.notify === "function") {
      globalWindow.$.notify(`Beep sent to #${memberNumber}`, "success");
    }
  }
}

/**
 * Formats a seen timestamp into a compact, human-readable age string.
 *
 * @param {number} timestamp - The epoch milliseconds when the character departed.
 * @returns {string} Formatted compact time or day offset.
 */
function formatCompactTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const oneDayMs = 86_400_000;

  const seenDate = new Date(timestamp);
  const nowDate = new Date(now);

  const isSameDay =
    seenDate.getDate() === nowDate.getDate() &&
    seenDate.getMonth() === nowDate.getMonth() &&
    seenDate.getFullYear() === nowDate.getFullYear();

  // Same calendar day: Show standard clock time (e.g., "14:22" or "2:22 PM")
  if (isSameDay) {
    return seenDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Previous calendar day
  const yesterday = new Date(now - oneDayMs);
  const isYesterday =
    seenDate.getDate() === yesterday.getDate() &&
    seenDate.getMonth() === yesterday.getMonth() &&
    seenDate.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return "Yest.";
  }

  // Older than yesterday: Show days elapsed if under a week, or short date
  const daysAgo = Math.floor(diffMs / oneDayMs);
  if (daysAgo < 7) {
    return `${daysAgo}d ago`;
  }

  // Fallback for older entries (e.g., "Sep 2")
  return seenDate.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

/**
 * Generates the HTML layout for the departed occupant history view using the single-row compact template.
 *
 * @param {(tpl: string, vars: Record<string, string>, wrap?: boolean) => string} templateEngine - The base template compiler method.
 * @param {(name: string) => string} cleanName - Utility function to strip unrenderable glyphs and Zalgo artifacts.
 * @param {(color: string, alpha: number) => string} convertColor - Utility function converting a color string to an RGBA border value.
 * @returns {string} The fully compiled HTML container string for the history roster.
 */
export function buildHistoryRoster(
  templateEngine: (
    tpl: string,
    vars: Record<string, string>,
    wrap?: boolean,
  ) => string,
  cleanName: (name: string) => string,
  convertColor: (color: string, alpha: number) => string,
): string {
  let rowsHtml = "";

  for (const rec of historyCache) {
    const labelColor = rec.LabelColor || "#FFFFFF";
    const badgeIcon = Assets.printimage({
      key: "history" as any,
      tooltip_override: "View WCE Cached Profile",
      css_class_override: "CRABS_history_badge_img",
    });

    const timeStr = formatCompactTime(rec.seen);
    const playerIcons = generateHistoryPlayerIcons(rec.MemberNumber);

    const templatevars: Record<string, string> = {
      PlayerNumber: `${rec.MemberNumber}`,
      Badge: badgeIcon || "📜",
      LabelColorBorder: `${convertColor(labelColor, 0.5)}`,
      LabelColor: labelColor,
      LabelShadow: "text-shadow: none !important; -webkit-text-stroke: 0px;",
      PlayerName: cleanName(
        rec.Nickname || rec.Name || `Member ${rec.MemberNumber}`,
      ),
      PlayerIcons: playerIcons,
      StatusIcons: `<span style="font-size: 0.95rem; opacity: 0.6; padding-right: 4px;">${timeStr}</span>`,
      CompassBlock: "",
    };

    rowsHtml += templateEngine(historycardstemplate, templatevars, false);
  }

  return `
    <div class="CRABS_roster_center_table layout-compact">
      <div class="CRABS_roster_table_shrink">
        <div class="CRABS_card-container">
          ${rowsHtml || '<div style="padding: 12px; color: #888; text-align: center;">No departed occupants recorded.</div>'}
        </div>
      </div>
    </div>
  `;
}
