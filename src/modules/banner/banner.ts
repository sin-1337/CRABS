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

import { CRABS_Base, Drawer, Assets, isMap } from "../base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import "./templates/banner.css";
import bannertemplate from "./templates/banner.html";
import { Settings } from "../settings/settings";

import * as Permissions from "./permissions";
import locales from "./i18n.json";

declare const __NAME__: string;
declare const __VERSION__: string;
declare const Player: any;
declare const ChatRoomData: any;

/**
 * Class representing the room information banner.
 * @extends CRABS_Base
 */
export class Banner extends CRABS_Base {
  /**
   * Creates an instance of the Banner module.
   *
   * @param {ModSDKModAPI} CRABS - The ModSDK API instance.
   */
  constructor(CRABS: ModSDKModAPI) {
    super(CRABS, "banner", locales);
  }

  /**
   * Processes the permission selection event and updates player permissions.
   *
   * @param {Event} event - The change event from the select element.
   * @returns {void}
   * @private
   */
  // private selectPermission(event: Event): void {
  //   const target = event.target as HTMLSelectElement;
  //   if (!target) return;
  //   const newPermissionLevel = parseInt(target.value, 10);
  //   Permissions.setPermissionLevel(newPermissionLevel);
  // }

  /**
   * Renders and displays the room information banner.
   *
   * @param {Record<string, string>} [extraData] - Optional additional data to populate the template.
   * @returns {void}
   */
  public drawBanner(extraData?: Record<string, string>): void {
    if (
      typeof ChatRoomData === "undefined" ||
      !ChatRoomData ||
      Object.keys(ChatRoomData).length === 0
    ) {
      console.log("CRABS: ChatRoomData wasn't populated");
      return;
    }

    const templatevars: Record<string, string> = {
      Logo: Assets.printimage({ key: "logo" }),
      LabelColor:
        typeof Player !== "undefined" && Player?.LabelColor
          ? `${Player.LabelColor}`
          : "#ffffff",
      PermissionOptions: Permissions.drawPermissionOptions(),
      RoomName: ChatRoomData.Name ?? "",
    };

    const wrappervars = {
      Help: Assets.printimage({
        key: "help",
        css_class_override: "CRABS_Help_Icon",
      }),
      Settings: Assets.printimage({
        key: "settings",
        css_class_override: "CRABS_Settings_Icon",
      }),
      TitleBar:
        typeof __NAME__ !== "undefined" && typeof __VERSION__ !== "undefined"
          ? `${__NAME__}:  ${__VERSION__}`
          : `CRABS: ${this.t("header.title_default")}`,
      Close: Assets.printimage({
        key: "close",
        tooltip_override: this.t("controls.close_dialog"),
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
   * @private
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

    // Defer DOM queries slightly to ensure the HTML is in the DOM
    setTimeout(() => {
      const bannerEl = document.getElementById(elementId || "CRABS_Banner");
      if (!bannerEl) return;

      // 1. Permission Select Handler
      const select = bannerEl.querySelector(
        "#CRABS_permission_select",
      ) as HTMLSelectElement;
      if (select) {
        select.addEventListener("change", (event: Event) => {
          const target = event.target as HTMLSelectElement;
          if (target) {
            const newLevel = parseInt(target.value, 10);
            Permissions.setPermissionLevel(newLevel);
          }
        });
      }

      // Map Keys Click Handler (targets only the key images/tooltips)
      // Map Keys Click Handler (targets only the key images/tooltips when a map is active)
      const keyIcons = bannerEl.querySelectorAll(
        ".CRABS_keys_trigger img, .CRABS_key-icons",
      );
      keyIcons.forEach((icon) => {
        icon.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          Drawer.open("keys");
        });
      });
    }, 50);

    this.attachEvent("CRABS_banner_rosterlink", () => this.handleRosterLink());
  }
}
