import { CRABS_Base, Drawer } from "../base";
import { Assets } from "../base";
import { CrossMod } from "../crossmod/crossmod";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import "./templates/help.css";
import helptemplate from "./templates/help.html";

import locales from "./i18n.json";

/**
 * Class representing the help system and documentation viewer.
 * @extends CRABS_Base
 */
export class Help extends CRABS_Base {
  constructor(CRABS: ModSDKModAPI) {
    super(CRABS, "help", locales);
    Drawer.registerView({
      id: "help",
      title: () => this.t("title.help"),
      render: () => this.showHelp(false),
      showSort: false,
      showLayout: false,
    });
  }

  public showHelp(wrapper: boolean = true): string {
    const iconSettings = Assets.printimage({
      key: "settings",
      css_class_override: "CRABS_help_icon_small",
    });

    const isBCTweaksActive = CrossMod.detectMod("BCTweaks");
    const isAFCActive = CrossMod.detectMod("AbundantiaFlorumChromatica");
    const isWCEActive = CrossMod.isWCEInstalled();
    const isBCXActive =
      CrossMod.detectMod("BCX") || (window as any).bcx != null;

    const templateVariables: Record<string, string> = {
      Help_Title:
        `CRABS ${__VERSION__} ${__BRANCH__}`.trim() +
        ` ${this.t("header.documentation_title")}`,
      Branch: __BRANCH__,
      Logo: Assets.printimage({ key: "logo" }),

      // Badges
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

      // Relational Icons
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

      // Integration Specific Icons & Statuses
      Icon_BestFriend: Assets.printimage({
        key: "bestfriend",
        css_class_override: "CRABS_help_icon_small",
      }),
      Icon_LoverExtended: Assets.printimage({
        key: "lover_extended",
        css_class_override: "CRABS_help_icon_small",
      }),
      Status_BCTweaks: isBCTweaksActive ? "active" : "inactive",
      Status_AFC: isAFCActive ? "active" : "inactive",
      Status_WCE: isWCEActive ? "active" : "inactive",
      Status_BCX: isBCXActive ? "active" : "inactive",

      Settings_Intro: this.t("settings_guide.intro", {
        icon: iconSettings,
      }),
    };

    const wrapperVariables = {
      TitleBar: `CRABS: ${this.t("title.default")}`,
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
