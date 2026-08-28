import { PerformanceLevel } from "../base";
import { Settings } from "../settings";

// --- State Variables/functions ---

/**
 * Updates the member number of the player currently hovered on the map or chat canvas.
 * @param {number | null} id - The MemberNumber of the hovered character, or null to clear.
 */
export function setHoveredMapPlayer(id: number | null): void {
  hoveredMapPlayer = id;
}

/**
 * Updates the member number of the player locked via tap/click tracking.
 * @param {number | null} id - The MemberNumber of the locked character, or null to clear.
 */
export function setTrackedMapPlayer(id: number | null): void {
  trackedMapPlayer = id;
}

/** Tracks if the mouse is physically over the game canvas (not an HTML UI overlay or off-screen) */
export let isMouseOverCanvas: boolean = false;
export function setIsMouseOverCanvas(value: boolean) {
  isMouseOverCanvas = value;
}

/** The player currently hovered on the main canvas (to sync to DOM) */
export let canvasHoveredPlayer: number | null = null;
export function setCanvasHoveredPlayer(id: number | null) {
  canvasHoveredPlayer = id;
}

/** Temporary variable to calculate the top-most hovered player per frame */
export let currentFrameHoveredPlayer: number | null = null;
export function setCurrentFrameHoveredPlayer(id: number | null) {
  currentFrameHoveredPlayer = id;
}

/** Which player are we hovering over in the chat log */
export let chatLogHoveredPlayer: number | null = null;
export function setChatLogHoveredPlayer(id: number | null) {
  chatLogHoveredPlayer = id;
}

/** The member number of the player currently hovered on the map. */
export let hoveredMapPlayer: number | null = null;

/** The member number of the player currently locked via tap/click (Mobile Friendly). */
export let trackedMapPlayer: number | null = null;

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

export function setDeferredIndicator(indicator: typeof deferredIndicator) {
  deferredIndicator = indicator;
}

// --- Tracking Handlers ---

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

// --- Roster Card Hover Handlers ---

/**
 * Handler for when a player's entry is hovered in the roster UI.
 * Evaluates the current pageShiftMode setting to determine the interaction response.
 * @param {string} playerId - The ID of the hovered player.
 */
export function onPlayerHover(playerId: string): void {
  if (trackedMapPlayer !== null || !playerId) return;

  const id = parseInt(playerId, 10);
  if (!isNaN(id)) {
    hoveredMapPlayer = id;

    // ONLY return early here so we don't start the pagination timer
    if (!Settings.instance.data.pageFocusHover) return;

    if (hoverTimeout) {
      window.clearTimeout(hoverTimeout);
    }

    // Enforce the 500ms delay for auto-pagination
    hoverTimeout = window.setTimeout(() => {
      autoPaginateToPlayer(id);
    }, 500);
  }
}

/**
 * Handler for when a player's entry is no longer hovered.
 * Clears active hover states and cancels any pending delayed shifts.
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
  // Clicks should always work instantly, overriding any hover delays
  const id = parseInt(playerId, 10);
  if (!isNaN(id)) {
    autoPaginateToPlayer(id);
  }
}

// --- DOM Sync ---

/**
 * Applies a simulated CSS hover state to a player's roster card and scrolls it into view.
 * @param memberNumber - The ID of the hovered player, or null to clear.
 */
export function syncCanvasHoverToDOM(memberNumber: number | null): void {
  // Clear existing simulated hovers
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

      // Only scroll if the setting is enabled AND the card is inside the Drawer
      const isInsideDrawer = card.closest("#CRABS_Drawer_Roster") !== null;

      if (isInsideDrawer && Settings.instance.data.autoScrollRoster) {
        // Wait 150ms before scrolling to prevent rapid-wiggle spam
        scrollTimeout = window.setTimeout(() => {
          card.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 150);
      }
    }
  }
}

// --- Pagination ---

/**
 * Reverse Compass
 * Automatically switches the base game's ChatRoom pagination to the page
 * containing the targeted player, accounting for mods that alter visual order.
 * @param targetId The MemberNumber of the player to locate.
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

// --- Rendering / Visual Math ---

/**
 * Extracts a combined string of all active and forced poses for a character.
 */
export function getCharacterPoseString(character: any): string {
  const poses = new Set<string>();

  if (Array.isArray(character.ActivePose))
    character.ActivePose.forEach((p: string) => poses.add(p));
  else if (character.ActivePose) poses.add(String(character.ActivePose));

  if (Array.isArray(character.Pose))
    character.Pose.forEach((p: string) => poses.add(p));
  else if (character.Pose) poses.add(String(character.Pose));

  // Scan appearance for furniture/items forcing a pose (e.g. Petbed)
  if (Array.isArray(character.Appearance)) {
    character.Appearance.forEach((item: any) => {
      if (item.Property?.Type) poses.add(String(item.Property.Type));

      if (Array.isArray(item.Property?.Pose))
        item.Property.Pose.forEach((p: string) => poses.add(p));
      else if (item.Property?.Pose) poses.add(String(item.Property.Pose));

      if (Array.isArray(item.Asset?.SetPose))
        item.Asset.SetPose.forEach((p: string) => poses.add(p));
      else if (item.Asset?.SetPose) poses.add(String(item.Asset.SetPose));
    });
  }

  return Array.from(poses).join(" ");
}

