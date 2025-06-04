import CRABS from "../base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import "./templates/banner.css";
import bannertemplate from "./templates/banner.html";

export class Banner extends CRABS {
  constructor(CRABS: ModSDKModAPI) {
    super(CRABS);
  }

  public attachPermissionChangeHandler(): void {
  const select = document.getElementById("CRABS_Permission_Select") as HTMLSelectElement;

  if (select) {
    select.addEventListener("change", (event: Event) => {
      const target = event.target as HTMLSelectElement;
      const newValue = parseInt(target.value, 10);

      // 🔧 Do something with newValue:
      console.log("New permission level selected:", newValue);

      // Example: Update some player state
      Player.ItemPermission = newValue;
    });
  } else {
    console.warn("CRABS_Permission_Select not found in DOM");
  }
}

  /** 
   * Outputs the HTML permission levels
   *
   * @returns {string}
   */
  private drawPermission() {
      let output: string = "";
      let SELECTED: number = Player.ItemPermission;
        for (const NUMBER of [0, 1, 2, 3, 4, 5]) {
            const PERMISISON_TEXT = TextGetInScope("Screens/Character/InformationSheet/Text_InformationSheet.csv", "PermissionLevel" + NUMBER.toString());
            output += `<option${NUMBER === SELECTED ? " selected" : ""} value="${NUMBER}">${PERMISISON_TEXT}</option>`;
        }
        return output;

    }
  

  /** 
   * Draws the banner
   * 
   * @param {string} name - Name of the program.
   * @param {string} version - Version number.
   * @param {Record<sring, string>} [extradata] - [optional] Additional data record.
   * @returns void
   */
  public drawBanner(
    name: string,
    version: string,
    extradata?: Record<string, string>
  ): void {
    // bail if ChatRoomData is null or blank 
    if (!ChatRoomData || Object.keys(ChatRoomData).length === 0) {
        console.log("CRABS: ChatRoomData wasn't populated")
        return;
    }

    // set up the template and populate the fields.
    let templatevars = {
      Logo: this.printimage("logo", undefined, "CRABS_logo"),
      Name: name,
      Version: version,
      LabelColor: `${Player.LabelColor}`,
      PermissionOptions: this.drawPermission(),
      RoomName: ChatRoomData.Name,
    };

    let wrappervars = {
        Close: this.printimage("close", undefined, "CRABS_close", undefined, ["elementid", "CRABS_Banner"])
    }

    if (extradata) Object.assign(templatevars, extradata);

    this.sendoutput(
        this.template(bannertemplate, templatevars, true, wrappervars), 
        "CRABS_Banner"
    );
    this.attachPermissionChangeHandler();
    this.attachEvent("CRABS_banner_rosterlink", "fakePlayerCommand")
  }
}
