// src/modules/performance.ts

import { CRABS_Base, PerformanceLevel } from "./base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Settings } from "./settings";

export class Performance extends CRABS_Base {
	constructor(CRABS: ModSDKModAPI) {
		super(CRABS);
		this.initVFXRegistry();
		this.startPassiveMonitor();
		this.optimizeResourceHogs();
		this.optimizeNativeCanvasText();
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

				const newLevel = actualFps < 15 ? PerformanceLevel.CRITICAL :
					actualFps < 30 ? PerformanceLevel.LOW :
						PerformanceLevel.NORMAL;

				this.currentPerformanceLevel = newLevel;
			}
		}, 2000);
	}

	private optimizeResourceHogs(): void {
		// Optimize Texture Mask Caching
		this.safeHook("DrawApplyTextureAlphaMask", 0, (args: any[], next: (args: any[]) => any) => {
			const destCanvas = args[0];
			const masks = args[3]; // Skip args[1] and args[2] entirely

			// Flat-string cache key generation (Bypasses heavy JSON.stringify)
			const cacheKey = `Mask:${masks.map((m: any) => m.Url).join('|')}`;

			const DrawCacheTextureAlphaMasks = (window as any).DrawCacheTextureAlphaMasks;
			if (DrawCacheTextureAlphaMasks && DrawCacheTextureAlphaMasks.has(cacheKey)) {
				const mask = DrawCacheTextureAlphaMasks.get(cacheKey);
				const oldComposite = destCanvas.globalCompositeOperation;
				destCanvas.globalCompositeOperation = "destination-in";
				destCanvas.drawImage(mask, 0, 0);
				destCanvas.globalCompositeOperation = oldComposite;
				return; // Skip base game logic entirely
			}

			return next(args);
		});
	}

	private optimizeNativeCanvasText(): void {
		// Monkey-patch the browser's native canvas API.
		// This globally caches ALL text measurements in the game, bypassing ModSDK limits.
		const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
		const textCache = new Map<string, TextMetrics>();
		let cacheSize = 0;

		CanvasRenderingContext2D.prototype.measureText = function (text: string) {
			// The cache key must include the font, since the same text is different sizes in different fonts
			const key = this.font + "|" + text;

			const cached = textCache.get(key);
			if (cached) return cached;

			const metrics = originalMeasureText.call(this, text);

			// Prevent infinite RAM bloat over long play sessions
			if (cacheSize > 5000) {
				textCache.clear();
				cacheSize = 0;
			}

			textCache.set(key, metrics);
			cacheSize++;
			return metrics;
		};
	}

	private startAnimationClamper(): void {
		// Passive data-layer throttle. 
		// Forces heavy animated items to update less frequently during lag.
		setInterval(() => {
			if (!Settings.instance.data.enablePerformanceMode || this.currentPerformanceLevel === PerformanceLevel.NORMAL) return;

			const globalWindow = window as any;
			const animStorage = globalWindow.AnimationPersistentStorage;
			const animTypes = globalWindow.AnimationDataTypes;

			if (animStorage && animTypes && animStorage[animTypes.RefreshRate]) {
				const refreshRates = animStorage[animTypes.RefreshRate];

				// Set animation floor: 150ms (~6fps) for LOW lag, 500ms (2fps) for CRITICAL
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
