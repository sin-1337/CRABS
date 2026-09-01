import { Assets } from "../assets";
import { CRABS_Base } from "../base";
import "./templates/notifications.css";
import * as locales from "./i18n";

declare const ToastManager: any;

export interface NotificationParams {
  message: string;
  title?: string;
  image?: string;
  duration?: number;
}

export interface DesktopNotificationParams {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
}

/**
 * Utility class for managing CRABS in-game toasts and desktop notifications.
 */
export abstract class Notification {
  private static isInitialized = false;

  /**
   * Bootstraps and registers the notification localization dictionary once.
   * @private
   */
  private static init(): void {
    if (Notification.isInitialized) return;

    const translations = (CRABS_Base as any).translations;
    if (translations) {
      for (const [lang, dict] of Object.entries(locales)) {
        const normLang = CRABS_Base.normalizeLocale(lang);
        if (!translations[normLang]) {
          translations[normLang] = {};
        }
        translations[normLang]["notifications"] = dict;
      }
    }

    Notification.isInitialized = true;
  }

  /**
   * Dispatches an in-game custom toast notification.
   */
  public static send({
    message,
    title = "CRABS",
    image = "logo",
    duration = 3000,
    type = "General",
  }: NotificationParams & { type?: string }): void {
    Notification.init();

    const localizedMessage = CRABS_Base.translate(message);
    const localizedTitle =
      title !== "CRABS" ? CRABS_Base.translate(title) : "CRABS";

    ToastManager.custom(localizedMessage, `CRABS_Notification_${type}`, {
      title: localizedTitle,
      icon: Assets.getimage(image),
      iconColor: "default",
      duration: duration,
    });
  }

  /**
   * Removes all active toast notifications of a given sub-category.
   */
  public static dismiss(type: string = "General"): void {
    ToastManager.dismissByCategory(`CRABS_Notification_${type}`);
  }

  /**
   * Checks whether the current page is unfocused or tab is backgrounded.
   */
  public static isBackgrounded(): boolean {
    return document.hidden || !document.hasFocus();
  }

  /**
   * Requests browser desktop notification permissions from a user gesture.
   */
  public static async requestDesktopPermission(): Promise<boolean> {
    if (!("Notification" in window)) return false;
    if (window.Notification.permission === "granted") return true;
    if (window.Notification.permission !== "denied") {
      const permission = await window.Notification.requestPermission();
      return permission === "granted";
    }
    return false;
  }

  /**
   * Sends a native OS desktop notification if permissions are granted.
   */
  public static sendDesktop({
    title,
    body,
    tag,
    icon,
  }: DesktopNotificationParams): void {
    Notification.init();

    const BrowserNotify = window.Notification;
    if (!BrowserNotify || BrowserNotify.permission !== "granted") return;

    const localizedTitle = CRABS_Base.translate(title);
    const localizedBody = CRABS_Base.translate(body);

    new BrowserNotify(localizedTitle, {
      body: localizedBody,
      tag: tag,
      icon: icon ? Assets.getimage(icon) : undefined,
    });
  }
}
