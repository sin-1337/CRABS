import { Assets } from "./assets";
import "./templates/notifications.css";

/**
 * Utility class for managing CRABS custom notifications.
 */
export abstract class Notification {

	/**
	 * Triggers a custom toast notification on screen.
	 * 
	 * @param {string} message - The main body text to display.
	 * @param {string} [title="CRABS"] - The header text.
	 * @param {string} [image="logo"] - The asset name for the icon.
	 * @param {number} [duration=3000] - Visibility duration in milliseconds.
	 * @returns {void}
	 */
	public static send(
		message: string,
		title: string = "CRABS",
		image: string = "logo",
		duration: number = 3000,
	): void {
		ToastManager.custom(message, "CRABS_Notification", {
			title: title,
			icon: Assets.getimage(image),
			iconColor: "default",
			duration: duration,
		});
	}

	/**
	 * Instantly removes all active CRABS notifications from the screen.
	 * 
	 * @returns {void}
	 */
	public static dismissAll(): void {
		ToastManager.dismissByCategory("CRABS_Notification");
	}
}
