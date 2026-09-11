/**
 * CRABS Performance Module
 *
 * Real-time framerate and system load monitoring, exponential moving average (EWMA)
 * workload analysis, automatic animation throttling, and base-game canvas/memory pruning.
 *
 * @module performance
 */

import { CRABS_Base, PerformanceLevel } from "../base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Settings } from "../settings/settings";

/**
 * Performance monitor and optimization manager.
 *
 * Tracks framerate anomalies using a `requestAnimationFrame` loop, updates 1m/5m/15m
 * exponential moving averages (EWMA) of engine frame delta times, dynamically steps down
 * character animation refresh frequencies under load, and purges WebGL/2D canvas caches
 * during scene transitions.
 */
export class Performance extends CRABS_Base {
  /** Map of character keys to their original unthrottled animation refresh interval (ms). */
  private originalRefreshRates: Record<string, number> = {};

  /** Handle returned by `requestAnimationFrame` for loop cancellation. */
  private rafId: number = 0;

  /** Timestamp (epoch ms) marking the beginning of the current sample window. */
  private lastEvalTime: number = performance.now();

  /** Total frames drawn within the current evaluation window. */
  private frameCount: number = 0;

  /** Sample evaluation window duration (ms). */
  private readonly SAMPLE_INTERVAL_MS = 2000;

  /** Base cooldown (ms) required before recovering to a higher performance tier (5 min). */
  private readonly BASE_RECOVERY_COOLDOWN_MS = 5 * 60 * 1000;

  /** Upper ceiling for recovery cooldown (ms) when anti-flap penalties escalate (15 min). */
  private readonly MAX_RECOVERY_COOLDOWN_MS = 15 * 60 * 1000;

  /** Normalized load threshold triggering the LOW performance tier (~48 FPS at 60Hz target). */
  private readonly LOAD_LOW = 1.25;

  /** Normalized load threshold triggering the CRITICAL tier (~37 FPS at 60Hz target). */
  private readonly LOAD_CRITICAL = 1.6;

  /** Maximum load threshold allowed across all windows to permit tier recovery. */
  private readonly LOAD_RECOVERY = 1.08;

  /** 1-minute Exponential Weighted Moving Average (EWMA) of system load. */
  private load1: number = 1.0;

  /** 5-minute Exponential Weighted Moving Average (EWMA) of system load. */
  private load5: number = 1.0;

  /** 15-minute Exponential Weighted Moving Average (EWMA) of system load. */
  private load15: number = 1.0;

  /** Timestamp (epoch ms) when the active performance tier was last changed. */
  private lastStateChangeTime: number = performance.now();

  /** Counter tracking rapid tier oscillations to calculate backoff penalties. */
  private flapCount: number = 0;

  /** Current active cooldown period required before tier recovery is evaluated. */
  private recoveryCooldownMs: number = this.BASE_RECOVERY_COOLDOWN_MS;

  /**
   * Initializes the performance monitor, registers mod VFX suppression hooks,
   * launches the precision rAF loop, and hooks room navigation for cache pruning.
   *
   * @param CRABS - Instantiated ModSDK API bridge.
   */
  constructor(CRABS: ModSDKModAPI) {
    super(CRABS, "performance");
    this.initVFXRegistry();
    this.startPrecisionMonitor();
    this.setupBaseGameMemoryPruning();
  }

  /**
   * Registers a skip callback with the base game's visual effects pipeline
   * (`DrawSkipVFX`) to suppress decorative particles when performance is degraded.
   *
   * @private
   */
  private initVFXRegistry(): void {
    const g = window as any;
    if (g.DrawSkipVFX) {
      g.DrawSkipVFX.register((_module: string, _screen: string) => {
        return CRABS_Base.currentPerformanceLevel !== PerformanceLevel.NORMAL;
      });
    }
  }

  /**
   * Reads the target framerate configured in the native game graphics settings.
   *
   * @private
   * @returns Configured target FPS, defaulting to 60.
   */
  private getTargetFps(): number {
    const nativeMax = (window as any).Player?.GraphicsSettings?.MaxFPS;
    return nativeMax && nativeMax > 0 ? nativeMax : 60;
  }

