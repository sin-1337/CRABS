<div width=100% align="center">
  <img src="https://sin-1337.github.io/CRABS/images/Crab_logo_big.png" alt="CRABS" width="50%" height="50%" align="center">
</div>

<h1 align="center">Crazy Roster Add-on By Sin (CRABS)</h1>

CRABS is a comprehensive enhancement suite for Bondage Club, providing advanced roster management, navigation utilities, and immersive interface improvements.

## Development Status
This repository contains the Alpha branch. Development is active, and this version may be unstable. It is intended for testing and development purposes.

## Installation

### User Script (Violentmonkey / Tampermonkey)
To install via a user script manager:
* Access the userscript: [crabsloader.user.js](https://github.com/sin-1337/CRABS/raw/refs/heads/Alpha/crabsloader.user.js)
* Select the install option in your script manager.
* Refresh your Bondage Club tab to activate the mod.

### Bookmarklet
Alternatively, you may add the following as a bookmark URL:
```javascript
javascript:(()=>{fetch('https://sin-1337.github.io/CRABS/Alpha/bundle.js').then(r=>r.text()).then(r=>eval(r));})();
```
Click the bookmark while on the Bondage Club page to load the mod.

## Core Features

### Interactive Side Drawer
A stowable interface that provides rapid access to mod features without obstructing the main view.
* Automatically manages visibility during character interaction and chat input.
* Provides persistent access to the Roster and Help documentation.
* Configurable auto-stow behavior via settings.

### Enhanced Roster
A sophisticated player tracking system with detailed relational and status information.
* **Relational Mapping:** Clearly identifies Owners, Submissives, Lovers, Friends, and ignored users with distinct iconography.
* **Status Monitoring:** Real-time indicators for character gagging, blindness, and deafness.
* **Map Integration:** Displays collected keys and provides a directional compass for locating players in map rooms.

### Immersive Blindness
Dynamic interface adjustments that reflect your character's sensory state.
* The roster interface blurs according to your character's blindness level.
* Full integration with BCX "Full Blind" rules for a seamless experience.

### Global Communication (Whisper+)
Bypasses standard range restrictions in map rooms to allow messaging any player currently in the roster.

## Commands

### /roster [argument]
The primary command for interacting with the roster system.
* **no argument**: Toggles the side drawer or opens the roster UI.
* **count**: Displays only the room population statistics.
* **admins**: Filters the roster to display only room administrators.
* **vips**: Filters the roster to display only whitelisted room guests.
* **banner**: Re-renders the room information banner.
* **help**: Displays the in-game documentation.
* **version**: Shows current installation details.

### /whisper+ [membernumber] [message]
**Synonyms:** `/w+`
Initiates a global whisper to the specified member number, ignoring map distance limitations.

### /dropkeys [color/all]
Instantly drops specific keys (gold, silver, bronze) or all currently held keys in a map room.

## Iconography Legend

### Relational Icons
| Icon | Description |
| :--- | :--- |
| <img src="https://sin-1337.github.io/CRABS/icons/you.svg" width="24"> | Represents your character |
| <img src="https://sin-1337.github.io/CRABS/icons/owner.svg" width="24"> | Your Owner |
| <img src="https://sin-1337.github.io/CRABS/icons/sub.svg" width="24"> | Your Submissive |
| <img src="https://sin-1337.github.io/CRABS/icons/lover.svg" width="24"> | Your Lover |
| <img src="https://sin-1337.github.io/CRABS/icons/trial.svg" width="24"> | Trial Partner |
| <img src="https://sin-1337.github.io/CRABS/icons/friends.svg" width="24"> | Friend List |

### Room Badges
| Badge | Description |
| :--- | :--- |
| <img src="https://sin-1337.github.io/CRABS/icons/admin.svg" width="24"> | Room Administrator |
| <img src="https://sin-1337.github.io/CRABS/icons/vip.svg" width="24"> | Whitelisted Guest |
| <img src="https://sin-1337.github.io/CRABS/icons/player.svg" width="24"> | Room Guest |

## User Interactions
* **Click Badge**: Triggers a character interaction (Focus screen).
* **Click Name/ID**: Prepares a Whisper+ command for that player.
* **Right-Click Name/ID**: Copies the member number to the clipboard.
* **Hover ID**: Activates the Map Compass to show the player's relative direction.

## Acknowledgements
* **Sera Eldritch Esper**: Exceptional logo design and visual branding.
* **Gangriel**: For the animated logo and helping me inject some more fun into CRABS.
* **Community Contributors**: Various colleagues and friends for technical guidance and code review.
* **Testing Team**: Dedicated individuals who assist in stabilizing the Alpha builds.
