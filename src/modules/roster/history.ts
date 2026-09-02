import { Assets } from "../assets";
import rostercardssingletemplate from "./templates/roster_cards_single.html";

export interface HistoryRecord {
  MemberNumber: number;
  Name: string;
  Nickname?: string;
  LabelColor?: string;
  seen: number;
}

const STORAGE_KEY = "CRABS_RoomHistory";
const MAX_HISTORY = 50;

let historyCache: HistoryRecord[] = [];

/**
 * Initializes the history cache from localStorage.
 */
export function loadHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    historyCache = raw ? JSON.parse(raw) : [];
  } catch {
    historyCache = [];
  }
  return historyCache;
}

/**
 * Persists the in-memory history cache to localStorage.
 */
function persistHistory(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historyCache));
  } catch (err) {
    console.warn("CRABS: Failed to save room history", err);
  }
}

/**
 * Appends or updates a character in the history LRU/FIFO buffer.
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

  // Remove duplicate entry if present
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
 * Connects directly to WCE's IndexedDB and loads the cached character profile.
 */
export async function openWCEProfile(memberNumber: number): Promise<void> {
  const globalWindow = window as any;

  try {
    const req = indexedDB.open("bce-past-profiles");

    req.onsuccess = (evt: any) => {
      const db = evt.target.result;
      if (!db.objectStoreNames.contains("profiles")) {
        if (typeof globalWindow.$?.notify === "function") {
          globalWindow.$.notify(
            "WCE past profiles database not found.",
            "error",
          );
        }
        return;
      }

      const tx = db.transaction("profiles", "readonly");
      const store = tx.objectStore("profiles");
      const getReq = store.get(memberNumber);

      getReq.onsuccess = () => {
        const profile = getReq.result;
        if (!profile) {
          if (typeof globalWindow.$?.notify === "function") {
            globalWindow.$.notify(
              `No WCE profile cached for #${memberNumber}`,
              "warn",
            );
          }
          return;
        }

        const parsedBundle = JSON.parse(profile.characterBundle);
        const charInstance = globalWindow.CharacterLoadOnline(
          parsedBundle,
          memberNumber,
        );
        charInstance.BCESeen = profile.seen;

        if (globalWindow.CurrentScreen === "ChatRoom") {
          globalWindow.ChatRoomHideElements();
          if (globalWindow.ChatRoomData) {
            globalWindow.ChatRoomBackground =
              globalWindow.ChatRoomData.Background;
          }
        }
        globalWindow.InformationSheetLoadCharacter(charInstance);
      };
    };

    req.onerror = () => {
      if (typeof globalWindow.$?.notify === "function") {
        globalWindow.$.notify("Could not open WCE database.", "error");
      }
    };
  } catch (err) {
    console.error("CRABS: Failed reading WCE profile", err);
  }
}

/**
 * Prompts a message and beeps the target, strictly verifying friend list presence.
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
 * Builds the compact layout HTML cards for the 50-person history.
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
      key: "history_badge" as any,
      tooltip_override: "View WCE Cached Profile",
    });

    const timeStr = new Date(rec.seen).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const templatevars: Record<string, string> = {
      PlayerNumber: `${rec.MemberNumber}`,
      Badge: badgeIcon || "📜",
      LabelColorBorder: `${convertColor(labelColor, 0.5)}`,
      LabelColor: labelColor,
      LabelShadow: "text-shadow: none !important; -webkit-text-stroke: 0px;",
      PlayerName: cleanName(
        rec.Nickname || rec.Name || `Member ${rec.MemberNumber}`,
      ),
      PlayerIcons: "",
      StatusIcons: `<span style="font-size: 0.95rem; opacity: 0.6; padding-right: 4px;">${timeStr}</span>`,
      CompassBlock: "",
    };

    rowsHtml += templateEngine(rostercardssingletemplate, templatevars, false);
  }

  return `
    <div class="CRABS_roster_center_table layout-compact">
      <div class="CRABS_roster_table_shrink">
        <div class="CRABS_card-container">
          ${rowsHtml || '<div style="padding: 12px; color: #888; text-align: center;">No recent room occupants cached.</div>'}
        </div>
      </div>
    </div>
  `;
}
