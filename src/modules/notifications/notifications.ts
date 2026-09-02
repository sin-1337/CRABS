/**
 * CRABS Notification Module
 *
 * Provides a unified notification subsystem for the CRABS mod, encompassing:
 * - In-game rich toast popups via Bondage Club's native `ToastManager`
 * - Scoped toast category dismissal and lifecycle management
 * - Viewport visibility and focus detection for background awareness
 * - Native OS desktop web notifications using the browser's Notification API
 * - Automatic localization bundle ingestion wired into the CRABS i18n engine
 */

import { Assets } from "../assets";
import { CRABS_Base } from "../base";
import "./templates/notifications.css";
import * as locales from "./i18n";

/** Ambient declaration for the base game's global toast engine. */
declare const ToastManager: {
  custom: (
    message: string,
    category: string,
    options: {
      title?: string;
      icon?: string;
      iconColor?: string;
      duration?: number;
    },
  ) => void;
  dismissByCategory: (category: string) => void;
};

/**
 * Configuration options for dispatching an in-game toast message.
 */
export interface NotificationParams {
  /**
   * The localized message body text or a registered i18n token path.
   * Interpolation tokens (e.g. `{key}`) will be resolved if supplied.
   */
  message: string;

  /**
   * The header text displayed above the message body.
   * Defaults to `"CRABS"`. Passing a translation key will resolve it dynamically.
   */
  title?: string;

  /**
   * Graphic identifier referencing an icon in the `Assets.IMAGES` registry.
   * Defaults to `"logo"`.
   */
  image?: string;

  /**
   * Time in milliseconds before the toast automatically fades out.
   * Defaults to `3000` ms (3 seconds).
   */
  duration?: number;

  /**
   * Sub-category classifier used to namespace toasts for bulk dismissal.
   * Defaults to `"General"`.
   */
  type?: string;
}

/**
 * Parameters for triggering an operating system level desktop notification.
 */
export interface DesktopNotificationParams {
  /**
   * The primary title string displayed at the top of the OS push banner.
   */
  title: string;

  /**
   * The secondary body content explaining the alert context.
   */
  body: string;

  /**
   * Optional unique identifier used by the OS window manager to collapse
   * or replace existing notifications with the same identity tag.
   */
  tag?: string;

  /**
   * Image key from `Assets.IMAGES` used as the notification icon graphic.
   */
  icon?: string;
}

/**
 * Static orchestrator for managing in-game toasts and operating system desktop push alerts.
 * Automatically handles lazy initialization and localization dictionary registration.
 *
 * @abstract
 */
export abstract class Notification {
  /**
   * State guard tracking whether the notification translation bundles
   * have been registered with the centralized CRABS localization engine.
   * @private
   */
  private static isInitialized = false;

  /**
   * Bootstraps the module by registering all available localization dictionary
   * bundles into `CRABS_Base` under the `"notifications"` namespace.
   *
   * Executes lazily upon first notification dispatch to avoid startup race conditions.
   *
   * @private
   * @returns {void}
   */
  private static init(): void {
    if (Notification.isInitialized) return;

    for (const [lang, dict] of Object.entries(locales)) {
      CRABS_Base.registerTranslations("notifications", lang, dict);
    }

    Notification.isInitialized = true;
  }

  /**
   * Dispatches a stylized custom toast notification to the game's active viewport.
   *
   * Automatically localizes the message body and title if translation keys are provided.
   * Wraps the icon lookup via `Assets.getimage()` to guarantee safe fallback graphics.
   *
   * @param {NotificationParams} params - Notification configuration payload.
   * @param {string} params.message - Raw text string or dot-delimited translation path.
   * @param {string} [params.title="CRABS"] - Top title string or translation path.
   * @param {string} [params.image="logo"] - Asset dictionary key for the left banner icon.
   * @param {number} [params.duration=3000] - Duration in milliseconds before fading out.
   * @param {string} [params.type="General"] - Category tag appended to `CRABS_Notification_`.
   * @returns {void}
   *
   * @example
   * ```typescript
   * Notification.send({
   *   message: "notifications.errors.feature_disabled",
   *   title: "notifications.errors.error_title",
   *   image: "error",
   *   duration: 5000,
   *   type: "Error",
   * });
   * ```
   */
  public static send({
    message,
    title = "CRABS",
    image = "logo",
    duration = 3000,
    type = "General",
  }: NotificationParams): void {
    Notification.init();

    const localizedMessage = CRABS_Base.translate(message);
    const localizedTitle =
      title !== "CRABS" ? CRABS_Base.translate(title) : "CRABS";

    if (
      typeof ToastManager !== "undefined" &&
      typeof ToastManager.custom === "function"
    ) {
      ToastManager.custom(localizedMessage, `CRABS_Notification_${type}`, {
        title: localizedTitle,
        icon: Assets.getimage(image as any),
        iconColor: "default",
        duration: duration,
      });
    } else {
      // Safe fallback to console output if ToastManager is unavailable
      console.info(`[${localizedTitle}] ${localizedMessage}`);
    }
  }

