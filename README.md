<div width="100%" align="center">
  <img src="https://sin-1337.github.io/CRABS/images/Crab_logo_big.png" alt="CRABS" width="50%" align="center">
</div>

<h1 align="center">Crazy Roster Add-on By Sin (CRABS)</h1>

## 📥 Installation

### FUSAM (Recommended)
* Install FUSAM if you do not already have it: https://sidiousious.gitlab.io/bc-addon-loader/
* Find the **ADD-ON** button at the top of the main settings page once you log in.
* Scroll to the bottom where you will see the **CRABS** addon. In the far right column, select **Stable** (or your preferred branch).
* Click Save and reload BC.

### User Script (Violentmonkey / Tampermonkey)
* Click the userscript link: [crabsloader.user.js](https://github.com/sin-1337/CRABS/raw/refs/heads/Stable/crabsloader.user.js)
* Click the **[install]** button in your extension manager.
* Reload the Bondage Club tab if you have it open already.

### Bookmarklet
Alternatively, you may add the following as a bookmark URL:
` ` `javascript
javascript:(()=>{fetch('https://sin-1337.github.io/CRABS/Stable/bundle.js').then(r=>r.text()).then(r=>eval(r));})();
` ` `
*(Note: Remove spaces between backticks when copying)*
Click the bookmark while on the Bondage Club page to load the mod.

---

## ✨ Key Features

### 🗄️ Interactive Side Drawer
A sleek, stowable roster interface that provides rapid access to mod features without obstructing your main view. 
* Automatically adjusts roster content seamlessly when moving between map and non-map areas in hybrid rooms.
* Auto-hides when focusing on characters or typing in chat (configurable).
* **Live Sorting:** Use the dropdown to instantly sort players by Room Role, D/s Family Tree, Lovers, or Friends.

### 🧭 Map Compass
Easily locate players in large map rooms.
* **Hover:** Hover over a player's Name or ID to display a temporary directional arrow on the map.
* **Sticky Tracking:** Mobile/Drawer users can tap the Compass Icon on a player's card to lock the compass to them! Tracking is mutually exclusive and auto-clears when the drawer is stowed.

### ⚡ Smart Performance Scaling
CRABS actively monitors your game's true frame delta (ignoring manual FPS caps) to detect lag. If performance dips consistently, it dynamically disables the animated logo, reduces blur quality, and lowers update rates to keep your game running smoothly.

### 👁️ Immersive Blindness & Gags
Dynamic interface adjustments that reflect your character's sensory state.
* The roster interface blurs according to your character's blindness level.
* Whisper+ is blocked if your character is gagged.
* **Hardcore Lock:** Prevents you from disabling immersion settings while your character is restrained!
* Fully respects BCX "Full Blind" rules when enabled.

### 🎨 Smart Colors
Automatically detects dark or muddy player name colors and applies a high-contrast pastel outline to ensure readability on dark backgrounds.

### 📝 Whisper+
Send a Whisper across the map at any distance!

### 🤝 Cross-Mod Compatibility
CRABS is designed to work seamlessly with other popular Bondage Club enhancements:
* **BCX (Bondage Club Extension):** Respects rules and character state enforcement within the immersive roster.
* **BCTweaks:** Integrates with the "Best Friends" list to display unique iconography.

---

## 💻 Core Commands

* <kbd>/roster [argument]</kbd> or <kbd>/crabs</kbd> — The primary command for interacting with the roster system.
  * *No argument:* Toggles the side drawer or opens the roster UI.
  * `count`: Displays only the room population statistics.
  * `admins`: Filters the roster to display only room administrators.
  * `vips`: Filters the roster to display only whitelisted room guests.
  * `banner`: Re-renders the room information banner.
  * `help`: Displays the in-game documentation.
* <kbd>/whisper+ [number] [msg]</kbd> or <kbd>/w+</kbd> — Global whisper system for map rooms. Bypasses range restrictions to message anyone on the map.
* <kbd>/dropkeys [color/all]</kbd> — Instantly drops specific keys (bronze, silver, gold) or all currently held keys in a map room.

---

## 🖱️ Interactions & Navigation

* **Click Badge or Name:** Opens the character's focus screen / Whisper+.
* **Click Number (ID):** Copies the player's member number to your clipboard.
* **Hover Name or ID:** Activates the temporary Map Compass to show the player's relative direction.
* **Fast "Back to Chat":** Inside the CRABS settings menu, use the **Chat Bubble Icon** to instantly return to the game without spamming the back button!

---

## ⚙️ Settings Overview

Access settings via the Settings Icon in the drawer. 

<details>
<summary><b>Banner Settings</b> <i>(Click to expand)</i></summary>

* **Show Banner on Entry:** Displays a brief information summary when joining a new room.

</details>

<details>
<summary><b>Drawer Settings</b> <i>(Click to expand)</i></summary>

* **Disable Drawer UI:** Turns off the sliding drawer entirely. The roster will only print directly in the chat log.
* **/roster toggles drawer:** Typing `/roster` or `/crabs` opens the drawer instead of printing to the chat window.
* **Hide Drawer Tab:** Removes the persistent visual tab on the side of the screen.
* **Compact Height:** Limits the drawer to 77% of the chat window height, ensuring the chat input box remains uncovered.
* **Auto-stow on Whisper+ / Chat:** Automatically closes the drawer after you send a message.

</details>

<details>
<summary><b>Immersion Settings</b> <i>(Click to expand)</i></summary>

* **Hardcore Lock:** Prevents you from disabling active immersion settings while your character is restrained.
* **Respect Blindness / Gags:** Blurs the roster UI based on blindness and disables Whisper+ if gagged.
* **Respect BCX Rules:** Enforces BCX rules within the CRABS interface.

</details>

<details>
<summary><b>Map Settings</b> <i>(Click to expand)</i></summary>

* **Show Map Compass:** Toggles the directional arrow feature.
* **SuperZoom:** Unlocks the game's default map zoom limitations (CRABS will yield this feature if it detects another mod tampering with zoom limits).

</details>

---

## 🏷️ Iconography Legend

### Relational Icons
| Icon | Description | Icon | Description |
| :--- | :--- | :--- | :--- |
| <img src="https://sin-1337.github.io/CRABS/images/you.svg" width="24"> | **You** | <img src="https://sin-1337.github.io/CRABS/images/bestfriend.svg" width="24"> | **Best Friend** (BCTweaks) |
| <img src="https://sin-1337.github.io/CRABS/images/owner.svg" width="24"> | **Owner** | <img src="https://sin-1337.github.io/CRABS/images/friends.svg" width="24"> | **Friend** |
| <img src="https://sin-1337.github.io/CRABS/images/sub.svg" width="24"> | **Submissive** | <img src="https://sin-1337.github.io/CRABS/images/whitelist.svg" width="24"> | **Whitelisted** |
| <img src="https://sin-1337.github.io/CRABS/images/trial.svg" width="24"> | **Trial Partner** | <img src="https://sin-1337.github.io/CRABS/images/blacklist.svg" width="24"> | **Blacklisted** |
| <img src="https://sin-1337.github.io/CRABS/images/lover.svg" width="24"> | **Lover** | <img src="https://sin-1337.github.io/CRABS/images/ghost.svg" width="24"> | **Ghosted** |
| <img src="https://sin-1337.github.io/CRABS/images/family.svg" width="24"> | **Family Member** | | |

### Room Badges
| Badge | Description |
| :--- | :--- |
| <img src="https://sin-1337.github.io/CRABS/images/admin.svg" width="24"> | **Room Administrator** |
| <img src="https://sin-1337.github.io/CRABS/images/vip.svg" width="24"> | **Whitelisted Guest** |
| <img src="https://sin-1337.github.io/CRABS/images/player.svg" width="24"> | **Room Guest** |

*Note: Every player card also features three hidden icons indicating if a player is **Gagged**, **Blind**, or **Deaf**. These light up and display severity levels when hovered!*

---

## 💖 Acknowledgements
* **Sera Eldritch Esper:** Thanks for the wonderful logo design! Both the big and mini versions!
* **Gangriel:** For the animated logo and helping me inject some more fun into CRABS.
* Thanks to many friends for various code advice and assistance!
* Thanks to all the testers and people who have supported me throughout the development of this project!
