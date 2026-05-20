// src/modules/performance.ts

import { CRABS_Base, PerformanceLevel } from "./base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Settings } from "./settings";

export class Performance extends CRABS_Base {
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
			if (!Settings.instance.data.enablePerformanceMode || this.currentPerformanceLevel === PerformanceLevel.NORMAL) return;

			const globalWindow = window as any;
			const animStorage = globalWindow.AnimationPersistentStorage;
			const animTypes = globalWindow.AnimationDataTypes;

			if (animStorage && animTypes && animStorage[animTypes.RefreshRate]) {
				const refreshRates = animStorage[animTypes.RefreshRate];
				const minRate = this.currentPerformanceLevel === PerformanceLevel.CRITICAL ? 500 : 150;

				for (const charKey in refreshRates) {
					if (refreshRates[charKey] < minRate) {
						refreshRates[charKey] = minRate;
					}
				}
			}
		}, 3000);
	}
}
