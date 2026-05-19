// src/modules/performance.ts

import { CRABS_Base, PerformanceLevel } from "./base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Settings } from "./settings";

export class Performance extends CRABS_Base {
	constructor(CRABS: ModSDKModAPI) {
		super(CRABS);
		this.initVFXRegistry();
		this.startPassiveMonitor();
	}

	private initVFXRegistry(): void {
		const globalWindow = window as any;
		// This is the ONLY hook we need. 
		// It tells the game to stop drawing heavy backgrounds/blurs when laggy.
		// It is 100% safe because it doesn't touch character canvas logic.
		if (globalWindow.DrawSkipVFX) {
			globalWindow.DrawSkipVFX.register((_module: string, _screen: string) => {
				if (!Settings.instance.data.enablePerformanceMode) return false;
				return this.currentPerformanceLevel === PerformanceLevel.CRITICAL;
			});
		}
	}

	private startPassiveMonitor(): void {
		// We poll the timer every 2 seconds. 
		// This is decoupled from the render loop so it CANNOT break your icons.
		setInterval(() => {
			if (!Settings.instance.data.enablePerformanceMode) return;

			const globalWindow = window as any;
			const interval = globalWindow.TimerRunInterval;

			if (interval && interval > 0) {
				const actualFps = 1000 / interval;
				if (actualFps < 15) this.currentPerformanceLevel = PerformanceLevel.CRITICAL;
				else if (actualFps < 30) this.currentPerformanceLevel = PerformanceLevel.LOW;
				else this.currentPerformanceLevel = PerformanceLevel.NORMAL;
			}
		}, 2000);
	}
}
