export enum PerformanceLevel {
  NORMAL = 0, // > 30 FPS
  LOW = 1, // 15 - 30 FPS
  CRITICAL = 2, // < 15 FPS
}

export class PerformanceTracker {
  public currentLevel: PerformanceLevel = PerformanceLevel.NORMAL;
  private stabilityCounter: number = 0;
  private readonly STABILITY_THRESHOLD: number = 60;

  /**
   * Checks game performance and throttles quality level if FPS drops.
   * @param debugMode Whether to log performance tier changes to console.
   */
  public update(debugMode: boolean = false): void {
    const globalWindow = window as any;
    const interval = globalWindow.TimerRunInterval;
    if (!interval || interval <= 0) return;

    const actualFps = 1000 / interval;
    let targetLevel = PerformanceLevel.NORMAL;

    if (actualFps < 10) {
      targetLevel = PerformanceLevel.CRITICAL;
    } else if (actualFps < 25) {
      const targetFps = globalWindow.TimerLimit || 60;
      const perfRatio = actualFps / targetFps;

      if (perfRatio < 0.6) {
        targetLevel = PerformanceLevel.CRITICAL;
      } else if (perfRatio < 0.9) {
        targetLevel = PerformanceLevel.LOW;
      }
    }

    if (targetLevel !== this.currentLevel) {
      // Degrade fast (5 frames), Recover slow (60 frames)
      const threshold =
        targetLevel > this.currentLevel ? 5 : this.STABILITY_THRESHOLD;

      this.stabilityCounter++;

      if (this.stabilityCounter >= threshold) {
        this.currentLevel = targetLevel;
        this.stabilityCounter = 0;

        if (debugMode) {
          console.log(
            `CRABS Performance Shift: ${this.currentLevel} (Actual: ${Math.round(actualFps)} FPS)`,
          );
        }
      }
    } else {
      this.stabilityCounter = 0;
    }
  }
}
