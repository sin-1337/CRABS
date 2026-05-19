// src/modules/performance.ts

import { CRABS_Base, PerformanceLevel } from "./base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Settings } from "./settings";

export class Performance extends CRABS_Base {

	constructor(CRABS: ModSDKModAPI) {
		super(CRABS);
		this.initVFXCulling();
		this.initPerformanceMonitor();
		this.startBackgroundThrottler();
	}

	private initVFXCulling(): void {
		const globalWindow = window as any;
		if (globalWindow.DrawSkipVFX) {
			// The base game uses this registry to decide if backgrounds and heavy filters should render
			globalWindow.DrawSkipVFX.register((_module: string, _screen: string) => {
				if (!Settings.instance.data.enablePerformanceMode) return false;

				// Drop VFX completely if we hit CRITICAL lag (< 15 FPS)
				return this.currentPerformanceLevel === PerformanceLevel.CRITICAL;
			});
		}
	}

	private initPerformanceMonitor(): void {
		// We still safely hook GameRun just to monitor the FPS interval
		this.safeHook("GameRun", 0, (args: any[], next: (args: any[]) => any) => {
			if (Settings.instance.data.enablePerformanceMode) {
				this.updatePerformanceState();
			}
			return next(args);
		});
	}

	private startBackgroundThrottler(): void {
		// Instead of hooking DrawCharacter (which causes canvas race conditions),
		// we asynchronously scan and clamp animation speeds in the background.
		setInterval(() => {
			if (!Settings.instance.data.enablePerformanceMode || this.currentPerformanceLevel === PerformanceLevel.NORMAL) {
				return;
			}

			const globalWindow = window as any;
			const animStorage = globalWindow.AnimationPersistentStorage;
			const animTypes = globalWindow.AnimationDataTypes;

			if (animStorage && animTypes && animStorage[animTypes.RefreshRate]) {
				const refreshRates = animStorage[animTypes.RefreshRate];

				// Cap animations to 10 FPS on LOW lag, 2 FPS on CRITICAL lag
				const minRate = this.currentPerformanceLevel === PerformanceLevel.CRITICAL ? 500 : 100;

				for (const charKey in refreshRates) {
					if (refreshRates[charKey] < minRate) {
						refreshRates[charKey] = minRate;
					}
				}
			}
		}, 2000); // Check every 2 seconds
	}
}
