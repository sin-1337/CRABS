/**
 * CRABS Banner Module
 *
 * This module implements the banner functionality for the CRABS mod.
 * It provides:
 * - Custom banner display in chat rooms
 * - Banner template rendering system
 * - CSS styling for banner elements
 * - Integration with the CRABS base class for consistent functionality
 */

import { CRABS_Base } from "../base";
import { Assets } from "../assets";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import "./templates/banner.css";
import bannertemplate from "../templates/banner.html";
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
   * @param {ModSDKModAPI} CRABS - The ModSDK API instance.
   */
  constructor(CRABS: ModSDKModAPI) {
    super(CRABS);
  }

  /**
   * Event listener delegate for permission dropdown updates.
   */
  private selectPermission = (event: Event): void => {
    const target = event.target as HTMLSelectElement;
    if (target && target.value !== undefined) {
      const newPermissionLevel = parseInt(target.value, 10);
      Permissions.setPermissionLevel(newPermissionLevel);
    }
  };

  /**
   * Handles clicking the /roster link in the banner.
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
   * Renders and displays the room information banner.
   * @param {Record<string, string>} [extraData] - Optional template override parameters.
   */
  public drawBanner(extraData?: Record<string, string>): void {
    const globalWindow = window as any;
    const chatRoomData = globalWindow.ChatRoomData;
    const player = globalWindow.Player;

    if (!chatRoomData || Object.keys(chatRoomData).length === 0) {
      console.log("CRABS: ChatRoomData wasn't populated");
      return;
    }

    const templatevars: Record<string, string> = {
      Logo: Assets.printimage({ key: "logo" }),
      LabelColor: `${player?.LabelColor || "#FFFFFF"}`,
      PermissionOptions: Permissions.drawPermissionOptions(),
      RoomName: chatRoomData.Name || "Room",
    };

    const wrappervars = {
      TitleBar:
        typeof __NAME__ !== "undefined" && typeof __VERSION__ !== "undefined"
          ? `${__NAME__}: ${__VERSION__}`
          : "CRABS Banner",
      Close: Assets.printimage({
        key: "close",
        data: ["elementid", "CRABS_Banner"],
      }),
    };

    if (extraData) {
      Object.assign(templatevars, extraData);
    }

    this.buildui(
      this.template(bannertemplate, templatevars, true, wrappervars),
      "CRABS_Banner",
    );
  }

  /**
   * Builds the user interface for the banner and attaches listeners.
   * @param {string} output - The compiled HTML string.
   * @param {string} [elementId] - Optional element ID for root container.
   */
  public override buildui(output: string, elementId?: string): void {
    super.buildui(output, elementId);
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
