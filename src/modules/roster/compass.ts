import { PerformanceLevel } from "../base";
import { Settings } from "../settings";

// --- State Variables ---

/** Tracks if the mouse is physically over the game canvas (not an HTML UI overlay or off-screen) */
export let isMouseOverCanvas: boolean = false;
export function setIsMouseOverCanvas(value: boolean): void {
  isMouseOverCanvas = value;
}

/** The player currently hovered on the main canvas (to sync to DOM) */
export let canvasHoveredPlayer: number | null = null;
export function setCanvasHoveredPlayer(id: number | null): void {
  canvasHoveredPlayer = id;
}

/** Temporary variable to calculate the top-most hovered player per frame */
export let currentFrameHoveredPlayer: number | null = null;
export function setCurrentFrameHoveredPlayer(id: number | null): void {
  currentFrameHoveredPlayer = id;
}

/** Which player are we hovering over in the chat log */
export let chatLogHoveredPlayer: number | null = null;
export function setChatLogHoveredPlayer(id: number | null): void {
  chatLogHoveredPlayer = id;
}

/** The member number of the player currently hovered on the map. */
export let hoveredMapPlayer: number | null = null;
export function setHoveredMapPlayer(id: number | null): void {
  hoveredMapPlayer = id;
}

/** The member number of the player currently locked via tap/click (Mobile Friendly). */
export let trackedMapPlayer: number | null = null;
export function setTrackedMapPlayer(id: number | null): void {
  trackedMapPlayer = id;
}

/** Timer for the hover delay mode to prevent accidental pagination. */
let hoverTimeout: number | null = null;

/** Timeout to prevent scroll jittering */
let scrollTimeout: number | null = null;

/** Caches the measured width of player names to prevent off-center arrows on name changes. */
const nameWidthCache: Map<number, { name: string; width: number }> = new Map();

/** Caches the indicator coordinates so it can be drawn at the absolute end of the frame. */
export let deferredIndicator: {
  character: any;
  x: number;
  y: number;
  zoom: number;
} | null = null;
export function setDeferredIndicator(
  indicator: typeof deferredIndicator,
): void {
  deferredIndicator = indicator;
}

// --- Handlers & DOM Sync ---

/**
 * Handler for tapping/clicking the compass icon.
 * @param {string} playerId - the id of the player to be tracked.
 */
export function onPlayerToggleTrack(playerId: string): void {
  const id = parseInt(playerId, 10);
  const wasTracked = trackedMapPlayer === id;

  trackedMapPlayer = wasTracked ? null : id;

  if (!wasTracked) {
    autoPaginateToPlayer(id);
  }

  document.querySelectorAll(".CRABS_track-compass").forEach((el) => {
    el.classList.remove("CRABS_compass-active");
  });

  if (trackedMapPlayer !== null) {
    document
      .querySelectorAll(`.CRABS_track-compass[data-player-number="${id}"]`)
      .forEach((el) => {
        el.classList.add("CRABS_compass-active");
      });
  }
}

/**
 * Clears the tracked player and resets compass UI. Call this when the drawer closes.
 */
export function clearTracking(): void {
  trackedMapPlayer = null;

  document.querySelectorAll(".CRABS_track-compass").forEach((el) => {
    el.classList.remove("CRABS_compass-active");
  });
}

/**
 * Handler for when a player's entry is hovered in the roster UI.
 * @param {string} playerId - The ID of the hovered player.
 */
export function onPlayerHover(playerId: string): void {
  if (trackedMapPlayer !== null || !playerId) return;

  const id = parseInt(playerId, 10);
  if (!isNaN(id)) {
    hoveredMapPlayer = id;

    if (!Settings.instance.data.pageFocusHover) return;

    if (hoverTimeout) {
      window.clearTimeout(hoverTimeout);
    }

    hoverTimeout = window.setTimeout(() => {
      autoPaginateToPlayer(id);
    }, 500);
  }
}

/**
 * Handler for when a player's entry is no longer hovered.
 */
export function onPlayerLeave(): void {
  hoveredMapPlayer = null;
  if (hoverTimeout) {
    window.clearTimeout(hoverTimeout);
    hoverTimeout = null;
  }
}

