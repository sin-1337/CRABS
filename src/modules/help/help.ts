/**
 * CRABS Help Module
 *
 * This module implements the help system for the CRABS mod.
 * It provides:
 * - Help command functionality
 * - Help template rendering
 * - Documentation display for mod features
 * - Integration with the CRABS base class and asset system
 *
 * The help module makes it easy for users to access information about
 * the CRABS mod's features and commands.
 */

import { CRABS_Base } from "../base";
import { Assets } from "../assets";
import { CrossMod } from "../crossmod";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import "./templates/help.css";
import helptemplate from "./templates/help.html";

import * as locales from "./i18n";

/**
 * Class representing the help system and documentation viewer.
 * @extends CRABS_Base
 */
export class Help extends CRABS_Base {
  /**
   * Initializes the Help module and registers its localization dictionary.
   *
   * @param {ModSDKModAPI} CRABS - The ModSDK API instance.
   */
  constructor(CRABS: ModSDKModAPI) {
    super(CRABS, "help", locales);
  }

  /**
   * Generates and compiles the HTML documentation view.
   *
   * @param {boolean} [wrapper=true] - Whether to surround the output with the main mod window wrapper.
   * @returns {string} The processed HTML string for the help interface.
   */
  public showHelp(wrapper: boolean = true): string {
    const iconSettings = Assets.printimage({
      key: "settings",
      css_class_override: "CRABS_help_icon_small",
    });

    const templateVariables: Record<string, string> = {
      Help_Title:
        `CRABS ${__VERSION__} ${__BRANCH__}`.trim() +
        ` ${this.t("header.documentation_title")}`,
      Branch: __BRANCH__,
      Logo: Assets.printimage({ key: "logo" }),
      Icon_You: Assets.printimage({
        key: "you",
        css_class_override: "CRABS_help_icon_small",
      }),
      Icon_Owner: Assets.printimage({
        key: "owner",
        css_class_override: "CRABS_help_icon_small",
      }),
      Icon_Sub: Assets.printimage({
        key: "sub",
        css_class_override: "CRABS_help_icon_small",
      }),
      Icon_Trial: Assets.printimage({
        key: "trial",
        css_class_override: "CRABS_help_icon_small",
      }),
      Icon_Lover: Assets.printimage({
        key: "lover",
        css_class_override: "CRABS_help_icon_small",
      }),
      Icon_Family: Assets.printimage({
        key: "family",
        css_class_override: "CRABS_help_icon_small",
      }),
      Icon_BestFriend: CrossMod.detectMod("BCTweaks")
        ? Assets.printimage({
            key: "bestfriend",
            css_class_override: "CRABS_help_icon_small",
          })
        : `<i>(${this.t("general.not_applicable")})</i>`,
      Icon_Friend: Assets.printimage({
        key: "friend",
        css_class_override: "CRABS_help_icon_small",
      }),
      Icon_Whitelist: Assets.printimage({
        key: "whitelist",
        css_class_override: "CRABS_help_icon_small",
      }),
      Icon_Blacklist: Assets.printimage({
        key: "blacklist",
        css_class_override: "CRABS_help_icon_small",
      }),
      Icon_Ghost: Assets.printimage({
        key: "ghost",
        css_class_override: "CRABS_help_icon_small",
      }),
      Badge_Admin: Assets.printimage({
        key: "admin",
        css_class_override: "CRABS_help_icon_small",
      }),
      Badge_VIP: Assets.printimage({
        key: "vip",
        css_class_override: "CRABS_help_icon_small",
      }),
      Badge_Player: Assets.printimage({
        key: "player",
        css_class_override: "CRABS_help_icon_small",
      }),
      Settings_Intro: this.t("settings_guide.intro", {
        icon: iconSettings,
      }),
    };

    const wrapperVariables = {
      TitleBar: `CRABS: ${this.t("header.title_default")}`,
      Close: Assets.printimage({
        key: "close",
        tooltip_override: this.t("controls.close_dialog"),
        data: ["elementid", "CRABS_Help"],
      }),
    };

    return this.template(
      helptemplate,
      templateVariables,
      wrapper,
      wrapperVariables,
    );
  }
}
