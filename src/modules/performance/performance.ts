// src/modules/performance.ts

import { CRABS_Base, PerformanceLevel } from "../base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Settings } from "../settings";

export class Performance extends CRABS_Base {
  private originalRefreshRates: Record<string, number> = {};
  private rafId: number = 0;
  private lastEvalTime: number = performance.now();
  private frameCount: number = 0;

  // Configurable thresholds
  private readonly EVAL_INTERVAL_MS = 2000;
  private readonly LAG_TOLERANCE = 1.4; // 40% slower than expected frame time triggers degradation

  constructor(CRABS: ModSDKModAPI) {
    super(CRABS);
    this.initVFXRegistry();
    this.startPrecisionMonitor();
    this.setupBaseGameMemoryPruning();
  }

  private initVFXRegistry(): void {
    const globalWindow = window as any;
    if (globalWindow.DrawSkipVFX) {
      globalWindow.DrawSkipVFX.register((_module: string, _screen: string) => {
        // Tier 1: Mod-only non-intrusive performance saving
        if (!Settings.instance.data.enablePerformanceMode) return false;
        return CRABS_Base.currentPerformanceLevel !== PerformanceLevel.NORMAL;
      });
    }
  }

  private getTargetFps(): number {
    const globalWindow = window as any;
    const nativeMax = globalWindow.Player?.GraphicsSettings?.MaxFPS;
    return nativeMax && nativeMax > 0 ? nativeMax : 60;
  }

  private startPrecisionMonitor(): void {
    const loop = () => {
      this.rafId = requestAnimationFrame(loop);

      // If the user alt-tabs, the browser throttles rAF. Ignore this entirely.
      if (document.hidden) {
        this.lastEvalTime = performance.now();
        this.frameCount = 0;
        return;
      }

      this.frameCount++;
      const now = performance.now();
      const elapsed = now - this.lastEvalTime;

      if (elapsed >= this.EVAL_INTERVAL_MS) {
        this.evaluatePerformance(elapsed, this.frameCount);
        this.lastEvalTime = now;
        this.frameCount = 0;
      }
    };

    this.rafId = requestAnimationFrame(loop);
  }

  private evaluatePerformance(elapsedMs: number, framesRendered: number): void {
    if (!Settings.instance.data.enablePerformanceMode) {
      this.setPerformanceLevel(PerformanceLevel.NORMAL);
      return;
    }

    const targetFps = this.getTargetFps();

    // Calculate expected frame time vs actual frame time
    const expectedFrameTime = 1000 / targetFps;
    const actualFrameTime = elapsedMs / framesRendered;

    // If actual frame time is significantly worse than what the user asked for
    if (actualFrameTime > expectedFrameTime * this.LAG_TOLERANCE * 1.5) {
      this.setPerformanceLevel(PerformanceLevel.CRITICAL);
    } else if (actualFrameTime > expectedFrameTime * this.LAG_TOLERANCE) {
      this.setPerformanceLevel(PerformanceLevel.LOW);
    } else {
      this.setPerformanceLevel(PerformanceLevel.NORMAL);
    }
  }

  private setPerformanceLevel(level: PerformanceLevel): void {
    if (CRABS_Base.currentPerformanceLevel === level) return;
    CRABS_Base.currentPerformanceLevel = level;

    if (Performance.debugMode) {
      console.log(`[CRABS Perf] Shifted to: ${level}`);
    }

    // Apply Tier 2 Opt-In Base Game optimizations
    if (Settings.instance.data.enableAggressiveBaseGameOptimization) {
      this.applyBaseGameOptimizations(level);
    }
  }

  /**
   * Call whenever the user changes performance settings in the preference menu.
   */
  public onSettingsChanged(): void {
    if (!Settings.instance.data.enableAggressiveBaseGameOptimization) {
      // Force restore any modified refresh rates immediately
      this.restoreOriginalRefreshRates();
    } else {
      // Re-apply current tier if enabled mid-session
      this.applyBaseGameOptimizations(CRABS_Base.currentPerformanceLevel);
    }
  }

  private restoreOriginalRefreshRates(): void {
    const globalWindow = window as any;
    const animStorage = globalWindow.AnimationPersistentStorage;
    const animTypes = globalWindow.AnimationDataTypes;

    if (!animStorage || !animTypes || !animStorage[animTypes.RefreshRate])
      return;
    const refreshRates = animStorage[animTypes.RefreshRate];

    for (const charKey in this.originalRefreshRates) {
      if (refreshRates[charKey] !== undefined) {
        refreshRates[charKey] = this.originalRefreshRates[charKey];
      }
    }
    this.originalRefreshRates = {};
  }

