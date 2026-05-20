// src/modules/performance.ts

import { CRABS_Base, PerformanceLevel } from "./base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Settings } from "./settings";

export class Performance extends CRABS_Base {
	private originalRefreshRates: Record<string, number> = {};
	private lastLagSpike: number = 0;
	private currentActualFps: number = 60;

	constructor(CRABS: ModSDKModAPI) {
		super(CRABS);
		this.initVFXRegistry();
		this.startPassiveMonitor();
		this.startAnimationClamper();
	}

	private initVFXRegistry(): void {
		const globalWindow = window as any;
		if (globalWindow.DrawSkipVFX) {
			globalWindow.DrawSkipVFX.register((_module: string, _screen: string) => {
				if (!Settings.instance.data.enablePerformanceMode) return false;
				return this.currentPerformanceLevel === PerformanceLevel.CRITICAL;
			});
		}
	}

	private getTargetFps(): number {
		const globalWindow = window as any;
		// Grab native FPS cap if it exists. Default to 60 if "Unlimited" (0) or missing.
		const nativeMax = globalWindow.Player?.GraphicsSettings?.MaxFPS;
		return (nativeMax && nativeMax > 0) ? nativeMax : 60;
	}

	private startPassiveMonitor(): void {
		setInterval(() => {
			if (!Settings.instance.data.enablePerformanceMode) return;

			const globalWindow = window as any;
			const interval = globalWindow.TimerRunInterval;

			if (interval && interval > 0) {
				this.currentActualFps = 1000 / interval;
				const targetFps = this.getTargetFps();

				// Prioritize quality until it drops below 30 (or user's lower cap)
				const activationThreshold = Math.min(targetFps, 30);

				// Guard: If user intentionally capped game to <= 15fps, never flag as lagging
				if (targetFps <= 15) {
					this.currentPerformanceLevel = PerformanceLevel.NORMAL;
					return;
				}

				// Relative Buckets for VFX dropping based on our new 30 FPS target
				if (this.currentActualFps < (activationThreshold * 0.5)) {
					this.currentPerformanceLevel = PerformanceLevel.CRITICAL;
					this.lastLagSpike = Date.now();
				} else if (this.currentActualFps < (activationThreshold * 0.8)) {
					this.currentPerformanceLevel = PerformanceLevel.LOW;
					this.lastLagSpike = Date.now();
				} else {
					if (Date.now() - this.lastLagSpike > 10000) {
						this.currentPerformanceLevel = PerformanceLevel.NORMAL;
					}
				}
			}
		}, 2000);
	}

	private startAnimationClamper(): void {
		setInterval(() => {
			const globalWindow = window as any;
			const animStorage = globalWindow.AnimationPersistentStorage;
			const animTypes = globalWindow.AnimationDataTypes;

			if (!animStorage || !animTypes || !animStorage[animTypes.RefreshRate]) return;

			const refreshRates = animStorage[animTypes.RefreshRate];
			const targetFps = this.getTargetFps();

			// Trigger point: 30 FPS, unless the user targeted something lower
			const activationThreshold = Math.min(targetFps, 30);

			// 1. RESTORE STATE: If mod is off, target is ultra-low, or FPS is 30+
			if (
				!Settings.instance.data.enablePerformanceMode ||
				targetFps <= 15 ||
				this.currentActualFps >= activationThreshold
			) {
				if (Object.keys(this.originalRefreshRates).length > 0) {
					for (const charKey in this.originalRefreshRates) {
						if (refreshRates[charKey] !== undefined) {
							refreshRates[charKey] = this.originalRefreshRates[charKey];
						}
					}
					this.originalRefreshRates = {};
				}
				return;
			}

			// 2. TARGETED SCALING MATH:
			const floorFps = 10;
			const totalRange = Math.max(1, activationThreshold - floorFps);
			const currentDeficit = activationThreshold - this.currentActualFps;

			// Percentage of how close we are to rock-bottom (0.0 = just started lagging, 1.0 = dead)
			const lagSeverity = Math.min(1, Math.max(0, currentDeficit / totalRange));

			// Map linearly: 0% severity = 33ms (30 FPS). 100% severity = 100ms (10 FPS).
			// This is drastically less aggressive than the old 5000ms cap.
			const minRate = Math.floor(33 + (lagSeverity * 67));

			for (const charKey in refreshRates) {
				if (refreshRates[charKey] < minRate) {
					if (this.originalRefreshRates[charKey] === undefined) {
						this.originalRefreshRates[charKey] = refreshRates[charKey];
					}
					refreshRates[charKey] = minRate;
				}
			}
		}, 3000);
	}
}