  /**
   * Purges all active and queued toast notifications belonging to a specific sub-category.
   *
   * @param {string} [type="General"] - The sub-category suffix to purge (matches `CRABS_Notification_${type}`).
   * @returns {void}
   *
   * @example
   * ```typescript
   * // Dismisses all toasts registered under 'CRABS_Notification_Error'
   * Notification.dismiss("Error");
   * ```
   */
  public static dismiss(type: string = "General"): void {
    if (
      typeof ToastManager !== "undefined" &&
      typeof ToastManager.dismissByCategory === "function"
    ) {
      ToastManager.dismissByCategory(`CRABS_Notification_${type}`);
    }
  }

  /**
   * Determines whether the user's browser tab is currently backgrounded, minimized,
   * or has relinquished operational focus. Useful for gating desktop push alerts.
   *
   * @returns {boolean} `true` if the tab is hidden or lacks focus; `false` otherwise.
   */
  public static isBackgrounded(): boolean {
    return (
      typeof document !== "undefined" &&
      (document.hidden || !document.hasFocus())
    );
  }

  /**
   * Prompts the user for OS-level desktop notification permissions via the Web Notifications API.
   * Must be triggered from an explicit user interaction (click, keypress) to satisfy modern browser security models.
   *
   * @returns {Promise<boolean>} Resolves to `true` if granted, or `false` if denied/unsupported.
   */
  public static async requestDesktopPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
      console.warn(
        "[CRABS Notification] Web Notification API is not supported in this environment.",
      );
      return false;
    }

    if (window.Notification.permission === "granted") {
      return true;
    }

    if (window.Notification.permission !== "denied") {
      try {
        const permission = await window.Notification.requestPermission();
        return permission === "granted";
      } catch (error) {
        console.error(
          "[CRABS Notification] Failed to request desktop notification permissions:",
          error,
        );
        return false;
      }
    }

    return false;
  }

  /**
   * Dispatches a native OS desktop notification banner.
   *
   * Automatically resolves translation tokens for both `title` and `body`.
   * Rejects silently if permission has not been granted or if the API is unsupported.
   *
   * @param {DesktopNotificationParams} params - Configuration payload for the OS push notification.
   * @param {string} params.title - Main title or translation key.
   * @param {string} params.body - Detailed notification text or translation key.
   * @param {string} [params.tag] - Optional collapsing tag to replace matching alerts.
   * @param {string} [params.icon] - Asset image key used as the app icon graphic.
   * @returns {void}
   *
   * @example
   * ```typescript
   * Notification.sendDesktop({
   *   title: "notifications.whisper.alert_title",
   *   body: "notifications.whisper.received",
   *   icon: "logo",
   *   tag: "crabs-whisper-alert",
   * });
   * ```
   */
  public static sendDesktop({
    title,
    body,
    tag,
    icon,
  }: DesktopNotificationParams): void {
    Notification.init();

    const BrowserNotify = window.Notification;
    if (!BrowserNotify || BrowserNotify.permission !== "granted") {
      return;
    }

    try {
      const localizedTitle = CRABS_Base.translate(title);
      const localizedBody = CRABS_Base.translate(body);

      new BrowserNotify(localizedTitle, {
        body: localizedBody,
        tag: tag,
        icon: icon ? Assets.getimage(icon as any) : undefined,
      });
    } catch (error) {
      console.error(
        "[CRABS Notification] Failed to dispatch native desktop notification:",
        error,
      );
    }
  }
}
