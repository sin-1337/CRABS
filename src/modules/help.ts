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
import { Mod } from "./crossmod";
import helptemplate from "./templates/help.html";


export class Help extends CRABS_Base {

	/** 
	 * Shows help output
	 * 
	 * @returns {string} Completed HTML for help output.
	 */
	public showHelp(): string {
		let output = `<table style="width: 100%"><tr><td>
            <span style=" text-shadow: 0px 0px 3px #000000; white-space: normal;">
            <hr>
            ${Assets.printimage({ key: "logo" })}</br>
            CRABS ${VERSION} help sheet</br>
            /roster [optional argument] </br>
            This command lists the number of admins and players
            in a room and gives you some information about them </br>
            
            <br>
            /roster Arguments: </br>
            help - show this menu </br>
            count - show only the player count </br>
            admins - show only a list of admins and the counts </br>
            vips - show only room whitelisted and the counts </br>
            banner - draws the banner again </br>
            version - shows the version of CRABS </br>

            </br>
            /whisper+ [player number] </br>
            /w+ [player number] </br>
            Command that lets you whisper at range on maps, 
            activated automatically by clicking the player
            name in the roster. </br></br>

            /dropkeys [gold silver bronze / all] </br>
            Command that lets you drop your keys, you can 
            supply one or more key colors, or all to drop 
            all keys. </br>

            </br>
            Badges:
            <hr>
            ${Assets.printimage({ key: "admin" })} = Person is Admin</br>
            ${Assets.printimage({ key: "vip" })} = Person is whitelisted in the room </br>
            ${Assets.printimage({ key: "player" })} = Person is a normal user </br>

            </br>
            Icons:
            <hr>
            ${Assets.printimage({ key: "you" })} = Person is you </br>
            ${Assets.printimage({ key: "owner" })} = Person is your owner </br>
            ${Assets.printimage({ key: "sub" })} = Person is your submissive </br>
            ${Assets.printimage({ key: "trial" })} = Person is on trial with you </br>
            ${Assets.printimage({ key: "lover" })} = Person is your lover </br>`;

		//prints only if the BCTweaks module is detected.
		if (Mod.detectMod("BCTweaks")) {
			output += `${Assets.printimage({ key: "bestfriend" })} = Person is a best friend </br>`;
		}

		output += `${Assets.printimage({ key: "friend" })} = Person is a friend </br>
            ${Assets.printimage({ key: "whitelist" })} = You have this person whitelisted </br>
            ${Assets.printimage({ key: "blacklist" })} = You have this person blacklisted </br>
            ${Assets.printimage({ key: "ghost" })} = You have ghosted this person </br>

            </br>
            Status Icons:
            <hr>
            There are 3 icons on the right side of each player card.
            They indicate if the player is gagged, blind, or deaf 
            and will light up to show this stats.</br>

            </br>
            Keys:
            <hr>
            When on a map, 3 key icons in the upper right corner of
            the roster will light up as you collect the different keys. </br>

            </br>
            Actions:
            <hr>
            Click Badge - If you click the badge for a player it will 
            be as if you clicked them to interact. It shows the focus 
            screen.</br></br>
            Click name - If you click the name/number of a player it 
            will activate whisper+ and let you whisper them without 
            range constraints. </br>
            </span>
            </td>
            </tr>
            </table>`;

		let templatevars = {
			"HelpOutput": output,
		};

		let wrappervars = {
			TitleBar: `CRABS: Help`,
			Close: Assets.printimage({ key: "close", data: ["elementid", "CRABS_Help"] })
		}

		return (this.template(helptemplate, templatevars, true, wrappervars));
	}
}