  /**
   * Starts the `requestAnimationFrame` sampling loop to aggregate frame counts
   * and schedule periodic load evaluations.
   *
   * @private
   */
  private startPrecisionMonitor(): void {
    const loop = () => {
      this.rafId = requestAnimationFrame(loop);

      if (document.hidden) {
        this.lastEvalTime = performance.now();
        this.frameCount = 0;
        return;
      }

      this.frameCount++;
      const now = performance.now();
      const elapsed = now - this.lastEvalTime;

      if (elapsed >= this.SAMPLE_INTERVAL_MS) {
        this.evaluatePerformance(elapsed, this.frameCount);
        this.lastEvalTime = now;
        this.frameCount = 0;
      }
    };

    this.rafId = requestAnimationFrame(loop);
  }

  /**
   * Evaluates frame times across the elapsed sample window, calculates EWMA loads,
   * and triggers tier transitions if degradation or recovery criteria are met.
   *
   * @private
   * @param elapsedMs - Actual duration (ms) elapsed during the sample interval.
   * @param framesRendered - Number of animation frames rendered in the interval.
   */
  private evaluatePerformance(elapsedMs: number, framesRendered: number): void {
    const targetFps = this.getTargetFps();
    const expectedFrameTime = 1000 / targetFps;
    const actualFrameTime = elapsedMs / Math.max(1, framesRendered);

    // 1. THROTTLE GUARD: If frame time is absurd (> 100ms / < 10 FPS), the browser
    // is likely throttling the tab (occluded/sleeping) or there is a hard loading freeze.
    // Return early so we don't poison the moving averages.
    if (actualFrameTime > 100) {
      return;
    }

    // 2. CLAMP INSTANT LOAD: Cap the max penalty at 2.5x load.
    // This prevents moderate spikes from mathematically ruining the EWMA for minutes.
    const instantLoad = Math.min(actualFrameTime / expectedFrameTime, 2.5);

    // Update Exponential Moving Averages
    const sampleSec = elapsedMs / 1000;
    this.load1 = this.calcEwma(this.load1, instantLoad, sampleSec, 60);
    this.load5 = this.calcEwma(this.load5, instantLoad, sampleSec, 300);
    this.load15 = this.calcEwma(this.load15, instantLoad, sampleSec, 900);

    const now = performance.now();
    const currentTier = CRABS_Base.currentPerformanceLevel;

    // DEGRADATION: Rely purely on the 1-minute moving average (load1)
    if (this.load1 >= this.LOAD_CRITICAL) {
      this.transitionPerformance(PerformanceLevel.CRITICAL, now);
      return;
    }

    if (this.load1 >= this.LOAD_LOW) {
      if (currentTier !== PerformanceLevel.CRITICAL) {
        this.transitionPerformance(PerformanceLevel.LOW, now);
      }
      return;
    }

    // RECOVERY: Requires sustained health on 5m and 15m averages
    if (currentTier !== PerformanceLevel.NORMAL) {
      const timeInTier = now - this.lastStateChangeTime;

      if (
        timeInTier >= this.recoveryCooldownMs &&
        this.load1 <= this.LOAD_RECOVERY &&
        this.load5 <= this.LOAD_RECOVERY &&
        this.load15 <= this.LOAD_RECOVERY
      ) {
        const nextTier =
          currentTier === PerformanceLevel.CRITICAL
            ? PerformanceLevel.LOW
            : PerformanceLevel.NORMAL;

        this.transitionPerformance(nextTier, now, true);
      }
    }
  }

  /**
   * Computes an Exponentially Weighted Moving Average (EWMA).
   *
   * @private
   * @param prev - Previous moving average value.
   * @param current - Current instantaneous measurement.
   * @param dt - Delta time elapsed since the previous sample (seconds).
   * @param windowSec - Time constant / smoothing half-life window (seconds).
   * @returns Computed moving average.
   */
  private calcEwma(
    prev: number,
    current: number,
    dt: number,
    windowSec: number,
  ): number {
    const alpha = 1 - Math.exp(-dt / windowSec);
    return prev + alpha * (current - prev);
  }