  private applyBaseGameOptimizations(level: PerformanceLevel): void {
    const globalWindow = window as any;
    const animStorage = globalWindow.AnimationPersistentStorage;
    const animTypes = globalWindow.AnimationDataTypes;

    // 1. Manage Base Game Cache/Memory
    if (level === PerformanceLevel.CRITICAL) {
      if (globalWindow.GLDrawCache) {
        globalWindow.GLDrawCache = new Map(); // Force clear drawing cache
      }
    }

    // 2. Manage Animation Refresh Rates
    if (!animStorage || !animTypes || !animStorage[animTypes.RefreshRate])
      return;
    const refreshRates = animStorage[animTypes.RefreshRate];

    if (level === PerformanceLevel.NORMAL) {
      // Restore original animation speeds
      for (const charKey in this.originalRefreshRates) {
        if (refreshRates[charKey] !== undefined) {
          refreshRates[charKey] = this.originalRefreshRates[charKey];
        }
      }
      this.originalRefreshRates = {};
      return;
    }

    // Map severity: LOW = 50ms (20fps anims), CRITICAL = 100ms (10fps anims)
    const targetRate = level === PerformanceLevel.CRITICAL ? 100 : 50;

    for (const charKey in refreshRates) {
      if (refreshRates[charKey] < targetRate) {
        if (this.originalRefreshRates[charKey] === undefined) {
          this.originalRefreshRates[charKey] = refreshRates[charKey];
        }
        refreshRates[charKey] = targetRate;
      }
    }
  }

  // Inspect and manage memory
  public inspectBaseGameMemory(): void {
    const g = window as any;

    const stats: Record<string, number> = {};

    // Base-game drawing/canvas caches
    if (g.DrawCacheImage && typeof g.DrawCacheImage === "object") {
      stats["DrawCacheImage Keys"] = Object.keys(g.DrawCacheImage).length;
    }
    if (g.GLDrawImageCache && typeof g.GLDrawImageCache === "object") {
      stats["GLDrawImageCache Keys"] = Object.keys(g.GLDrawImageCache).length;
    }
    if (
      g.AnimationPersistentStorage &&
      typeof g.AnimationPersistentStorage === "object"
    ) {
      stats["AnimationStorage Keys"] = Object.keys(
        g.AnimationPersistentStorage,
      ).length;
    }
    if (
      g.DrawImageBuilderCache &&
      typeof g.DrawImageBuilderCache === "object"
    ) {
      stats["DrawImageBuilderCache Keys"] = Object.keys(
        g.DrawImageBuilderCache,
      ).length;
    }

    // Measure active DOM canvases/images
    stats["DOM Canvas Elements"] = document.querySelectorAll("canvas").length;
    stats["DOM Img Elements"] = document.querySelectorAll("img").length;

    console.table(stats);
  }

  public setupBaseGameMemoryPruning(): void {
    // When leaving a room, purge asset caches
    this.safeHook("ChatRoomLeave", 0, (args, next) => {
      const result = next(args);

      // Execute cache purge
      this.pruneBaseGameCaches();

      return result;
    });

    // When navigating major screens (e.g. from Main Hall to Wardrobe/Chat)
    this.safeHook("CommonSetScreen", 0, (args, next) => {
      const result = next(args);

      if (CRABS_Base.currentPerformanceLevel === PerformanceLevel.CRITICAL) {
        this.pruneBaseGameCaches();
      }

      return result;
    });
  }

  public pruneBaseGameCaches(): void {
    const g = window as any;

    try {
      // 1. Native WebGL Cache Clear (if supported by base game)
      if (typeof g.GLDrawClearCache === "function") {
        g.GLDrawClearCache();
      }

      // 2. Clear standard 2D Draw Caches if they exist
      if (g.DrawCacheImage && typeof g.DrawCacheImage === "object") {
        // Optional: iterate through canvases to zero dimensions before clearing
        for (const key in g.DrawCacheImage) {
          const item = g.DrawCacheImage[key];
          if (item?.canvas instanceof HTMLCanvasElement) {
            item.canvas.width = 0;
            item.canvas.height = 0;
          }
        }
        g.DrawCacheImage = {};
      }

      // 3. Clear temporary image builder buffers
      if (
        g.DrawImageBuilderCache &&
        typeof g.DrawImageBuilderCache === "object"
      ) {
        g.DrawImageBuilderCache = {};
      }

      if (CRABS_Base.debugMode) {
        console.log("[CRABS] Base game asset caches pruned.");
      }
    } catch (err) {
      console.error("[CRABS] Failed to prune base game caches:", err);
    }
  }

  public stop(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }
}
