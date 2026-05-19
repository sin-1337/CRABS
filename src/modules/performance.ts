// src/modules/performance.ts

import { CRABS_Base, PerformanceLevel } from "./base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Settings } from "./settings";

export class Performance extends CRABS_Base {
	constructor(CRABS: ModSDKModAPI) {
		super(CRABS);
		this.initVFXCulling();
		this.initOptimizedHooks();
	}

	private initVFXCulling(): void {
		const globalWindow = window as any;
		if (globalWindow.DrawSkipVFX) {
			globalWindow.DrawSkipVFX.register((_module: string, _screen: string) => {
				if (!Settings.instance.data.enablePerformanceMode) return false;
				return this.currentPerformanceLevel === PerformanceLevel.CRITICAL;
			});
		}
	}

	private initOptimizedHooks(): void {
		// Raw Hook on GameRun
		// By using the raw CRABS.hookFunction, we avoid the overhead of safeHook's 
		// error tracking, preventing memory bloat on the 60fps loop.
		(this.CRABS.hookFunction as any)("GameRun", 0, (args: any[], next: (args: any[]) => any) => {
			if (Settings.instance.data.enablePerformanceMode) {
				this.updatePerformanceState();
			}
			return next(args);
		});

		// Hook CharacterRefresh (The true source of animation lag)
		// We intercept the canvas rebuild request instead of the drawing loop!
		this.safeHook("CharacterRefresh", 0, (args: any[], next: (args: any[]) => any) => {
			const C = args[0];
			// Base game arguments: CharacterRefresh(C, Push, RefreshDialog)
			const push = args.length > 1 ? args[1] : false;
			const refreshDialog = args.length > 2 ? args[2] : false;

			// Only throttle background animations. Never throttle explicit wardrobe/item pushes!
			if (
				Settings.instance.data.enablePerformanceMode &&
				!push &&
				!refreshDialog &&
				this.currentPerformanceLevel >= PerformanceLevel.LOW
			) {
				const now = Date.now();
				// Cap to 10 FPS on LOW, 2 FPS on CRITICAL
				const minInterval = this.currentPerformanceLevel === PerformanceLevel.CRITICAL ? 500 : 100;

				// BAIL EARLY: If it hasn't been long enough, skip the base game refresh entirely
				if (C.crabsLastAnimRefresh && (now - C.crabsLastAnimRefresh < minInterval)) {
					return;
				}
				C.crabsLastAnimRefresh = now;
			}

			// Otherwise, allow the refresh to process normally
			return next(args);
		});
	}
}
