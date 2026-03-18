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
		basePath: `https://sin-1337.github.io/CRABS/images/`,

		// logo
		image: {
			logo: {
				file: "CRABS_logo.png",
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
				toolTip: "Gold Key"
			},
			keySilver: {
				file: "keySilver.png",
				alt: "silver key",
				toolTip: "Silver Key",
			},
			keyBronze: {
				file: "keyBronze.png",
				alt: "bronze key",
				toolTip: "Bronze Key",
			},
			keyNull: {
				file: "keyNull.svg",
				alt: "null key",
				toolTip: "Empty Key Slot",
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
				file: "GagMedium.png",
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
		 * printimage
		 * Prints various image assets into the DOM 
		 *
		 * Has a single object parameter allowing you to use non-positional
		 * parameters. IE: {key: "logo", css_class_override: "some_class"}
		 * @param {PrintImage} params - Object containing image configuration
		 * @returns {string} HTML representing the icon
		 */
	static printimage({
		key,
		css_class_override, //optional class overwrite
		css_style = "", // optional, CSS overwrite
		tooltip_override = "", // optional tooltip
		alt_override, // optional tooltip
		data, // optional, facilitates special data for event listeners
	}: PrintImage): string {
		let images = Assets.IMAGES.image;
		let icon = images["error"].file; // fall back if the icon isn't found
		if (key in images) {
			// test if the key exists
			icon = images[key].file;
		}

		// extract extra data from the asset if no override is found
		const css_class = css_class_override || images[key].class || "";
		const tooltip = tooltip_override || images[key].toolTip || "";
		const alt = alt_override || images[key].alt || key; //fall back to the key

		let html = "";
		if (tooltip != "") html += `<div class='CRABS_tooltip-wrapper'>`; // skip the tool tip if string wasn't set
		html += `<img `;
		if (data) html += `data-${data[0]}=${data[1]} `;
		if (alt != "") html += `alt='${alt}' `;
		html += `src='${Assets.IMAGES.basePath}${icon}' `;
		html += `class='${css_class} || ""'`;
		if (css_style != "") html += `style="${css_style}"`;
		html += `>`;
		if (tooltip != "") html += `<div class='CRABS_tooltip'>${tooltip}</div>`;
		if (tooltip != "") html += `</div>`;  // this is for the tooltip wrapper
		return html;
	}
}