  /**
   * Transitions the active performance level, adjusts anti-flap penalties,
   * and applies or relaxes game animation throttling.
   *
   * @private
   * @param newLevel - Target tier level.
   * @param now - Current timestamp (epoch ms).
   * @param isRecovery - True if transitioning upward toward NORMAL performance.
   */
  private transitionPerformance(
    newLevel: PerformanceLevel,
    now: number,
    isRecovery = false,
  ): void {
    const oldLevel = CRABS_Base.currentPerformanceLevel;
    if (oldLevel === newLevel) return;

    if (!isRecovery) {
      // Degraded again quickly -> penalize with increased hold times
      if (now - this.lastStateChangeTime < this.BASE_RECOVERY_COOLDOWN_MS * 2) {
        this.flapCount++;
        this.recoveryCooldownMs = Math.min(
          this.BASE_RECOVERY_COOLDOWN_MS * (1 + this.flapCount * 0.5),
          this.MAX_RECOVERY_COOLDOWN_MS,
        );
      }
    } else {
      // Successful sustained recovery gradually bleeds flap penalties
      this.flapCount = Math.max(0, this.flapCount - 1);
    }

    CRABS_Base.currentPerformanceLevel = newLevel;
    this.lastStateChangeTime = now;

    if (Settings.instance.data.enablePerformanceMode) {
      this.applyBaseGameOptimizations(newLevel);
    }
  }

  /**
   * Synchronization handler triggered when user performance preferences change.
   *
   * Restores unthrottled animation rates if performance mode was disabled,
   * or applies optimizations matching the active performance level.
   */
  public onSettingsChanged(): void {
    if (!Settings.instance.data.enablePerformanceMode) {
      this.restoreOriginalRefreshRates();
    } else {
      this.applyBaseGameOptimizations(CRABS_Base.currentPerformanceLevel);
    }
  }

