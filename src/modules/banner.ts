import CRABS from "../base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import "./templates/banner.css";
import bannertemplate from "./templates/banner.html";

export class Banner extends CRABS {
  constructor(CRABS: ModSDKModAPI) {
    super(CRABS);
  }

  /** 
   * Draws the banner
   * 
   * @param {string} name - Name of the program.
   * @param {string} version - Version number.
   * @param {Record<sring, string>} [extradata] - [optional] Additional data record.
   * @returns {string} Completed HTML template.
   */
  public drawBanner(
    name: string,
    version: string,
    extradata?: Record<string, string>
  ): string {
    // bail if ChatRoomData is null or blank 
    if (!ChatRoomData || Object.keys(ChatRoomData).length === 0) {
        return "ChatRoomData wasn't populated!";
    }
    // get player permissions
    const currentPermissionText = `${TextGetInScope(
      "Screens/Character/InformationSheet/Text_InformationSheet.csv",
      "PermissionLevel" + Player.ItemPermission.toString()
    )} (${Player.ItemPermission})`;

    // set up the template and populate the fields.
    let templatevars = {
      Logo: this.printimage("logo", undefined, "CRABS_logo"),
      Name: name,
      Version: version,
      LabelColor: `${Player.LabelColor}`,
      PlayerPermission: currentPermissionText,
      RoomName: ChatRoomData.Name,
    };

    let wrappervars = {
        Close: this.printimage("close", undefined, "CRABS_close", undefined, ["elementid", "CRABS_Banner"])
    }

    if (extradata) Object.assign(templatevars, extradata);

    return this.template(bannertemplate, templatevars, true, wrappervars);
  }
}