/**
 * Handler for explicit clicks on a player's roster card.
 * @param {string} playerId - The ID of the clicked player.
 */
export function onPlayerCardClick(playerId: string): void {
  const id = parseInt(playerId, 10);
  if (!isNaN(id)) {
    autoPaginateToPlayer(id);
  }
}

/**
 * Applies a simulated CSS hover state to a player's roster card and scrolls it into view.
 * @param {number | null} memberNumber - The ID of the hovered player, or null to clear.
 */
export function syncCanvasHoverToDOM(memberNumber: number | null): void {
  document
    .querySelectorAll(".CRABS_card.CRABS_simulated-hover")
    .forEach((el) => {
      el.classList.remove("CRABS_simulated-hover");
    });

  if (scrollTimeout) {
    window.clearTimeout(scrollTimeout);
    scrollTimeout = null;
  }

  if (memberNumber !== null) {
    const card = document.querySelector(`#CRABS_card_${memberNumber}`);
    if (card) {
      card.classList.add("CRABS_simulated-hover");

      const isInsideDrawer = card.closest("#CRABS_Drawer_Roster") !== null;

      if (isInsideDrawer && Settings.instance.data.autoScrollRoster) {
        scrollTimeout = window.setTimeout(() => {
          card.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 150);
      }
    }
  }
}

/**
 * Automatically switches the base game's ChatRoom pagination to the page containing the targeted player.
 * @param {number} targetId - The MemberNumber of the player to locate.
 */
export function autoPaginateToPlayer(targetId: number): void {
  const globalWindow = window as any;

  if (
    globalWindow.CurrentScreen !== "ChatRoom" ||
    typeof globalWindow.ChatRoomCharacterViewOffset !== "number" ||
    !Array.isArray(globalWindow.ChatRoomCharacter) ||
    globalWindow.ChatRoomCharacter.length <= 10
  ) {
    return;
  }

  if (
    globalWindow.ChatRoomCharacterDrawlist?.some(
      (c: any) => c.MemberNumber === targetId,
    )
  ) {
    return;
  }

  const originalOffset = globalWindow.ChatRoomCharacterViewOffset;
  const charCount = globalWindow.ChatRoomCharacter.length;

  const charIndex = globalWindow.ChatRoomCharacter.findIndex(
    (c: any) => c.MemberNumber === targetId,
  );
  if (charIndex !== -1) {
    const expectedOffset = Math.floor(charIndex / 10) * 10;
    globalWindow.ChatRoomCharacterViewOffset = expectedOffset;
    if (typeof globalWindow.ChatRoomUpdateDisplay === "function") {
      globalWindow.ChatRoomUpdateDisplay();
    }

    if (
      globalWindow.ChatRoomCharacterDrawlist?.some(
        (c: any) => c.MemberNumber === targetId,
      )
    ) {
      return;
    }
  }

  const highestValidOffset = Math.max(0, Math.floor((charCount - 1) / 10) * 10);
  let found = false;

  for (let offset = 0; offset <= highestValidOffset; offset += 10) {
    globalWindow.ChatRoomCharacterViewOffset = offset;
    if (typeof globalWindow.ChatRoomUpdateDisplay === "function") {
      globalWindow.ChatRoomUpdateDisplay();
    }

    if (
      globalWindow.ChatRoomCharacterDrawlist?.some(
        (c: any) => c.MemberNumber === targetId,
      )
    ) {
      found = true;
      break;
    }
  }

  if (!found) {
    globalWindow.ChatRoomCharacterViewOffset = originalOffset;
    if (typeof globalWindow.ChatRoomUpdateDisplay === "function") {
      globalWindow.ChatRoomUpdateDisplay();
    }
  }
}

// --- Visual Math & Canvas Rendering ---

/**
 * Extracts a combined string of active poses for a character.
 */
function getCharacterPoseString(character: any): string {
  const activePoses = character.ActivePose || character.Pose || [];
  return Array.isArray(activePoses)
    ? activePoses.join(" ")
    : String(activePoses);
}

/**
 * Renders a 3D-spinning directional arrow indicator on the canvas.
 */
export function drawIndicator(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  scale: number,
  color: string,
  isDark: boolean,
): void {
  const now = Date.now();

  context.save();
  try {
    context.translate(x, y);
    context.rotate(angle);

    const rollFactor = Math.sin(now / 500);
    const absRoll = Math.abs(rollFactor);
    const sign = Math.sign(rollFactor) || 1;

    const renderScaleY = Math.max(absRoll, 0.1) * sign;

    context.scale(scale, scale * renderScaleY);

    context.beginPath();
    context.moveTo(20, 0);
    context.lineTo(-20, 15);
    context.lineTo(-20, -15);
    context.closePath();

    context.fillStyle = color;
    context.fill();

    if (rollFactor > 0) {
      context.save();
      context.clip();

      const sweepX = Math.cos(now / 500) * 30;
      context.translate(sweepX, 0);

      const shineGrad = context.createLinearGradient(-10, 0, 10, 0);
      shineGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
      shineGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.8)");
      shineGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

      context.fillStyle = shineGrad;
      context.fillRect(-40, -20, 80, 40);

      context.restore();
    } else {
      const shadowAlpha = absRoll * 0.4;
      context.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
      context.fill();
    }

    context.strokeStyle = isDark ? "white" : "black";
    context.lineWidth = 1.5 / scale + (1 - absRoll) * 2.5;
    context.stroke();
  } finally {
    context.restore();
  }
}

