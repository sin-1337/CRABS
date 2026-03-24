/**
 * CRABS Assets Module
 *
 * This module handles all asset management for the CRABS mod, including:
 * - Image assets (logos, icons, and other graphical elements)
 * - Asset storage and retrieval system
 * - Image printing functionality for displaying icons in chat
 *
 * The module provides a centralized location for all image assets used throughout
 * the mod, for managing and updating graphical elements.
 */

type ImageStore = {
	readonly basePath: string;
	readonly image: {
		readonly [key: string]: {
			readonly file: string;
			readonly subdir?: string;
			readonly alt?: string;
			readonly toolTip?: string;
			readonly class?: string;
		}
	}
}

export abstract class Assets {

	protected static readonly IMAGES: ImageStore = {
		basePath: "https://sin-1337.github.io/CRABS/images/",

		// logo
		image: {
			logo: {
				file: "CRABS_Logo.png",
				alt: "CRABS",
				class: "CRABS_logo",
			},

			animated_logo: {
				file: "CRABS_Logo.gif",
				alt: "CRABS",
				class: "CRABS_logo",
			},

			// error icon
			error: {
				file: "error.svg",
				alt: "Error, image not found.",
			},

			// options:
			close: {
				file: "close.svg",
				alt: "Close",
				toolTip: "Close",
				class: "CRABS_close",
			},
			help: {
				file: "help.svg",
				alt: "Help",
				toolTip: "Help",
				class: "CRABS_Help_Icon",
			},
			settings: {
				file: "settings.svg",
				alt: "Settings",
				toolTip: "Settings",
				class: "CRABS_Settings_Icon",
			},

			// badges
			admin: {
				file: "admin.svg",
				alt: "Admin",
				toolTip: "Admin",
				class: "CRABS_badge",
			},
			vip: {
				file: "vip.svg",
				alt: "VIP",
				toolTip: "Room Whitelisted",
				class: "CRABS_badge",
			},
			player: {
				file: "player.svg",
				alt: "Guest",
				toolTip: "Room Guest",
				class: "CRABS_badge",
			},

			// icons
			you: {
				file: "you.svg",
				alt: "You",
				toolTip: "You",
				class: "CRABS_icon",
			},
			owner: {
				file: "owner.svg",
				alt: "Owner",
				toolTip: "Your Owner",
				class: "CRABS_icon",
			},
			sub: {
				file: "sub.svg",
				alt: "Sub",
				toolTip: "Submissive",
				class: "CRABS_icon",
			},
			subfamily: {
				file: "subfamily.svg", //TODO: UPDATE TO FAMILY ICON, CREATE NEW TRIL
				alt: "Sub family",
				toolTip: "Family.",
				class: "CRABS_icon",
			},
			trial: {
				file: "trial.svg",
				alt: "Trial",
				toolTip: "Trail",
				class: "CRABS_icon",
			},
			lover: {
				file: "lover.svg",
				alt: "Lover",
				toolTip: "Lover",
				class: "CRABS_icon",
			},
			bestfriend: {
				file: "bestfriend.svg",
				alt: "Best friend",
				toolTip: "Best Friend",
				class: "CRABS_icon",
			},
			friend: {
				file: "friends.svg",
				alt: "Friend",
				toolTip: "Friend",
				class: "CRABS_icon",
			},
			whitelist: {
				file: "whitelist.svg",
				alt: "Whitelist",
				toolTip: "Whitelisted",
				class: "CRABS_icon",
			},
			blacklist: {
				file: "blacklist.svg",
				alt: "blacklist",
				toolTip: "Blacklisted",
				class: "CRABS_icon",
			},
			ghost: {
				file: "ghost.svg",
				alt: "ghost",
				toolTip: "Ghosted",
				class: "CRABS_icon",
			},
			thought: {
				file: "thought.svg",
				alt: "thought bubble",
				class: "CRABS_icon",
			},

			// globe icon for all BC players
			connected: {
				file: "connected.svg",
				alt: "connected",
				toolTip: "Total accounts online",
			},

			//map keys
			keyGold: {
				file: "keyGold.png",
				alt: "gold key",
				toolTip: "Gold Key",
				class: "CRABS_key-icons",
			},
			keySilver: {
				file: "keySilver.png",
				alt: "silver key",
				toolTip: "Silver Key",
				class: "CRABS_key-icons",
			},
			keyBronze: {
				file: "keyBronze.png",
				alt: "bronze key",
				toolTip: "Bronze Key",
				class: "CRABS_key-icons",
			},
			keyNull: {
				file: "keyNull.svg",
				alt: "null key",
				toolTip: "Empty Key Slot",
				class: "CRABS_key-icons",
			},

			//Status Icons:
			blindNone: {
				file: "blindNone.svg",
				alt: "blind none",
				toolTip: "Not Blind",
			},
			blindLight: {
				file: "BlindLight.png",
				alt: "blind light",
				toolTip: "Blind 1",
			},

			blindNormal: {
				file: "BlindNormal.png",
				alt: "blind normal",
				toolTip: "Blind 2",
			},
			blindHeavy: {
				file: "BlindHeavy.png",
				alt: "blind heavy",
				toolTip: "Blind 3",
			},
			blindTotal: {
				file: "BlindHeavy.png",
				alt: "blind heavy",
				toolTip: "Blind 4",
			},

			deafNone: {
				file: "deafNone.svg",
				alt: "deaf none",
				toolTip: "Not Deaf",
			},
			deafLight: {
				file: "DeafLight.png",
				alt: "deaf light",
				toolTip: "Deaf 1",
			},
			deafNormal: {
				file: "DeafNormal.png",
				alt: "deaf normal",
				toolTip: "Deaf 2",
			},
			deafHeavy: {
				file: "DeafHeavy.png",
				alt: "deaf heavy",
				toolTip: "Deaf 3"
			},
			deafTotal: {
				file: "DeafHeavy.png",
				alt: "deaf heavy",
				toolTip: "Deaf 4",
			},
			gagNone: {
				file: "gagNone.svg",
				alt: "gag nonoe",
				toolTip: "Not Gagged",
			},
			gagVeryLight: {
				file: "GagLight.png",
				alt: "gag very light",
				toolTip: "Gag 1"
			},
			gagEasy: {
				file: "GagLight.png",
				alt: "gag easy",
				toolTip: "Gag 1"
			},
			gagLight: {
				file: "GagLight.png",
				alt: "gag light",
				toolTip: "Gag 1"
			},
			gagNormal: {
				file: "GagNormal.png",
				alt: "gag normal",
				toolTip: "Gag 2"
			},
			gagMedium: {
				file: "GagNormal.png",
				alt: "gag medium",
				toolTip: "Gag 3"
			},
			gagHeavy: {
				file: "GagHeavy.png",
				alt: "gag heavy",
				toolTip: "Gag 4"
			},
			gagVeryHeavy: {
				file: "GagHeavy.png",
				alt: "gag very heavy",
				toolTip: "Gag 4"
			},
			gagTotal: {
				file: "GagTotal.png",
				alt: "gag total",
				toolTip: "Gag 4"
			},
			gagTotal2: {
				file: "GagTotal.png",
				alt: "gag total",
				toolTip: "Gag 4"
			},
			gagTotal3: {
				file: "GagTotal.png",
				alt: "gag total",
				toolTip: "Gag 4"
			},
			gagTotal4: {
				file: "GagTotal.png",
				alt: "gag total",
				toolTip: "Gag 4"
			},
		},
	} as const;

