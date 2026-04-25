import { Assets } from "./assets";
import "./templates/notifications.css";

/**
 * Utility class for managing CRABS custom notifications.
 */
export abstract class Notification {

	/**
	 * Triggers a custom toast notification on screen.
	 * * @param {NotificationParams} params - Object containing notification configuration.
	 * @param {string} params.message - The main body text to display.
	 * @param {string} [params.title="CRABS"] - The header text.
	 * @param {string} [params.image="logo"] - The asset name for the icon.
	 * @param {number} [params.duration=3000] - Visibility duration in milliseconds.
	 * @returns {void}
	 */
	public static send({
		message,
		title = "CRABS",
		image = "logo",
		duration = 3000,
	}: NotificationParams): void {
		ToastManager.custom(message, "CRABS_Notification", {
			title: title,
			icon: Assets.getimage(image),
			iconColor: "default",
			duration: duration,
		});
	}

	/**
	 * Instantly removes all active CRABS notifications from the screen.
	 * * @returns {void}
	 */
	public static dismissAll(): void {
		ToastManager.dismissByCategory("CRABS_Notification");
	}
}
