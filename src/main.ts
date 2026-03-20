// import section
import bcModSDK from "bondage-club-mod-sdk";
import { Banner, WhisperPlus, Roster, Help } from "./modules";


//register the mod
const CRABS = bcModSDK.registerMod({
	name: NICKNAME,
	fullName: NAME,
	version: VERSION,
	repository: "https://github.com/sin-1337/CRABS",
});

// print version early, so you know what version is running even if it fails.
console.log(`CRABS v${VERSION} Loading`); // do not remove

const BANNER = new Banner(CRABS);
const WHISPERPLUS = new WhisperPlus(CRABS);
const ROSTER = new Roster(CRABS);
const HELP = new Help(CRABS);

// Initialize Whisper+ hooks for continuous conversation
WHISPERPLUS.setupHooks();
// Message handler styles the whisper+ messages
WHISPERPLUS.setupMessageHandlers();

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

// TODO: create ui to turn this off!!
// TODO: This only triggers on rooms I didn't make, why?
// set up a handler for room entry
// This sets up the banner!
ChatRoomRegisterMessageHandler({
	Description: "Send room stats on entry.",
	Priority: 0, // trigger immediately
	Callback: (data: any) => {
		// check if we are a player and we entered a room
		if (
			data.Type === "Action" &&
			data.Content === "ServerEnter" &&
			data.Sender === Player.MemberNumber
		) {
			// work on a delay
			setTimeout(() => {
				// configure extra roster input to the banner
				if (!ChatRoomData) return; // bail if ChatRoomData isn't initialized
				drawbanner();
			}, 3600);
		}

		// Must return false to allow other handlers to work with the data.
		return false;
	},
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
		Description: "Show the player count, helpful in maps.",
		Action: (args: string) => {
			commandRedirect("roster", args);
		},
	},
]);

// implements the /roster command
CommandCombine([
	{
		Tag: "roster",
		Description: "Show the player count, helpful in maps.",
		Action: (args: string) => {
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
