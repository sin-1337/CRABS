import CRABS from "../base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import "./templates/banner.css";
import bannertemplate from "./templates/banner.html";


export default class Banner extends CRABS {

    constructor(CRABS: ModSDKModAPI) {
    super(CRABS);
    }


    public drawBanner(name: string, version: string): void {

        // get player permissions
        const currentPermissionText = `${TextGetInScope(
          "Screens/Character/InformationSheet/Text_InformationSheet.csv",
          "PermissionLevel" + Player.ItemPermission.toString()
        )} (${Player.ItemPermission})`;

        // set up the template and populate the fields.
        let output_html = bannertemplate
            .replace("{{Logo}}", this.printlogo())
            .replace("{{Name}}", name)
            .replace("{{Version}}", version)
            .replace("{{LabelColor}}", `${Player.LabelColor}`)
            .replace("{{PlayerPermission}}", currentPermissionText)
            .replace("{{RoomName}}", ChatRoomData.Name);

        return(output_html)
    }

}
