/**
 * CRABS Assets Module
 *
 * This module handles all asset management for the CRABS mod, including:
 * - Image assets (logos, icons, and other graphical elements)
 * - Asset storage and retrieval system
 * - Image printing functionality for displaying icons in chat
 *
 * The module provides a centralized location for all image assets used throughout
 * the mod, for managing and updating graphical elements.
 */

import { CRABS_Base } from "../base";
import * as locales from "./i18n";

type ImageStore = {
  readonly basePath: string;
  readonly image: {
    readonly [key: string]: {
      readonly file: string;
      readonly subdir?: string;
      readonly altKey?: string;
      readonly toolTipKey?: string;
      readonly class?: string;
    };
  };
};

/**
 * Static class for managing and retrieving mod assets.
 */
export abstract class Assets {
  private static isInitialized = false;

  /**
   * Bootstraps and registers the asset localization dictionary once.
   * @private
   */
  private static init(): void {
    if (Assets.isInitialized) return;

    for (const [lang, bundle] of Object.entries(locales)) {
      CRABS_Base.registerTranslations("assets", lang, bundle);
    }
    Assets.isInitialized = true;
  }

  protected static readonly IMAGES: ImageStore = {
    basePath: "https://sin-1337.github.io/CRABS/images/",

    image: {
      logo: {
        file: "CRABS_Logo.png",
        altKey: "alt.logo",
        class: "CRABS_logo",
      },
      static_logo: {
        file: "CRABS_Logo.png",
        altKey: "alt.logo",
        class: "CRABS_logo",
      },
      animated_logo: {
        file: "CRABS_Logo.gif",
        altKey: "alt.logo",
        class: "CRABS_logo",
      },
      rave: {
        file: "CRABS_logo_rave.gif",
        altKey: "alt.rave",
        class: "CRABS_logo",
      },
      menu_cards: {
        file: "Menu_Cards.svg",
        altKey: "alt.menu_cards",
        class: "CRABS_menu_icon",
      },
      menu_rows: {
        file: "Menu_Rows.svg",
        altKey: "alt.menu_rows",
        class: "CRABS_menu_icon",
      },
      menu_rows_compressed: {
        file: "Menu_Rows_Compressed.svg",
        altKey: "alt.menu_rows_compressed",
        class: "CRABS_menu_icon",
      },
      error: {
        file: "error.svg",
        altKey: "alt.error",
        toolTipKey: "tooltips.error",
        class: "CRABS_error_icon",
      },
      close: {
        file: "close.svg",
        altKey: "alt.close",
        toolTipKey: "tooltips.close",
        class: "CRABS_close",
      },
      roster: {
        file: "roster.svg",
        altKey: "alt.roster",
        toolTipKey: "tooltips.roster",
        class: "CRABS_Roster_Icon",
      },
      help: {
        file: "help.svg",
        altKey: "alt.help",
        toolTipKey: "tooltips.help",
        class: "CRABS_Help_Icon",
      },
      history: {
        file: "history.svg",
        altKey: "alt.history",
        toolTipKey: "tooltips.history",
        class: "CRABS_History_Icon",
      },
      settings: {
        file: "settings.svg",
        altKey: "alt.settings",
        toolTipKey: "tooltips.settings",
        class: "CRABS_Settings_Icon",
      },
      admin: {
        file: "admin.svg",
        altKey: "alt.admin",
        toolTipKey: "tooltips.admin",
        class: "CRABS_badge",
      },
      vip: {
        file: "vip.svg",
        altKey: "alt.vip",
        toolTipKey: "tooltips.vip",
        class: "CRABS_badge",
      },
      player: {
        file: "player.svg",
        altKey: "alt.player",
        toolTipKey: "tooltips.player",
        class: "CRABS_badge",
      },
      you: {
        file: "you.svg",
        altKey: "alt.you",
        toolTipKey: "tooltips.you",
        class: "CRABS_icon",
      },
      owner: {
        file: "owner.svg",
        altKey: "alt.owner",
        toolTipKey: "tooltips.owner",
        class: "CRABS_icon",
      },
      sub: {
        file: "sub.svg",
        altKey: "alt.sub",
        toolTipKey: "tooltips.sub",
        class: "CRABS_icon",
      },
      family: {
        file: "family.svg",
        altKey: "alt.family",
        toolTipKey: "tooltips.family",
        class: "CRABS_icon",
      },
      trial: {
        file: "trial.svg",
        altKey: "alt.trial",
        toolTipKey: "tooltips.trial",
        class: "CRABS_icon",
      },
      lover: {
        file: "lover.svg",
        altKey: "alt.lover",
        toolTipKey: "tooltips.lover",
        class: "CRABS_icon",
      },
      lover_extended: {
        file: "lover_extended.svg",
        altKey: "alt.lover",
        toolTipKey: "tooltips.lover",
        class: "CRABS_icon",
      },
      bestfriend: {
        file: "bestfriend.svg",
        altKey: "alt.bestfriend",
        toolTipKey: "tooltips.bestfriend",
        class: "CRABS_icon",
      },
      friend: {
        file: "friends.svg",
        altKey: "alt.friend",
        toolTipKey: "tooltips.friend",
        class: "CRABS_icon",
      },
      whitelist: {
        file: "whitelist.svg",
        altKey: "alt.whitelist",
        toolTipKey: "tooltips.whitelist",
        class: "CRABS_icon",
      },
      blacklist: {
        file: "blacklist.svg",
        altKey: "alt.blacklist",
        toolTipKey: "tooltips.blacklist",
        class: "CRABS_icon",
      },
      ghost: {
        file: "ghost.svg",
        altKey: "alt.ghost",
        toolTipKey: "tooltips.ghost",
        class: "CRABS_icon",
      },
      thought: {
        file: "thought.svg",
        altKey: "alt.thought",
        class: "CRABS_icon",
      },
      compass: {
        file: "compass.svg",
        altKey: "alt.compass",
        toolTipKey: "tooltips.compass",
        class: "CRABS_icon",
      },
      connected: {
        file: "connected.svg",
        altKey: "alt.connected",
        toolTipKey: "tooltips.connected",
      },
      keyGold: {
        file: "keyGold.png",
        altKey: "alt.key_gold",
        toolTipKey: "tooltips.key_gold",
        class: "CRABS_key-icons",
      },
      keySilver: {
        file: "keySilver.png",
        altKey: "alt.key_silver",
        toolTipKey: "tooltips.key_silver",
        class: "CRABS_key-icons",
      },
      keyBronze: {
        file: "keyBronze.png",
        altKey: "alt.key_bronze",
        toolTipKey: "tooltips.key_bronze",
        class: "CRABS_key-icons",
      },
      keyNull: {
        file: "keyNull.svg",
        altKey: "alt.key_null",
        toolTipKey: "tooltips.key_null",
        class: "CRABS_key-icons",
      },
      blindNone: {
        file: "blindNone.svg",
        altKey: "alt.blind_none",
        toolTipKey: "tooltips.blind_none",
      },
      blindLight: {
        file: "BlindLight.png",
        altKey: "alt.blind_light",
        toolTipKey: "tooltips.blind_light",
      },
      blindNormal: {
        file: "BlindNormal.png",
        altKey: "alt.blind_normal",
        toolTipKey: "tooltips.blind_normal",
      },
      blindHeavy: {
        file: "BlindHeavy.png",
        altKey: "alt.blind_heavy",
        toolTipKey: "tooltips.blind_heavy",
      },
      blindTotal: {
        file: "BlindHeavy.png",
        altKey: "alt.blind_total",
        toolTipKey: "tooltips.blind_total",
      },
      deafNone: {
        file: "deafNone.svg",
        altKey: "alt.deaf_none",
        toolTipKey: "tooltips.deaf_none",
      },
      deafLight: {
        file: "DeafLight.png",
        altKey: "alt.deaf_light",
        toolTipKey: "tooltips.deaf_light",
      },
      deafNormal: {
        file: "DeafNormal.png",
        altKey: "alt.deaf_normal",
        toolTipKey: "tooltips.deaf_normal",
      },
      deafHeavy: {
        file: "DeafHeavy.png",
        altKey: "alt.deaf_heavy",
        toolTipKey: "tooltips.deaf_heavy",
      },
      deafTotal: {
        file: "DeafHeavy.png",
        altKey: "alt.deaf_total",
        toolTipKey: "tooltips.deaf_total",
      },
      gagNone: {
        file: "gagNone.svg",
        altKey: "alt.gag_none",
        toolTipKey: "tooltips.gag_none",
      },
      gagVeryLight: {
        file: "GagLight.png",
        altKey: "alt.gag_very_light",
        toolTipKey: "tooltips.gag_very_light",
      },
      gagEasy: {
        file: "GagLight.png",
        altKey: "alt.gag_easy",
        toolTipKey: "tooltips.gag_easy",
      },
      gagLight: {
        file: "GagLight.png",
        altKey: "alt.gag_light",
        toolTipKey: "tooltips.gag_light",
      },
      gagNormal: {
        file: "GagNormal.png",
        altKey: "alt.gag_normal",
        toolTipKey: "tooltips.gag_normal",
      },
      gagMedium: {
        file: "GagNormal.png",
        altKey: "alt.gag_medium",
        toolTipKey: "tooltips.gag_medium",
      },
      gagHeavy: {
        file: "GagHeavy.png",
        altKey: "alt.gag_heavy",
        toolTipKey: "tooltips.gag_heavy",
      },
      gagVeryHeavy: {
        file: "GagHeavy.png",
        altKey: "alt.gag_very_heavy",
        toolTipKey: "tooltips.gag_very_heavy",
      },
      gagTotal: {
        file: "GagTotal.png",
        altKey: "alt.gag_total",
        toolTipKey: "tooltips.gag_total",
      },
      gagTotal2: {
        file: "GagTotal.png",
        altKey: "alt.gag_total",
        toolTipKey: "tooltips.gag_total",
      },
      gagTotal3: {
        file: "GagTotal.png",
        altKey: "alt.gag_total",
        toolTipKey: "tooltips.gag_total",
      },
      gagTotal4: {
        file: "GagTotal.png",
        altKey: "alt.gag_total",
        toolTipKey: "tooltips.gag_total",
      },
    },
  } as const;