	/**
	 * simply outputs a string with the image path 
	 * @param {string} key - Image key from the assets object
	 * @returns {string} Full path URL to image.
	 */
	public static getimage(key: Extract<keyof typeof Assets.IMAGES.image, string>): string {
		const imgObj = Assets.IMAGES.image[key];

		// If the key is missing or undefined at runtime, gracefully return the error image
		if (!imgObj) {
			console.warn(`Missing image key: ${key}`);
			return `${Assets.IMAGES.basePath}${Assets.IMAGES.image["error"].file}`;
		}

		return `${Assets.IMAGES.basePath}${imgObj.file}`;
	}

	/**
		 * printimage
		 * Prints various image assets into the DOM 
		 *
		 * Has a single object parameter allowing you to use non-positional
		 * parameters. IE: {key: "logo", css_class_override: "some_class"}
		 * @param {PrintImage} params - Object containing image configuration
		 * @returns {string} HTML representing the icon
		 */
	public static printimage({
		key,
		css_class_override,
		css_style = "",
		tooltip_override = "",
		alt_override,
		data,
	}: PrintImage): string {
		const images = Assets.IMAGES.image;

		const imgData = (key in images) ? images[key as keyof typeof images] : images["error"];

		const css_class = css_class_override || imgData.class || "";
		const tooltip = tooltip_override || imgData.toolTip || "";
		const alt = alt_override || imgData.alt || key;

		let html = "";
		// Notice: No spaces after the '<'
		if (tooltip !== "") html += `<div class='CRABS_tooltip-wrapper'>`;

		html += `<img `;
		if (data) html += `data-${data[0]}="${data[1]}" `;
		if (alt !== "") html += `alt="${alt}" `;
		html += `src="${Assets.IMAGES.basePath}${imgData.file}" `;
		if (css_class !== "") html += `class="${css_class}" `;
		if (css_style !== "") html += `style="${css_style}" `;
		html += `>`;

		if (tooltip !== "") html += `<div class='CRABS_tooltip'>${tooltip}</div></div>`;

		return html;
	}
}
