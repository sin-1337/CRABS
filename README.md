<div width=100% align="center">
  <img src="https://sin-1337.github.io/CRABS/images/Crab_logo_big.png" alt="CRABS" width="50%" height="50%" align="center">
</div>

<h1 align="center">Crazy Roster Add-on By Sin - Beta</h1>

## Warnings: 
* This is the Beta branch where testing takes place!
* This branch is mostly stable with more regular updates and changes
* Not recommened if stability is most important to you.

## Installation:
### FUSAM:
* Install FUSAM if you do not already have it:  https://sidiousious.gitlab.io/bc-addon-loader/
* Find the ADD-ON button at the top of the main settings page once you log in.
* Scroll to the botton where you will see the CRABS addon and in the far right column, slelect "Stable".
* Click Save
* Reload BC.

### User Script (Violentmonkey / Tampermonkey):
  To install useing the user script method 
  * click the userscript: [crabsloader.user.js](https://github.com/sin-1337/CRABS/raw/refs/heads/Beta/crabsloader.user.js)
  * Click the [install] button
  * Reload the Bondage Club tab if you have it open already.

### Bookmarklet
Alternatively, you may add the following as a bookmark URL:
```javascript
javascript:(()=>{fetch('https://sin-1337.github.io/CRABS/Beta/bundle.js').then(r=>r.text()).then(r=>eval(r));})();
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

### Cross-Mod Compatibility
CRABS is designed to work seamlessly with other popular Bondage Club enhancements:
* **BCX (Bondage Club Extension)**: Respects "Full Blind" rules and character state enforcement within the immersive roster.
* **BCTweaks**: Integrates with the "Best Friends" list to display unique iconography and prioritize close relationships in the roster display.

### Global Communication (Whisper+)
Bypasses standard range restrictions in map rooms to allow messaging any player currently in the roster.

## Commands

### /roster [argument]
**Synonyms:** `/crabs`
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
| <img src="https://sin-1337.github.io/CRABS/images/you.svg" width="24"> | Represents your character |
| <img src="https://sin-1337.github.io/CRABS/images/owner.svg" width="24"> | Your Owner |
| <img src="https://sin-1337.github.io/CRABS/images/sub.svg" width="24"> | Your Submissive |
| <img src="https://sin-1337.github.io/CRABS/images/lover.svg" width="24"> | Your Lover |
| <img src="https://sin-1337.github.io/CRABS/images/trial.svg" width="24"> | Trial Partner |
| <img src="https://sin-1337.github.io/CRABS/images/family.svg" width="24"> | Family Member |
| <img src="https://sin-1337.github.io/CRABS/images/bestfriend.svg" width="24"> | Best Friend (BCTweaks) |
| <img src="https://sin-1337.github.io/CRABS/images/friends.svg" width="24"> | Friend List |

### Room Badges
| Badge | Description |
| :--- | :--- |
| <img src="https://sin-1337.github.io/CRABS/images/admin.svg" width="24"> | Room Administrator |
| <img src="https://sin-1337.github.io/CRABS/images/vip.svg" width="24"> | Whitelisted Guest |
| <img src="https://sin-1337.github.io/CRABS/images/player.svg" width="24"> | Room Guest |

## User Interactions
* **Click Badge**: Triggers a character interaction (Focus screen).
* **Click Name/ID**: Prepares a Whisper+ command for that player.
* **Right-Click Name/ID**: Copies the member number to the clipboard.
* **Hover ID**: Activates the Map Compass to show the player's relative direction.

## Acknowledgements
* **Sera Eldritch Esper**: Exceptional logo design and visual branding.
* **Gangriel**: For the animated logo and helping me inject some more fun into CRABS.
* Thanks to many friends for various code advice and assistance!
* Thanks to all the testers and people who have supported me throughout the development of this project!