  /**
   * Restores all throttled character animation refresh intervals stored in
   * `AnimationPersistentStorage` back to their initial game defaults.
   *
   * @private
   */
  private restoreOriginalRefreshRates(): void {
    const g = window as any;
    const animStorage = g.AnimationPersistentStorage;
    const animTypes = g.AnimationDataTypes;

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

  /**
   * Applies character animation frame rate caps to native persistent storage.
   *
   * Clamps intervals to 50ms (20 FPS) for {@link PerformanceLevel.LOW} and
   * 100ms (10 FPS) for {@link PerformanceLevel.CRITICAL}.
   *
   * @private
   * @param level - Active performance tier governing the throttle cap.
   */
  private applyBaseGameOptimizations(level: PerformanceLevel): void {
    const g = window as any;
    const animStorage = g.AnimationPersistentStorage;
    const animTypes = g.AnimationDataTypes;

    if (!animStorage || !animTypes || !animStorage[animTypes.RefreshRate])
      return;
    const refreshRates = animStorage[animTypes.RefreshRate];

    if (level === PerformanceLevel.NORMAL) {
      this.restoreOriginalRefreshRates();
      return;
    }

    // Clamp refresh rates (LOW = 50ms / 20fps, CRITICAL = 100ms / 10fps)
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

  /**
   * Hooks core game room exits and screen transitions to trigger memory garbage
   * collection and prevent long-session canvas/RAM bloat.
   */
  public setupBaseGameMemoryPruning(): void {
    // Purge assets on room transitions to fix cumulative asset/RAM bloat
    this.safeHook("ChatRoomLeave", 0, (args, next) => {
      const result = next(args);
      this.pruneBaseGameCaches();
      return result;
    });

    this.safeHook("CommonSetScreen", 0, (args, next) => {
      const result = next(args);
      // Prune if moving across major boundaries
      this.pruneBaseGameCaches();
      return result;
    });
  }

  /**
   * Clears native 2D canvas caches, WebGL image builder caches, and shrinks
   * lingering backing canvas dimensions to force VRAM reclamation.
   */
  public pruneBaseGameCaches(): void {
    const g = window as any;
    try {
      if (typeof g.GLDrawClearCache === "function") {
        g.GLDrawClearCache();
      }

      if (g.DrawCacheImage && typeof g.DrawCacheImage === "object") {
        for (const key in g.DrawCacheImage) {
          const item = g.DrawCacheImage[key];
          if (item?.canvas instanceof HTMLCanvasElement) {
            item.canvas.width = 0;
            item.canvas.height = 0;
          }
        }
        g.DrawCacheImage = {};
      }

      if (
        g.DrawImageBuilderCache &&
        typeof g.DrawImageBuilderCache === "object"
      ) {
        g.DrawImageBuilderCache = {};
      }
    } catch (err) {
      console.error("[CRABS] Cache prune failed:", err);
    }
  }

  /**
   * Retrieves current performance tier states, target FPS, and EWMA load metrics.
   *
   * @returns Snapshot of active performance and anti-flap metrics.
   */
  public getPerformanceStats(): {
    level: string;
    targetFps: number;
    load1: string;
    load5: string;
    load15: string;
    flapCount: number;
    cooldownSec: number;
  } {
    const levelNames = ["NORMAL", "LOW", "CRITICAL"];
    return {
      level: levelNames[CRABS_Base.currentPerformanceLevel] || "UNKNOWN",
      targetFps: this.getTargetFps(),
      load1: this.load1.toFixed(2),
      load5: this.load5.toFixed(2),
      load15: this.load15.toFixed(2),
      flapCount: this.flapCount,
      cooldownSec: Math.round(this.recoveryCooldownMs / 1000),
    };
  }

  /**
   * Inspects and returns diagnostic memory metrics across native image caches,
   * DOM canvas counts, and the Chromium V8 heap (when supported), printing a summary table to the console.
   *
   * @returns Key-value dictionary of memory indicators and heap statistics.
   */
  public inspectBaseGameMemory(): Record<string, number | string> {
    const g = window as any;
    const stats: Record<string, number | string> = {};

    // 1. Caches & Storage counts
    stats["DrawCacheImage Entries"] =
      g.DrawCacheImage && typeof g.DrawCacheImage === "object"
        ? Object.keys(g.DrawCacheImage).length
        : 0;

    stats["GLDrawImageCache Entries"] =
      g.GLDrawImageCache && typeof g.GLDrawImageCache === "object"
        ? Object.keys(g.GLDrawImageCache).length
        : 0;

    stats["AnimationStorage Keys"] =
      g.AnimationPersistentStorage &&
      typeof g.AnimationPersistentStorage === "object"
        ? Object.keys(g.AnimationPersistentStorage).length
        : 0;

    stats["ImageBuilder Cache"] =
      g.DrawImageBuilderCache && typeof g.DrawImageBuilderCache === "object"
        ? Object.keys(g.DrawImageBuilderCache).length
        : 0;

    // 2. DOM Elements
    stats["DOM Canvases"] = document.querySelectorAll("canvas").length;
    stats["DOM Img Elements"] = document.querySelectorAll("img").length;

    // 3. JS Heap Memory (if Chromium / supported)
    if (performance && (performance as any).memory) {
      const mem = (performance as any).memory;
      stats["JS Heap Used"] =
        `${(mem.usedJSHeapSize / (1024 * 1024)).toFixed(1)} MB`;
      stats["JS Heap Total"] =
        `${(mem.totalJSHeapSize / (1024 * 1024)).toFixed(1)} MB`;
      stats["JS Heap Limit"] =
        `${(mem.jsHeapSizeLimit / (1024 * 1024)).toFixed(1)} MB`;
    }

    console.table(stats);
    return stats;
  }

  /**
   * Stops the `requestAnimationFrame` evaluation loop.
   */
  public stop(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }
}