/**
 * Draws a directional arrow pointing toward the hovered player on the map.
 * @param {Function} getColorBrightness - Callback from CRABS_Base to calculate brightness.
 */
export function drawCompass(
  getColorBrightness: (color: string) => number,
): void {
  const targetId = trackedMapPlayer || hoveredMapPlayer;

  if (!targetId || !Settings.instance.data.showMapCompass) return;

  const globalWindow = window as any;
  if (
    typeof globalWindow.ChatRoomMapViewIsActive !== "function" ||
    !globalWindow.ChatRoomMapViewIsActive()
  )
    return;

  const target = globalWindow.ChatRoomCharacter?.find(
    (character: any) => character.MemberNumber === targetId,
  );
  const player = globalWindow.Player;

  if (!target?.MapData?.Pos || !player?.MapData?.Pos) return;

  let deltaX = target.MapData.Pos.X - player.MapData.Pos.X;
  let deltaY = target.MapData.Pos.Y - player.MapData.Pos.Y;

  const canvasContext = (
    globalWindow.MainCanvas as HTMLCanvasElement
  )?.getContext("2d");
  if (!canvasContext) return;

  let arrowX, arrowY, angle;
  const scale = 0.66;

  const range = globalWindow.ChatRoomMapViewPerceptionRange;
  const tileW = 1000 / (range * 2 + 1);
  const tileIndex =
    target.MapData.Pos.X +
    target.MapData.Pos.Y * globalWindow.ChatRoomMapViewWidth;
  const isVisible =
    globalWindow.ChatRoomMapViewVisibilityMask &&
    globalWindow.ChatRoomMapViewVisibilityMask[tileIndex];

  if (Math.abs(deltaX) <= range && Math.abs(deltaY) <= range && isVisible) {
    angle = Math.PI / 2;
    arrowX = (deltaX + range) * tileW + tileW / 2;

    const poseStr = getCharacterPoseString(target);
    let poseScale = 1.0;

    if (
      poseStr.includes("Lay") ||
      poseStr.includes("Sleep") ||
      poseStr.includes("Hogtied")
    ) {
      poseScale = 0.35;
    } else if (poseStr.includes("AllFours")) {
      poseScale = 0.5;
    } else if (poseStr.includes("Kneel")) {
      poseScale = 0.75;
    }

    const tileTop = (deltaY + range) * tileW;
    const tileBottom = tileTop + tileW;
    const headY = tileBottom - tileW * 1.67 * poseScale;

    arrowY = headY - 20 * scale - 5;
  } else {
    angle = Math.atan2(deltaY, deltaX);
    arrowX = 500 + Math.cos(angle) * 450;
    arrowY = 500 + Math.sin(angle) * 450;
  }

  const playerColor = target.LabelColor || "cyan";
  const brightness = getColorBrightness(playerColor);
  const isDark = brightness < 128;

  drawIndicator(
    canvasContext,
    arrowX,
    arrowY,
    angle,
    scale,
    playerColor,
    isDark,
  );
}

