/**
 * CRABS Help Module
 *
 * This module implements the help system for the CRABS mod.
 * It provides:
 * - Help command functionality
 * - Help template rendering
 * - Documentation display for mod features
 * - Integration with the CRABS base class and asset system
 *
 * The help module makes it easy for users to access information about
 * the CRABS mod's features and commands.
 */

import { CRABS_Base } from "./base";
import { Assets } from "./assets";
import { CrossMod } from "./crossmod";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import helptemplate from "./templates/help.html";

/**
 * Class representing the help system and documentation viewer.
 */
export class Help extends CRABS_Base {

	/**
	 * Creates an instance of the Help module.
	 * 
	 * @param {ModSDKModAPI} CRABS - The ModSDK API instance.
	 */
	constructor(CRABS: ModSDKModAPI) {
		super(CRABS);
	}

	/** 
	 * Generates the HTML content for the help screen by populating the help template.
	 * 
	 * @param {boolean} [wrapper=true] - Whether to wrap the content in the standard UI wrapper.
	 * @returns {string} Completed HTML string for the help output.
	 */
	public showHelp(wrapper: boolean = true): string {
		const templateVariables: Record<string, string> = {
			"Version": VERSION,
			"Logo": Assets.printimage({ key: "logo" }),
			"Icon_You": Assets.printimage({ key: "you", css_class_override: "CRABS_help_icon_small" }),
			"Icon_Owner": Assets.printimage({ key: "owner", css_class_override: "CRABS_help_icon_small" }),
			"Icon_Sub": Assets.printimage({ key: "sub", css_class_override: "CRABS_help_icon_small" }),
			"Icon_Trial": Assets.printimage({ key: "trial", css_class_override: "CRABS_help_icon_small" }),
			"Icon_Lover": Assets.printimage({ key: "lover", css_class_override: "CRABS_help_icon_small" }),
			"Icon_Family": Assets.printimage({ key: "family", css_class_override: "CRABS_help_icon_small" }),
			"Icon_BestFriend": CrossMod.detectMod("BCTweaks") 
				? Assets.printimage({ key: "bestfriend", css_class_override: "CRABS_help_icon_small" }) 
				: "<i>(N/A)</i>",
			"Icon_Friend": Assets.printimage({ key: "friend", css_class_override: "CRABS_help_icon_small" }),
			"Icon_Whitelist": Assets.printimage({ key: "whitelist", css_class_override: "CRABS_help_icon_small" }),
			"Icon_Blacklist": Assets.printimage({ key: "blacklist", css_class_override: "CRABS_help_icon_small" }),
			"Icon_Ghost": Assets.printimage({ key: "ghost", css_class_override: "CRABS_help_icon_small" }),
			"Badge_Admin": Assets.printimage({ key: "admin", css_class_override: "CRABS_help_icon_small" }),
			"Badge_VIP": Assets.printimage({ key: "vip", css_class_override: "CRABS_help_icon_small" }),
			"Badge_Player": Assets.printimage({ key: "player", css_class_override: "CRABS_help_icon_small" }),
		};

		const wrapperVariables = {
			TitleBar: `CRABS: Help`,
			Close: Assets.printimage({ key: "close", data: ["elementid", "CRABS_Help"] })
		};

		return this.template(helptemplate, templateVariables, wrapper, wrapperVariables);
	}
}
