import { Assets } from "./assets";

/**
 * Utility class for managing CRABS custom notifications.
 */
export abstract class Notification {

	/**
	 * Triggers a custom toast notification on screen.
	 * @param message - The main body text to display.
	 * @param title - The header text (Default: "CRABS").
	 * @param image - The asset name for the icon (Default: "CRABS_logo").
	 * @param duration - Visibility duration in milliseconds (Default: 4000).
	 */
	public static send(
		message: string,
		title: string = "CRABS",
		image: string = "CRABS_logo",
		duration: number = 4000,
	) {
		ToastManager.custom(message, "CRABS_Notification", {
			title: title,
			icon: Assets.getimage(image),
			iconColor: "default",
			duration: duration,
		});
	}

	/**
	 * Instantly removes all active CRABS notifications from the screen.
	 */
	public static dismissAll() {
		ToastManager.dismissByCategory("CRABS_Notification");
	}
}
