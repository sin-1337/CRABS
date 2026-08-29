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

import { CRABS_Base } from "../base";
import { Assets } from "../assets";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import "./templates/banner.css";
import bannertemplate from "./templates/banner.html";
import { Settings } from "../settings";
import { Drawer } from "../drawer";

import * as Permissions from "./permissions";

declare const __NAME__: string;
declare const __VERSION__: string;

/**
 * Class representing the room information banner.
 */
export class Banner extends CRABS_Base {
  /**
   * Creates an instance of the Banner module.
   *
   * @param {ModSDKModAPI} CRABS - The ModSDK API instance.
   */
  constructor(CRABS: ModSDKModAPI) {
    super(CRABS);
  }

  /**
   * Attaches a change handler to the permission selection element.
   *
   * @returns {void}
   */
  public attachPermissionChangeHandler(): void {
    const select = document.getElementById(
      "CRABS_permission_select",
    ) as HTMLSelectElement;

    if (select) {
      select.addEventListener("change", (event: Event) => {
        const target = event.target as HTMLSelectElement;
        const newPermissionLevel = parseInt(target.value, 10);
        Permissions.setPermissionLevel(newPermissionLevel);
      });
    }
  }

  /**
   * Processes the permission selection event and updates player permissions.
   *
   * @param {any} event - The selection event object.
   * @returns {void}
   */
  private selectPermission(event: any): void {
    const target = event.target as HTMLSelectElement;
    const newPermissionLevel = parseInt(target.value, 10);
    Permissions.setPermissionLevel(newPermissionLevel);
  }

  /**
   * Renders and displays the room information banner.
   *
   * @param {Record<string, string>} [extraData] - Optional additional data to populate the template.
   * @returns {void}
   */
  public drawBanner(extraData?: Record<string, string>): void {
    // bail if ChatRoomData is null or blank
    if (
      typeof ChatRoomData === "undefined" ||
      !ChatRoomData ||
      Object.keys(ChatRoomData).length === 0
    ) {
      console.log("CRABS: ChatRoomData wasn't populated");
      return;
    }

    // set up the template and populate the fields.
    let templatevars = {
      Logo: Assets.printimage({ key: "logo" }),
      LabelColor: `${Player.LabelColor}`,
      PermissionOptions: Permissions.drawPermissionOptions(),
      RoomName: ChatRoomData.Name,
    };

    let wrappervars = {
      TitleBar:
        typeof __NAME__ !== "undefined" && typeof __VERSION__ !== "undefined"
          ? `${__NAME__}:  ${__VERSION__}`
          : "CRABS Banner",
      Close: Assets.printimage({
        key: "close",
        data: ["elementid", "CRABS_Banner"],
      }),
    };

    if (extraData) Object.assign(templatevars, extraData);

    this.buildui(
      this.template(bannertemplate, templatevars, true, wrappervars),
      "CRABS_Banner",
    );
  }

  /**
   * Handles the /roster link click, respecting the rosterOpensDrawer setting.
   *
   * @returns {void}
   */
  private handleRosterLink(): void {
    if (Settings.instance.data.rosterOpensDrawer) {
      Drawer.updateVisibility();
      Drawer.toggle();
    } else {
      this.fakePlayerCommand("roster");
    }
  }

  /**
   * Builds the user interface for the banner and attaches necessary events.
   *
   * @param {string} output - The HTML string to be displayed.
   * @param {string} [elementId] - Optional ID for the banner element.
   * @returns {void}
   */
  public override buildui(output: string, elementId?: string): void {
    super.buildui(output, elementId);
    this.attachPermissionChangeHandler();
    this.attachEvent(
      "CRABS_Permission_Select",
      this.selectPermission,
      undefined,
      undefined,
      "change",
    );
    this.attachEvent("CRABS_banner_rosterlink", () => this.handleRosterLink());
  }
}
