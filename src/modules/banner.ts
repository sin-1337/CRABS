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
import { Settings } from "./settings";
import { Drawer } from "./drawer";

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

	private selectPermission(object: any): void {
		const target = object.target as HTMLSelectElement;
		const newPermLevel = parseInt(target.value, 10);

		// Update player permissions based on selection
		Player.AllowedInteractions = newPermLevel;
		ServerAccountUpdate.QueueData({ AllowedInteractions: Player.AllowedInteractions });
	}

	/**
	 * Outputs the HTML permission levels
	 *
	 * @returns {string}
	 */
	private drawPermission(): string {
		let output: string = "";
		let selected: number = Player.AllowedInteractions;

		// TODO: update this to support an arbitrary number of permission levels.
		for (let number of [0, 1, 2, 3, 4, 5]) {
			const permission_text = TextGetInScope(
				"Screens/Character/InformationSheet/Text_InformationSheet.csv",
				"AllowedInteraction" + number.toString()
			);
			output += `<option${number === selected ? " selected" : ""
				} value="${number}">${permission_text}</option>`;
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

		this.buildui(
			this.template(bannertemplate, templatevars, true, wrappervars),
			"CRABS_Banner"
		);
	}
	/**
	 * Handles the /roster link click, respecting the rosterOpensDrawer setting.
	 */
	private handleRosterLink(): void {
		if (Settings.instance.data.rosterOpensDrawer) {
			Drawer.updateVisibility();
			Drawer.toggle();
		} else {
			this.fakePlayerCommand("roster");
		}
	}

	public override buildui(output: string, elementId?: string): void {
		super.buildui(output, elementId);
		this.attachPermissionChangeHandler();
		this.attachEvent("CRABS_Permission_Select", this.selectPermission, undefined, undefined, "change");
		this.attachEvent("CRABS_banner_rosterlink", () => this.handleRosterLink());
	}

}
