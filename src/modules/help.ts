import CRABS from "../base";
import helptemplate from "./templates/help.html";


export class Help extends CRABS {

  // show help
  public showhelp(): string {
    let output = `<table style="width: 100%"><tr><td>
            <span style=" text-shadow: 0px 0px 3px #000000; white-space: normal;">
            <hr>
            ${this.printlogo()}CRABS help sheet</br>
            /roster [optional argument] </br>
            This command lists the number of admins and players
            in a room and gives you some informatoin about them </br>
            
            <br>
            /roster Arguments:
            help - show this menu </br>
            count - show only the player count </br>
            admins - show only a list of admins and the counts </br>
            vips - show only room whitelisted and the counts </br>
            banner - draws the banner again </br>
            version - shows the version of CRABS </br>

            </br>
            /whisper+ (player number) 
            /w+ (player number)
            Command that lets you whisper at range on maps, 
            activated automatically by clicking the player
            name in the roster. </br>

            /dropkeys (gold silver bronze / all)
            Command that lets you drop your keys, you can 
            supply one or more key colors, or all to drop 
            all keys. </br>

            </br>
            Badges:
            <hr>
            ${this.printicon("admin")} = Person is Admin</br>
            ${this.printicon("vip")} = Person is whitelisted in the room </br>
            ${this.printicon("player")} = Person is a normal user </br>

            </br>
            Icons:
            <hr>
            ${this.printicon("you")} = Person is you </br>
            ${this.printicon("owner")} = Person is your owner </br>
            ${this.printicon("sub")} = Person is your submissive </br>
            ${this.printicon("trial")} = Person is on trial with you </br>
            ${this.printicon("lover")} = Person is your lover </br>`;

    //prints only if the BCTweaks module is detected.
    if (this.detectMod("BCTweaks")) {
      output += `${this.printicon(
        "bestfriend"
      )} = Person is a best friend </br>`;
    }

    output += `${this.printicon("friend")} = Person is a friend </br>
            ${this.printicon(
              "whitelist"
            )} = You have this person whitelisted </br>
            ${this.printicon(
              "blacklist"
            )} = You have this person blacklisted </br>
            ${this.printicon("ghost")} = You have ghosted this person </br>

            </br>
            Status Icons:
            There are 3 icons on the right side of each player card.
            They indicate if the player is gagged, blind, or deaf 
            and will light up to show this stats.</br>

            </br>
            Actions:
            <hr>
            Click Badge - If you click the badge for a player it will 
            be as if you clicked them to interact. It shows the focus 
            screen.</br>
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
    return(this.template(helptemplate, templatevars));
  }
}
