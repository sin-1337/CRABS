// src/modules/performance.ts

import { CRABS_Base, PerformanceLevel } from "./base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Settings } from "./settings";

export class Performance extends CRABS_Base {
	constructor(CRABS: ModSDKModAPI) {
		super(CRABS);
		this.initVFXCulling();
		this.initHooks();
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

	private initHooks(): void {
		// Calculate FPS and track stability every frame
		this.safeHook("GameRun", 0, (args: any[], next: (args: any[]) => any) => {
			if (Settings.instance.data.enablePerformanceMode) {
				this.updatePerformanceState();
			}
			return next(args);
		});

		// Throttle Base Game Dynamic Animations (stops CharacterRefresh from firing constantly)
		this.safeHook("DrawCharacter", 0, (args: any[], next: (args: any[]) => any) => {
			const C = args[0];
			const globalWindow = window as any;

			if (
				Settings.instance.data.enablePerformanceMode &&
				C && this.currentPerformanceLevel >= PerformanceLevel.LOW
			) {
				try {
					const animStorage = globalWindow.AnimationPersistentStorage;
					const animTypes = globalWindow.AnimationDataTypes;

					if (animStorage && animTypes && globalWindow.AnimationGetDynamicDataName) {
						const charKey = globalWindow.AnimationGetDynamicDataName(C);
						const refreshRates = animStorage[animTypes.RefreshRate];

						if (refreshRates && refreshRates[charKey]) {
							const originalRate = refreshRates[charKey];

							// Cap animations to 10 FPS on LOW lag, 2 FPS on CRITICAL lag
							const minRate = this.currentPerformanceLevel === PerformanceLevel.CRITICAL ? 500 : 100;

							if (originalRate < minRate) {
								refreshRates[charKey] = minRate;
								const result = next(args);
								refreshRates[charKey] = originalRate; // Restore immediately after drawing
								return result;
							}
						}
					}
				} catch (e) {
					// Failsafe so the draw loop never crashes
				}
			}
			return next(args);
		});

		// Fix Base Game WebGL Crash Bug (Restores blank top-bar icons)
		this.safeHook("GLDrawRebuildCharacters", 0, (args: any[], next: (args: any[]) => any) => {
			// Let the base game rebuild the main characters first
			const result = next(args);
			const globalWindow = window as any;

			// Now, catch the ones it forgot (the top bar icons)
			if (globalWindow.ChatRoomCharacter && Array.isArray(globalWindow.ChatRoomCharacter)) {
				for (const C of globalWindow.ChatRoomCharacter) {
					// Check if the character was skipped by the base game's rebuild loop
					if (C && globalWindow.DrawLastCharacters && !globalWindow.DrawLastCharacters.includes(C)) {
						if (globalWindow.CharacterAppearanceBuildCanvas) {
							globalWindow.CharacterAppearanceBuildCanvas(C);
							C.MustDraw = false; // Prevent infinite draw loops
						}
					}
				}
			}
			return result;
		});

	}
}
