// import section
import bcModSDK from "bondage-club-mod-sdk";
import { Banner, WhisperPlus, Roster, Help, Drawer, Settings, Assets } from "./modules";


//register the mod
const CRABS = bcModSDK.registerMod({
	name: NICKNAME,
	fullName: NAME,
	version: VERSION,
	repository: "https://github.com/sin-1337/CRABS",
});

// print version early, so you know what version is running even if it fails.
console.log(`CRABS v${VERSION} Loading`); // do not remove

new Settings(CRABS);
const BANNER = new Banner(CRABS);
const WHISPERPLUS = new WhisperPlus(CRABS);
const ROSTER = new Roster(CRABS);
const HELP = new Help(CRABS);
new Drawer(CRABS, ROSTER, HELP, WHISPERPLUS);
WHISPERPLUS.setupHooks();

// Hook into chat sending for auto-stow feature
CRABS.hookFunction("ChatRoomSendChat", 10, (args, next) => {
	// Capture the message before next(args) clears the input box
	const chatInput = document.getElementById("InputChat") as HTMLTextAreaElement;
	const msg = chatInput?.value?.toLowerCase().trim() || "";

	const result = next(args);

	if (Settings.instance.data.closeDrawerOnChat) {
		// Exception: Don't auto-close if the user is running a command that specifically opens/toggles the drawer
		if (!msg.startsWith("/roster") && !msg.startsWith("/crabs")) {
			Drawer.close();
		}
	}
	return result;
});

// print version and confirm load success in console
console.log(`CRABS v${VERSION} Loaded`); // do not remove

/**
 * Draws the banner
 *
 * @returns void
 */
function drawbanner() {

	//let output: string = "";
	// if the player left the room, bail!
	if (Player.LastChatRoom === null) {
		// Must return false, even if we are bailing out!
		return false;
	}

	// configure extra roster input to the banner
	// TODO: make this optional in the future
	const extraData = {
		RosterCounters: ROSTER.buildroster("count", false),
	};
	BANNER.drawBanner(extraData);
}

/**
 * Hook the native Exit function to ensure the drawer hides 
 * even if the server message is delayed.
 */
const nativeChatRoomExit = window.ChatRoomExit;

window.ChatRoomExit = function () {
	// Call the original game function
	if (typeof nativeChatRoomExit === "function") {
		nativeChatRoomExit();
	}

	// Trigger our drawer visibility logic
	Drawer.updateVisibility();
};

/**
 * Hook into the CreateRoomSync function.  
 * It triggers when joining a room to execute
 * code at join time.
 */
CRABS.hookFunction("ChatRoomSync", 10000, (args, next) => {
	// Fire the original game function and the rest of the ModSDK chain (including CIA)
	const result = next(args);

	// Escape the ModSDK thread using setTimeout. 
	// Even if CIA crashes the promise chain right after this, the browser will still run this code.
	setTimeout(() => {
		try {
			Drawer.updateVisibility();

			// Re-verify ChatRoomData exists just in case the sync failed entirely
			if (typeof ChatRoomData !== "undefined" && ChatRoomData && Settings.instance.data.showBanner) {
				drawbanner();
			}
		} catch (err) {
			console.error("CRABS: ChatRoomSync failed:", err);
		}
	}, 500);

	return result as never;
});

/**
 * Hook into the screen change function.
 * This ensures the drawer auto-stows whenever the player navigates to a new screen.
 */
CRABS.hookFunction("CommonSetScreen", 0, (args, next) => {
	const result = next(args);
	Drawer.updateVisibility();
	return result;
});

/**
 * Hook into character focus.
 * This ensures the drawer auto-stows when a player's profile/focus screen is opened.
 */
CRABS.hookFunction("ChatRoomFocusCharacter", 0, (args, next) => {
	const result = next(args);
	Drawer.updateVisibility();
	return result;
});

/**
 * Hook into character dialog exit.
 * This ensures the drawer/tab reappears when leaving a character profile or focus screen.
 */
CRABS.hookFunction("DialogLeave", 0, (args, next) => {
	const result = next(args);
	Drawer.updateVisibility();
	return result;
});

function argcheck(args: string): boolean {
	const splitArgs = args.split(" ");
	if (splitArgs[0].toLowerCase() == "help") {
		HELP.buildui(HELP.showHelp(), "CRABS_Help");
		const HELPBUTTON = document.getElementById("CRABS_Help_Icon");
		if (HELPBUTTON) HELPBUTTON.style.display = "none";
		return false;
	} else if (splitArgs[0].toLowerCase() == "version") {
		ChatRoomSendLocal(`${NAME} (${NICKNAME}) <br>Version: ${VERSION}`);
		return false;
	} else if (splitArgs[0].toLowerCase() == "banner") {
		drawbanner();
		return false;
	}
	return true;
}

function commandRedirect(command: string, args: string): void {
	for (let [_, COMMAND] of Commands.entries()) {
		if (COMMAND.Tag === command) {
			COMMAND.Action(args);
			break;
		}
	}
}

