import { Assets } from "./assets";
import "./templates/notifications.css";

/**
 * Utility class for managing CRABS custom notifications.
 */
export abstract class Notification {

	/**
	 * @param {string} [params.type="General"] - Sub-category (e.g., "Update", "Alert").
	 */
	public static send({
		message,
		title = "CRABS",
		image = "logo",
		duration = 3000,
		type = "General"
	}: NotificationParams & { type?: string }): void {
		// We prefix everything with CRABS_ to keep our namespace clean
		ToastManager.custom(message, `CRABS_${type}`, {
			title: title,
			icon: Assets.getimage(image),
			iconColor: "default",
			duration: duration,
		});
	}

	/**
	 * Removes notifications. 
	 * If no type is provided, it clears the default general notifications.
	 */
	public static dismiss(type: string = "General"): void {
		ToastManager.dismissByCategory(`CRABS_${type}`);
	}
}