/**
 * Renders the custom indicator arrow to the left of the character's nameplate.
 */
export function drawNameIndicator(
  character: any,
  x: number,
  y: number,
  getColorBrightness: (color: string) => number,
): void {
  const globalWindow = window as any;
  const canvasContext = (
    globalWindow.MainCanvas as HTMLCanvasElement
  )?.getContext("2d");
  if (!canvasContext) return;

  const currentName =
    typeof globalWindow.CharacterNickname === "function"
      ? globalWindow.CharacterNickname(character).normalize("NFKC")
      : character.Name || "";

  let cachedData = nameWidthCache.get(character.MemberNumber);

  if (!cachedData || cachedData.name !== currentName) {
    canvasContext.font = "36px sans-serif";
    cachedData = {
      name: currentName,
      width: canvasContext.measureText(currentName).width,
    };
    nameWidthCache.set(character.MemberNumber, cachedData);
  }

  const playerColor = character.LabelColor || "cyan";
  const brightness = getColorBrightness(playerColor);
  const isDark = brightness < 128;

  const scale = 0.6;
  const textWidth = cachedData.width;
  const padding = 10;
  const arrowWidth = 40 * scale;

  let angle = 0;
  let tipX = x - textWidth / 2 - padding;
  let finalArrowX = tipX - arrowWidth / 2;

  if (finalArrowX - arrowWidth / 2 < 10) {
    angle = Math.PI;
    tipX = x + textWidth / 2 + padding;
    finalArrowX = tipX + arrowWidth / 2;
  }

  drawIndicator(
    canvasContext,
    finalArrowX,
    y,
    angle,
    scale,
    playerColor,
    isDark,
  );
}

/**
 * Renders a pulsating aura behind a targeted character.
 */
export function drawFocusGlow(
  character: any,
  drawX: number,
  drawY: number,
  zoom: number,
  performanceLevel: PerformanceLevel,
): void {
  if (!Settings.instance.data.enableFocusHalo) return;

  const globalWindow = window as any;
  const context = (globalWindow.MainCanvas as HTMLCanvasElement)?.getContext(
    "2d",
  );
  if (!context) return;

  const playerColor = character.LabelColor || "cyan";

  let currentAlpha = 0.5;

  if (performanceLevel === PerformanceLevel.CRITICAL) {
    currentAlpha = 0.25;
  } else if (performanceLevel === PerformanceLevel.NORMAL) {
    const pulseSpeed = 250;
    currentAlpha = ((Math.sin(Date.now() / pulseSpeed) + 1) / 2) * 0.4;
  }

  const poseStr = getCharacterPoseString(character);

  let scaleY = 1.0;
  if (
    poseStr.includes("Lay") ||
    poseStr.includes("Sleep") ||
    poseStr.includes("Hogtied")
  ) {
    scaleY = 0.35;
  } else if (poseStr.includes("AllFours")) {
    scaleY = 0.5;
  } else if (poseStr.includes("Kneel")) {
    scaleY = 0.65;
  }

  const heightRatio =
    typeof character.HeightRatio === "number" ? character.HeightRatio : 1.0;

  const radiusX = 250 * zoom * heightRatio;
  const radiusY = 500 * zoom * heightRatio * scaleY;

  const centerX = drawX + 250 * zoom;
  const floorY = drawY + 1000 * zoom;
  const centerY = floorY - radiusY;

  context.save();
  try {
    context.globalAlpha = currentAlpha;

    if (performanceLevel === PerformanceLevel.NORMAL) {
      context.fillStyle = playerColor;
      context.filter = "blur(25px)";

      context.beginPath();
      context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      context.fill();
    } else {
      context.translate(centerX, centerY);
      context.scale(1, radiusY / radiusX);

      const gradient = context.createRadialGradient(
        0,
        0,
        radiusX * 0.4,
        0,
        0,
        radiusX,
      );
      gradient.addColorStop(0, playerColor);
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      context.fillStyle = gradient;
      context.beginPath();
      context.arc(0, 0, radiusX, 0, Math.PI * 2);
      context.fill();
    }
  } finally {
    context.restore();
  }
}