// implements the whisper+ command
CommandCombine([
	{
		Tag: "whisper+",
		Description: "Enables the /whisper+ command that does global whisper in a map room",
		Action: (args: string, command: string) => {
			WHISPERPLUS.whisperplus(args, command);
		},
	},
]);

CommandCombine([
	{
		Tag: "w+",
		Description:
			"Enables the /w+ command that does global whisper in a map room",
		Action: (args: string) => {
			commandRedirect("whisper+", args);
		},
	},
]);

// implements the /crabs command
CommandCombine([
	{
		Tag: "crabs",
		Description: "Open the CRABS Roster.",
		Action: (args: string) => {
			commandRedirect("roster", args);
		},
	},
]);

// implements the /crabs command
CommandCombine([
	{
		Tag: "crab",
		Description: "Uh oh! Sin left a highly unstable debug command in! It's highly volital, could do just about anything... even make noise!",
		Action: (args: string) => {
			const trimmedArgs = args.trim().toLowerCase();

			if (!trimmedArgs) {
				const noArgMessages = [
					"The crab is confused. Maybe try telling it what to do?",
					"The crab clicks its claws at you. Maybe try giving it an argument?",
					"A tiny crab scuttles by, ignores your command, and disappears into a hole. It seems to want a command.",
					"You shout at the crab. It does nothing. It looks like it's waiting for a specific word.",
					"The crab is currently on lunch break. Try back later with some instructions.",
					"ERROR: Crab not found. Please provide an argument to locate the crab.",
				];
				ChatRoomSendLocal(noArgMessages[Math.floor(Math.random() * noArgMessages.length)]);
				return;
			}

			if (trimmedArgs === "rave") {
				Assets.PlayAudio("rave");
				Drawer.RaveTab();
				ChatRoomSendLocal("🦀 RAVE TIME! 🦀");
				return;
			}

			const failMessages = [
				`Trying it... nope, not that one.`,
				`The crab looks confused. '${args}'? Is that even a word?`,
				`You try to make the crab ${args}. It pinches you in response. Ouch!`,
				`The crab tries its best to ${args}, but it just ends up spinning in circles.`,
				"The crab remains unimpressed.",
			];
			ChatRoomSendLocal(failMessages[Math.floor(Math.random() * failMessages.length)]);
		},
	},
]);

// implements the /roster command
CommandCombine([
	{
		Tag: "roster",
		Description: "Open the CRABS Roster.",
		Action: (args: string) => {
			if (Settings.instance.data.rosterOpensDrawer && !args) {
				Drawer.updateVisibility();
				Drawer.toggle();
				return;
			}

			if (argcheck(args)) {
				ROSTER.buildui(ROSTER.buildroster(args), "CRABS_Roster");

				// call this to set the whisper plus event in the roster ui
				WHISPERPLUS.buildui();
				ROSTER.initScrollingOverflow();
			}
			const elements = document.querySelectorAll<HTMLDivElement>(
				"div.ChatMessageNonDialogue",
			);

			elements.forEach((element) => {
				element.style.overflow = "visible";
			});
		},
	},
]);

// implements /dropkeys command
CommandCombine([
	{
		Tag: "dropkeys",
		Description:
			"Drops the specified keys: gold, silver, or bronze. You can also use all.",
		Action: (args: string) => {
			const splitArgs = args.toLowerCase().split(" ");
			if (splitArgs.length < 1) {
				ChatRoomSendLocal(
					`You must supply which key to drop, or 'all' to drop them all.`,
				);
				return;
			}
			if (!ChatRoomMapViewIsActive()) {
				ChatRoomSendLocal(`Key only work on a map...`);
				return;
			}
			for (let i = 0; i < splitArgs.length; i++) {
				if (splitArgs[i] == "bronze" || splitArgs[i] == "all") {
					if (Player.MapData.PrivateState.HasKeyBronze) {
						Player.MapData.PrivateState.HasKeyBronze = false;
						ChatRoomSendLocal(`Bronze key dropped.`);
					}
				}
				if (splitArgs[i] == "silver" || splitArgs[i] == "all") {
					if (Player.MapData.PrivateState.HasKeySilver) {
						Player.MapData.PrivateState.HasKeySilver = false;
						ChatRoomSendLocal(`Silver key dropped.`);
					}
				}
				if (splitArgs[i] == "gold" || splitArgs[i] == "all") {
					if (Player.MapData.PrivateState.HasKeyGold) {
						Player.MapData.PrivateState.HasKeyGold = false;
						ChatRoomSendLocal(`Gold key dropped.`);
					}
				}
				if (
					splitArgs[i] != "bronze" &&
					splitArgs[i] != "silver" &&
					splitArgs[i] != "gold" &&
					splitArgs[i] != "all"
				) {
					ChatRoomSendLocal(`Argument '${splitArgs[i]}', was not understood.`);
				}
			}
		},
	},
]);
