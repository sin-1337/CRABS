import CRABS from "../base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import "./templates/banner.css";
//import bannertemplate from "./templates/banner.html";


export default class Banner extends CRABS {

    constructor(CRABS: ModSDKModAPI) {
    super(CRABS);
    }


    public drawBanner(name: string, version: string): string {

        // get player permissions
        const currentPermissionText = `${TextGetInScope(
          "Screens/Character/InformationSheet/Text_InformationSheet.csv",
          "PermissionLevel" + Player.ItemPermission.toString()
        )} (${Player.ItemPermission})`;

        // set up the template and populate the fields.
        let templatevars = {
            "Logo": this.printlogo(),
            "Name": name,
            "Version": version,
            "LabelColor": `${Player.LabelColor}`,
            "PlayerPermission": currentPermissionText,
            "RoomName": ChatRoomData.Name,
        }
        this.template("banner", templatevars)
        .then((output_html) => {
            return(output_html);
        })
        .catch((error) => {
            console.log("CRABS: Error loading template -> ", error);
        });
        return("Error loading template");
    }
}
