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

				// Guard: If user intentionally capped game to <= 15fps, never flag as lagging
				if (targetFps <= 15) {
					this.currentPerformanceLevel = PerformanceLevel.NORMAL;
					return;
				}

				// Relative Buckets for VFX dropping
				if (this.currentActualFps < (targetFps * 0.3) || this.currentActualFps < 15) {
					this.currentPerformanceLevel = PerformanceLevel.CRITICAL;
					this.lastLagSpike = Date.now();
				} else if (this.currentActualFps < (targetFps * 0.6)) {
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

			// Calculate activation threshold (50% of targeted performance, e.g., below 30fps out of 60)
			const activationThreshold = targetFps * 0.5;

			// 1. RESTORE STATE: If mod is off, target is ultra-low, or FPS is healthy
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
			// Normalize where we sit between the threshold (start of lag) and absolute floor (10 FPS)
			const floorFps = 10;
			const totalRange = activationThreshold - floorFps;
			const currentDeficit = activationThreshold - this.currentActualFps;

			// Percentage of how close we are to rock-bottom (0.0 = just started lagging, 1.0 = dead)
			const lagSeverity = Math.min(1, Math.max(0, currentDeficit / (totalRange || 1)));

			// Map linearly: 0% severity = 100ms cap (10 FPS). 100% severity = 5000ms cap (Frozen/Off)
			const minRate = Math.floor(100 + (lagSeverity * 4900));

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
