/**
 * CRABS Banner Module
 *
 * This module implements the banner functionality for the CRABS mod.
 * It provides:
 * - Custom banner display in chat rooms
 * - Banner template rendering system
 * - CSS styling for banner elements
 * - Integration with the CRABS base class for consistent functionality
 *
 * The banner module enhances the visual presentation of the CRABS mod in chat rooms.
 */

import { CRABS_Base } from "./base";
import { Assets } from "./assets";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import "./templates/banner.css";
import bannertemplate from "./templates/banner.html";

export class Banner extends CRABS_Base {
	constructor(CRABS: ModSDKModAPI) {
		super(CRABS);
	}

	/**
	 * Attach change handler
	 *
	 * @returns void
	 */
	public attachPermissionChangeHandler(): void {
		const select = document.getElementById(
			"CRABS_permission_select"
		) as HTMLSelectElement;

		if (select) {
			select.addEventListener("change", (event: Event) => {
				const TARGET = event.target as HTMLSelectElement;
				const NEW_PERM_LEVEL = parseInt(TARGET.value, 10);

				// Update player permissions based on selection
				Player.AllowedInteractions = NEW_PERM_LEVEL;
				ServerAccountUpdate.QueueData({ AllowedInteractions: Player.AllowedInteractions });
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
	private drawPermission(): string {
		let output: string = "";
		let SELECTED: number = Player.AllowedInteractions;

		// TODO: update this to support an arbitrary number of permission levels.
		for (const NUMBER of [0, 1, 2, 3, 4, 5]) {
			const PERMISISON_TEXT = TextGetInScope(
				"Screens/Character/InformationSheet/Text_InformationSheet.csv",
				"AllowedInteraction" + NUMBER.toString()
			);
			output += `<option${NUMBER === SELECTED ? " selected" : ""
				} value="${NUMBER}">${PERMISISON_TEXT}</option>`;
		}
		return output;
	}

	/**
	 * Draws the banner
	 *
	 * @param {Record<sring, string>} [extradata] - [optional] Additional data record.
	 * @returns void
	 */
	public drawBanner(
		extradata?: Record<string, string>
	): void {
		// bail if ChatRoomData is null or blank
		if (!ChatRoomData || Object.keys(ChatRoomData).length === 0) {
			console.log("CRABS: ChatRoomData wasn't populated");
			return;
		}

		// set up the template and populate the fields.
		let templatevars = {
			Logo: Assets.printimage({ key: "logo" }),
			LabelColor: `${Player.LabelColor}`,
			PermissionOptions: this.drawPermission(),
			RoomName: ChatRoomData.Name,
		};

		let wrappervars = {
			TitleBar: `${NAME}:  ${VERSION}`,
			Close: Assets.printimage({
				key: "close",
				data: [
					"elementid",
					"CRABS_Banner",
				]
			}),
		};

		if (extradata) Object.assign(templatevars, extradata);

		this.sendoutput(
			this.template(bannertemplate, templatevars, true, wrappervars),
			"CRABS_Banner"
		);
		this.attachPermissionChangeHandler();
		this.attachEventWithCallback("CRABS_Help_Icon", () => {
			this.fakeplayercommand("help");
		});
	}
}
