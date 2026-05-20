// src/modules/performance.ts

import { CRABS_Base, PerformanceLevel } from "./base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Settings } from "./settings";

export class Performance extends CRABS_Base {
	// Dictionary to backup the original animation speeds
	private originalRefreshRates: Record<string, number> = {};

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

	private startPassiveMonitor(): void {
		setInterval(() => {
			if (!Settings.instance.data.enablePerformanceMode) return;

			const globalWindow = window as any;
			const interval = globalWindow.TimerRunInterval;

			if (interval && interval > 0) {
				const actualFps = 1000 / interval;

				this.currentPerformanceLevel = actualFps < 15 ? PerformanceLevel.CRITICAL :
					actualFps < 30 ? PerformanceLevel.LOW :
						PerformanceLevel.NORMAL;
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

			// Restore state: If performance mode is off, or lag is gone
			if (!Settings.instance.data.enablePerformanceMode || this.currentPerformanceLevel === PerformanceLevel.NORMAL) {
				// If we have backups, restore them!
				if (Object.keys(this.originalRefreshRates).length > 0) {
					for (const charKey in this.originalRefreshRates) {
						// Ensure the character's animation data still exists in the room
						if (refreshRates[charKey] !== undefined) {
							refreshRates[charKey] = this.originalRefreshRates[charKey];
						}
					}
					// Wipe the backups so we don't restore them again
					this.originalRefreshRates = {};
				}
				return; // Bail out now that things are clean
			}

			// Clamp state: If we are lagging
			const minRate = this.currentPerformanceLevel === PerformanceLevel.CRITICAL ? 500 : 150;

			for (const charKey in refreshRates) {
				if (refreshRates[charKey] < minRate) {
					// Backup the original fast speed before we overwrite it (if not already backed up)
					if (this.originalRefreshRates[charKey] === undefined) {
						this.originalRefreshRates[charKey] = refreshRates[charKey];
					}
					// Apply the throttled speed
					refreshRates[charKey] = minRate;
				}
			}
		}, 3000);
	}
}
