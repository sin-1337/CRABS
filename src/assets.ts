/**
 * Asset images (logos and icons)
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

export const IMAGES: ImageStore = {
	basePath: "https://sin-1337.github.io/CRABS/images/",

	// logo
	image: {
		logo: {
			file: "CRABS_Logo.png",
			alt: "CRABS",
			class: "CRABS_Logo",
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
			class: "CRABS_Close",
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
			class: "CRABS_icons",
		},
		owner: {
			file: "owner.svg",
			alt: "Owner",
			toolTip: "Your Owner",
			class: "CRABS_icons",
		},
		sub: {
			file: "sub.svg",
			alt: "Sub",
			toolTip: "Submissive",
			class: "CRABS_icons",
		},
		subfamily: {
			file: "subfamily.svg", //TODO: UPDATE TO FAMILY ICON, CREATE NEW TRIL
			alt: "Sub family",
			toolTip: "Family.",
			class: "CRABS_icons",
		},
		trial: {
			file: "trial.svg",
			alt: "Trial",
			toolTip: "Trail",
			class: "CRABS_icons",
		},
		lover: {
			file: "lover.svg",
			alt: "Lover",
			toolTip: "Lover",
			class: "CRABS_icons",
		},
		bestfriend: {
			file: "bestfriend.svg",
			alt: "Best friend",
			toolTip: "Best Friend",
			class: "CRABS_icons",
		},
		friend: {
			file: "friends.svg",
			alt: "Friend",
			toolTip: "Friend",
			class: "CRABS_icons",
		},
		whitelist: {
			file: "whitelist.svg",
			alt: "Whitelist",
			toolTip: "Whitelisted",
			class: "CRABS_icons",
		},
		blacklist: {
			file: "blacklist.svg",
			alt: "blacklist",
			toolTip: "Blacklisted",
			class: "CRABS_icons",
		},
		ghost: {
			file: "ghost.svg",
			alt: "ghost",
			toolTip: "Ghosted",
			class: "CRABS_icons",
		},
		thought: {
			file: "thought.svg",
			alt: "thought bubble",
			class: "CRABS_icons",
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
