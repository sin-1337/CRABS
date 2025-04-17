import CRABS from "../base"
import { ModSDKModAPI } from "bondage-club-mod-sdk"
import "./templates/banner.css"
import bannertemplate from "./templates/banner.html"


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
            .replace("{{Logo}}", this.printicon("logo"))
            .replace("{{Name}}", name)
            .replace("{{Version}}", version)
            .replace("{{LabelColor}}", `${Player.LabelColor}`)
            .replace("{{PlayerPermission}}", currentPermissionText)
            .replace("{{RoomName}}", ChatRoomData.Name);

        ChatRoomSendLocal(output_html);

        // output room details
        for (const [_, COMMAND] of Commands.entries()) {
          if (COMMAND.Tag === "players") {
            COMMAND.Action("count");
            break;
          }
        }

        // output message letting players know how to view the full roster
        ChatRoomSendLocal("<div>To see the full roster use /roster</div><hr>");
    }

}