  protected static readonly AUDIO: AudioStore = {
    basePath: "https://sin-1337.github.io/CRABS/audio/",
    rave: {
      file: "Rave.mp3",
    },
  };

  /**
   * Returns the full URL for a given image asset key.
   *
   * @param {Extract<keyof typeof Assets.IMAGES.image, string>} key - Image key from the assets object.
   * @returns {string} Full path URL to the image asset.
   */
  public static getimage(
    key: Extract<keyof typeof Assets.IMAGES.image, string>,
  ): string {
    const imgObj = Assets.IMAGES.image[key];

    if (!imgObj) {
      console.warn(`Missing image key: ${key}`);
      return `${Assets.IMAGES.basePath}${Assets.IMAGES.image["error"].file}`;
    }

    return `${Assets.IMAGES.basePath}${imgObj.file}`;
  }

  /**
   * Generates an HTML string for displaying an image asset.
   *
   * @param {PrintImage} params - Object containing image configuration.
   * @param {string} params.key - Image key from the assets object.
   * @param {string} [params.css_class_override] - Optional CSS class to apply to the image.
   * @param {string} [params.css_style] - Optional inline CSS style to apply to the image.
   * @param {string} [params.tooltip_override] - Optional tooltip text to display.
   * @param {string} [params.alt_override] - Optional alt text for the image.
   * @param {[string, string]} [params.data] - Optional data attribute as a [key, value] pair.
   * @returns {string} HTML string representing the icon and optional tooltip wrapper.
   */
  public static printimage({
    key,
    css_class_override,
    css_style = "",
    tooltip_override = "",
    alt_override,
    data,
  }: PrintImage): string {
    Assets.init();

    const images = Assets.IMAGES.image;

    if (!(key in images)) {
      console.warn(
        `CRABS Assets: Key "${key}" not found in store! Falling back to error icon.`,
      );
      css_class_override = undefined;
    }

    const imgData = key in images ? images[key] : images["error"];

    const defaultAlt = imgData.altKey
      ? CRABS_Base.translate(`assets.${imgData.altKey}`)
      : key;
    const defaultTooltip = imgData.toolTipKey
      ? CRABS_Base.translate(`assets.${imgData.toolTipKey}`)
      : "";

    const css_class = css_class_override || imgData.class || "";
    const tooltip = tooltip_override || defaultTooltip;
    const alt = alt_override || defaultAlt;

    let html = "";
    if (tooltip !== "") html += `<div class='CRABS_tooltip-wrapper'>`;

    html += `<img `;
    if (data) html += `data-${data[0]}="${data[1]}" `;
    if (alt !== "") html += `alt="${alt}" `;
    html += `src="${Assets.IMAGES.basePath}${imgData.file}" `;
    if (css_class !== "") html += `class="${css_class}" `;
    if (css_style !== "") html += `style="${css_style}" `;
    html += `>`;

    if (tooltip !== "") {
      html += `<div class='CRABS_tooltip'>${tooltip}</div></div>`;
    }

    return html;
  }

  /**
   * Plays an audio asset based on the provided key.
   *
   * @param {Exclude<keyof typeof Assets.AUDIO, "basePath">} key - Audio key from the assets object.
   * @returns {void}
   */
  public static PlayAudio(
    key: Exclude<keyof typeof Assets.AUDIO, "basePath">,
  ): void {
    const audioObj = Assets.AUDIO[key];

    if (audioObj && typeof audioObj === "object" && "file" in audioObj) {
      const url = `${Assets.AUDIO.basePath}${audioObj.file}`;
      const audio = new Audio(url);
      audio
        .play()
        .catch((error) => console.error(`Failed to play audio: ${key}`, error));
    } else {
      console.warn(`Missing or invalid audio key: ${key}`);
    }
  }
}
