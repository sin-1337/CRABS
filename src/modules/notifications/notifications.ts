import { Assets } from "../assets";
import { CRABS_Base } from "../base";
import "./templates/notifications.css";
import en from "./i18n/en.json";

/**
 * Utility class for managing CRABS custom notifications.
 */
export abstract class Notification {
  private static isInitialized = false;

  /**
   * Bootstraps and registers the notification localization dictionary once.
   * @private
   */
  private static init(): void {
    if (Notification.isInitialized) return;

    const normLang = CRABS_Base.normalizeLocale("en");
    const translations = (CRABS_Base as any).translations;
    if (translations) {
      if (!translations[normLang]) translations[normLang] = {};
      translations[normLang]["notifications"] = en;
    }
    Notification.isInitialized = true;
  }

  /**
   * Dispatches a custom toast notification to the screen.
   *
   * @param {NotificationParams & { type?: string }} params - Toast configuration parameters.
   * @param {string} params.message - Content string or dot-notated translation key.
   * @param {string} [params.title="CRABS"] - Brand title (defaults to fixed acronym).
   * @param {string} [params.image="logo"] - Asset identifier for the leading notification icon.
   * @param {number} [params.duration=3000] - Duration in milliseconds before dismissing.
   * @param {string} [params.type="General"] - Sub-category namespace for grouped dismissals.
   * @returns {void}
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
   * Removes all active notifications of a given sub-category.
   *
   * @param {string} [type="General"] - The sub-category identifier to dismiss.
   * @returns {void}
   */
  public static dismiss(type: string = "General"): void {
    ToastManager.dismissByCategory(`CRABS_Notification_${type}`);
  }
}