/**
 * Renders a 3D-spinning directional arrow indicator on the canvas.
 * The arrow is natively drawn pointing right (0 radians); use the angle parameter to reorient.
 * Applies a continuous Y-axis squish to simulate a barrel roll, complete with dynamic specular highlights and shadows.
 * @param {CanvasRenderingContext2D} context - The 2D rendering context of the target canvas.
 * @param {number} x - The absolute X coordinate on the canvas to place the center of the indicator.
 * @param {number} y - The absolute Y coordinate on the canvas to place the center of the indicator.
 * @param {number} angle - The rotation angle in radians (e.g., Math.PI / 2 points it downwards).
 * @param {number} scale - The uniform scaling multiplier for the indicator's size.
 * @param {string} color - The CSS color string used to fill the base of the arrow.
 * @param {boolean} isDark - True if the base color is dark; toggles the outline stroke to white for contrast.
 * @returns {void}
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

    // 1. Prevent absolute zero scale so it snaps through the middle
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
    // 2. Thicken the outline dynamically as it flattens to create a "bulge"
    context.lineWidth = 1.5 / scale + (1 - absRoll) * 2.5;
    context.stroke();
  } finally {
    context.restore();
  }
}

/**
 * Draws a directional arrow pointing toward the hovered player on the map.
 * @param {Function} getColorBrightness - Helper callback to calculate perceived brightness.
 * @returns {void}
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
  const scale = 0.66; // Locked base size

  const range = globalWindow.ChatRoomMapViewPerceptionRange;
  const tileW = 1000 / (range * 2 + 1);
  const tileIndex =
    target.MapData.Pos.X +
    target.MapData.Pos.Y * globalWindow.ChatRoomMapViewWidth;
  const isVisible =
    globalWindow.ChatRoomMapViewVisibilityMask &&
    globalWindow.ChatRoomMapViewVisibilityMask[tileIndex];

  if (Math.abs(deltaX) <= range && Math.abs(deltaY) <= range && isVisible) {
    angle = Math.PI / 2; // Point down

    arrowX = (deltaX + range) * tileW + tileW / 2;

    // Fetch the target's current pose
    const poseStr = getCharacterPoseString(target);

    // Determine scale multiplier based on pose
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
      // INCREASED from 0.65 to 0.85.
      // A larger scale subtracts more from the bottom Y coordinate,
      // pushing the arrow further UP the screen.
      poseScale = 0.75;
    }

    // Anchor calculation from the bottom (feet) of the tile instead of the top
    const tileTop = (deltaY + range) * tileW;
    const tileBottom = tileTop + tileW;

    // Character sprites are ~1.67x the height of a tile. Scale that height by the pose.
    const headY = tileBottom - tileW * 1.67 * poseScale;

    // Set final arrowY position
    arrowY = headY - 20 * scale - 5;
  } else {
    angle = Math.atan2(deltaY, deltaX); // Point toward the edge
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
 * Renders the custom indicator arrow to the left of the character's nameplate in normal rooms.
 * @param {any} character - The character to draw next to.
 * @param {number} x - Target screen X coordinate.
 * @param {number} y - Target screen Y coordinate.
 * @param {Function} getColorBrightness - Helper callback to calculate perceived brightness.
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

  const currentName = (window as any)
    .CharacterNickname(character)
    .normalize("NFKC");
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

  // Assume default positioning (Left side, pointing Right)
  let angle = 0;
  let tipX = x - textWidth / 2 - padding;
  let finalArrowX = tipX - arrowWidth / 2;

  // Is the back of the arrow going to clip past the left edge of the screen (0)?
  // We use 10px as a safe margin so it doesn't scrape the absolute edge.
  if (finalArrowX - arrowWidth / 2 < 10) {
    // Flip to the Right side, pointing Left (<)
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
 * Renders a continuous, pulsating aura behind a targeted character on the main screen.
 * This effect is drawn before the character model to ensure it appears behind them.
 * @param {any} character - The character object to reference for colors.
 * @param {number} drawX - The base X coordinate where the character is being drawn.
 * @param {number} drawY - The base Y coordinate where the character is being drawn.
 * @param {number} zoom - The current zoom/scaling factor of the room.
 * @param {PerformanceLevel} performanceLevel - The active performance throttling profile.
 * @returns {void}
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

  // Default to the static, higher-visibility alpha for LOW performance
  let currentAlpha = 0.5;

  if (performanceLevel === PerformanceLevel.CRITICAL) {
    // Dimmer static alpha to save maximum processing power
    currentAlpha = 0.25;
  } else if (performanceLevel === PerformanceLevel.NORMAL) {
    // Full pulsating math for high-performance mode
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
      // --- The original heavy blur effect ---
      context.fillStyle = playerColor;
      context.filter = "blur(25px)";

      context.beginPath();
      context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      context.fill();
    } else {
      // --- The lightweight gradient fallback ---
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
