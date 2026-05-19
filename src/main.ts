// main.ts
// entry point for CRABS

// import section
import bcModSDK from "bondage-club-mod-sdk";
import { Banner, WhisperPlus, Roster, Help, Drawer, Settings, Assets, Setup, Notification, Updater, ChatManager, PrivacyMode, Performance } from "./modules";

// register the mod
const CRABS = bcModSDK.registerMod({
	name: __NICKNAME__,
	fullName: __NAME__,
	version: __VERSION__,
	repository: "https://github.com/sin-1337/CRABS",
});

// print version early, so you know what version is running even if it fails.
console.log(`CRABS v${__VERSION__} Loading`); // do not remove

// Initialize all core modules
const SETTINGS = new Settings(CRABS);
const BANNER = new Banner(CRABS);
const WHISPERPLUS = new WhisperPlus(CRABS);
const ROSTER = new Roster(CRABS);
const HELP = new Help(CRABS);
new PrivacyMode(CRABS);
new ChatManager(CRABS, ROSTER);
new Drawer(CRABS, ROSTER, HELP, WHISPERPLUS);

// Initialize the crash-proof Setup module to handle lifecycle hooks and room tracking
const SETUP = new Setup(CRABS, ROSTER, BANNER);
new Updater(CRABS, __VERSION__);
new Performance(CRABS);

WHISPERPLUS.setupHooks();
SETTINGS.syncGameState();

// print version and confirm load success in console
console.log(`CRABS v${__VERSION__} Loaded`); // do not remove

/**
 * Validates and processes basic mod commands.
 *
 * @param {string} commandArguments - The string of arguments passed to the command.
 * @returns {boolean} Returns true if the command should proceed to the next handler, false otherwise.
 */
function argcheck(commandArguments: string): boolean {
	const splitArgs = commandArguments.toLowerCase().split(" ");
	const arg = splitArgs[0];

	if (arg === "help") {
		HELP.buildui(HELP.showHelp(), "CRABS_Help");
		const HELPBUTTON = document.getElementById("CRABS_Help_Icon");
		if (HELPBUTTON) HELPBUTTON.style.display = "none";
		return false;
	} else if (arg === "version") {
		ChatRoomSendLocal(`${__NAME__} (${__NICKNAME__}) <br>Version: ${__VERSION__}`);
		return false;
	} else if (arg === "banner") {
		SETUP.drawbanner();
		return false;
	}

	// Allowlist of words that are allowed to print the roster to the chat log
	const validPrintArgs = ["print", "count", "admins", "vips", "all"];

	// If there's no argument, or it's a valid print argument, return true to build the roster
	if (arg === "" || validPrintArgs.includes(arg)) {
		return true;
	}

	// If it's a nonsense word, catch it here and return false so the roster doesn't print
	ChatRoomSendLocal(`Unrecognized argument: '${arg}'. Try '/roster help'`);
	return false;
}

/**
 * Redirects a command to its corresponding action.
 *
 * @param {string} command - The tag of the command to redirect.
 * @param {string} commandArguments - The arguments to pass to the command action.
 * @returns {void}
 */
function commandRedirect(command: string, commandArguments: string): void {
	for (let [_unused, COMMAND] of Commands.entries()) {
		if (COMMAND.Tag === command) {
			COMMAND.Action(commandArguments, command);
			break;
		}
	}
}

// implements the whisper+ command
CommandCombine([
	{
		Tag: "whisper+",
		Description: "Enables the /whisper+ command that does global whisper in a map room",
		Action: (commandArguments: string, command: string) => {
			WHISPERPLUS.whisperplus(commandArguments, command);
		},
	},
]);

// implements the /w+ command as a synonym for the whisper+ command
CommandCombine([
	{
		Tag: "w+",
		Description:
			"Enables the /w+ command that does global whisper in a map room",
		Action: (commandArguments: string) => {
			commandRedirect("whisper+", commandArguments);
		},
	},
]);

// implements the /crabs command as a synonym for /roster
CommandCombine([
	{
		Tag: "crabs",
		Description: "Open the CRABS Roster.",
		Action: (commandArguments: string) => {
			commandRedirect("roster", commandArguments);
		},
	},
]);

// who the heck knows what this does... clearly Sin was sleep deprived.
CommandCombine([
	{
		Tag: "crab",
		Description: "Uh oh! Sin left a highly unstable debug command in! It's highly volatile, could do just about anything... even make noise!",
		Action: (commandArguments: string) => {
			const trimmedArgs = commandArguments.trim().toLowerCase();

			if (!trimmedArgs) {
				const noArgMessages = [
					"The crab is confused. Maybe try telling it what to do?",
					"The crab clicks its claws at you. Maybe try giving it an argument?",
					"A tiny crab scuttles by, ignores you, and disappears into a hole. It seems to want a command.",
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
				Notification.send({
					message: "🦀 RAVE TIME! 🦀",
					image: "rave",
					duration: 10000
				});
				return;
			}

			const failMessages = [
				`Trying it... nope, not that one.`,
				`The crab looks confused. '${commandArguments}'? Is that even a word?`,
				`You try to make the crab ${commandArguments}. It pinches you in response. Ouch!`,
				`The crab tries its best to ${commandArguments}, but it just ends up spinning in circles.`,
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
		Action: (commandArguments: string) => {
			if (Settings.instance.data.rosterOpensDrawer && !commandArguments) {
				Drawer.updateVisibility();
				Drawer.toggle();
				return;
			}

			if (argcheck(commandArguments)) {
				ROSTER.buildui(ROSTER.buildroster(commandArguments), "CRABS_Roster");

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
		Action: (commandArguments: string) => {
			const splitArgs = commandArguments.toLowerCase().split(" ");
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
			for (let index = 0; index < splitArgs.length; index++) {
				if (splitArgs[index] == "bronze" || splitArgs[index] == "all") {
					if (Player.MapData.PrivateState.HasKeyBronze) {
						Player.MapData.PrivateState.HasKeyBronze = false;
						ChatRoomSendLocal(`Bronze key dropped.`);
					}
				}
				if (splitArgs[index] == "silver" || splitArgs[index] == "all") {
					if (Player.MapData.PrivateState.HasKeySilver) {
						Player.MapData.PrivateState.HasKeySilver = false;
						ChatRoomSendLocal(`Silver key dropped.`);
					}
				}
				if (splitArgs[index] == "gold" || splitArgs[index] == "all") {
					if (Player.MapData.PrivateState.HasKeyGold) {
						Player.MapData.PrivateState.HasKeyGold = false;
						ChatRoomSendLocal(`Gold key dropped.`);
					}
				}
				if (
					splitArgs[index] != "bronze" &&
					splitArgs[index] != "silver" &&
					splitArgs[index] != "gold" &&
					splitArgs[index] != "all"
				) {
					ChatRoomSendLocal(`Argument '${splitArgs[index]}', was not understood.`);
				}
			}
		},
	},
]);
