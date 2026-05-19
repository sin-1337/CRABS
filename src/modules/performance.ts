// src/modules/performance.ts

import { CRABS_Base } from "./base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";

export class Performance extends CRABS_Base {
	constructor(CRABS: ModSDKModAPI) {
		super(CRABS);
		this.optimizeResourceHogs();
	}

	private optimizeResourceHogs(): void {
		// Optimize Texture Mask Caching
		this.safeHook("DrawApplyTextureAlphaMask", 0, (args: any[], next: (args: any[]) => any) => {
			const destCanvas = args[0];
			const _X = args[1]; // Prefixed with _ to ignore TS warning
			const _Y = args[2]; // Prefixed with _ to ignore TS warning
			const masks = args[3];

			// Faster cache key: Just combine the URLs and lengths, avoid JSON.stringify
			const cacheKey = `Mask:${masks.map((m: any) => m.Url).join('|')}`;

			// We use the base game's cache map, but bypass the expensive stringify step
			const DrawCacheTextureAlphaMasks = (window as any).DrawCacheTextureAlphaMasks;
			if (DrawCacheTextureAlphaMasks.has(cacheKey)) {
				const mask = DrawCacheTextureAlphaMasks.get(cacheKey);
				const oldComposite = destCanvas.globalCompositeOperation;
				destCanvas.globalCompositeOperation = "destination-in";
				destCanvas.drawImage(mask, 0, 0);
				destCanvas.globalCompositeOperation = oldComposite;
				return; // Skip the expensive base game logic entirely
			}

			return next(args);
		});

		// Optimize Text Measurement
		const TextCache = new Map<string, any>();
		this.safeHook("DrawingGetTextSize", 0, (args: any[], next: (args: any[]) => any) => {
			const [Text, Width] = args;
			const key = `${Text}:${Width}`;

			if (TextCache.has(key)) return TextCache.get(key);

			const result = next(args);
			TextCache.set(key, result);
			return result;
		});
	}
}
