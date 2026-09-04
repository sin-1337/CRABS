<div width="100%" align="center">
  <img src="https://sin-1337.github.io/CRABS/images/Crab_logo_big.png" alt="CRABS" width="50%" align="center">
</div>

<h1 align="center">Crazy Roster Add-on By Sin (CRABS) [Alpha]</h1>

> ⚠️ **Development Branch Warning**
> * This is the Alpha branch for testing new features!
> * This branch is where active development happens and can change or break suddenly and without warning!
> * NOT RECOMMENDED FOR NORMAL USERS!
---

## 📥 Installation

### FUSAM (Not available)
* The Alpha branch is not available in FUSAM.


### User Script (Violentmonkey / Tampermonkey)
* Click the userscript link: [crabsloader.user.js](https://github.com/sin-1337/CRABS/raw/refs/heads/Alpha/crabsloader.user.js)
* Click the **[install]** button in your extension manager.
* Reload the Bondage Club tab if you have it open already.

### Bookmarklet
Alternatively, you may add the following as a bookmark URL:
```javascript
javascript:(()=>{fetch('[https://sin-1337.github.io/CRABS/Alpha/bundle.js](https://sin-1337.github.io/CRABS/Alpha/bundle.js)').then(r=>r.text()).then(r=>eval(r));})();
```
*(Note: Remove spaces between backticks when copying)*
Click the bookmark while on the Bondage Club page to load the mod.

---

## ✨ Key Features

### 🗄️ Interactive Side Drawer
A sleek, stowable roster interface that provides rapid access to mod features without obstructing your main view. 
* Fully event-driven backend for real-time status updates without lagging your game.
* Automatically adjusts roster content seamlessly when moving between map and non-map areas in hybrid rooms.
* **Live Sorting:** Use the dropdown to instantly sort players by Room Role, D/s Family Tree, Lovers, or Friends.

### 🧭 Universal Compass & Focus
Easily locate players in large map rooms *and* standard chat rooms!
* Hovering over a player's card, chat log name, or their actual character reveals a spinning 3D indicator and a pulsing halo glow.
* **Sticky Tracking:** Mobile/Drawer users can tap the Compass Icon on a player's card to lock the compass to them! Auto-clears when the drawer is stowed.

### 🔔 Chat Highlighting
Get alerted when you're spoken to. Highlights messages containing your name or custom words. Includes dynamic color matching, auto-capitalization, and custom exclusion phrases to prevent false positives.

### 🛡️ Privacy Mode
A customizable "boss key" that instantly blanks the character screen or the full game window. Toggle via a dedicated keybind (Default: `CTRL + ALT + B`).

### ☁️ Cloud Sync
Safely backup and sync your CRABS settings across devices via the game server, or toggle "local-only" mode to keep your data strictly on your current browser.

### ⚡ Smart Performance Scaling
CRABS actively monitors your game's true frame delta. If performance dips consistently, it dynamically disables the animated logo, reduces blur quality, and lowers update rates to save your FPS during lag spikes.

### 👁️ Immersive Blindness & Gags
Dynamic interface adjustments that reflect your character's sensory state.
* The roster interface blurs according to your character's blindness level.
* Whisper+ is blocked if your character is gagged.
* **Hardcore Lock:** Prevents you from disabling immersion settings while your character is restrained!
* Fully respects BCX "Full Blind" rules when enabled.

### 🎨 Smart Colors
Automatically detects dark or muddy player name colors and applies a high-contrast pastel outline to ensure readability on dark backgrounds.

### 📝 Whisper+
Send a Whisper across the map at any distance! Automatically attempts to elevate to a standard "beep" if a friend leaves the room before you hit send.

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

* **Keyboard Shortcuts:** Use `CTRL + ALT + D` to toggle the drawer, and `CTRL + ALT + B` to toggle Privacy Mode.
* **Click Badge or Name:** Opens the character's focus screen / Whisper+.
* **Click Number (ID):** Copies the player's member number to your clipboard.
* **Reverse Hover:** Hovering a character in the game world highlights their card in the roster and applies a focus halo.
* **Fast "Back to Chat":** Inside the CRABS settings menu, use the **Chat Bubble Icon** in the top right to instantly return to the game!

---

## ⚙️ Settings Overview

Access settings via the Settings Icon in the drawer, featuring a fully tabbed interface. 

<details>
<summary><b>General</b> <i>(Click to expand)</i></summary>

* **Update Notifications:** Alerts you when to refresh for a new version.
* **Show Banner on Entry:** Displays an info banner when joining a room.
* **Full-Screen Privacy Mode:** Blanks the entire screen instead of just the chat side when the hotkey is used.
* **Enable Focus Halo:** Shows a pulsing halo effect on hovered avatars.
* **Edit Keybinds:** Shortcut to the game's keybinding menu to change your hotkeys.

</details>

<details>
<summary><b>Drawer</b> <i>(Click to expand)</i></summary>

* **Enable Drawer UI:** Turns the sliding drawer interface on or off.
* **/roster toggles drawer:** Typing `/roster` or `/crabs` opens the drawer instead of printing in chat.
* **Show Drawer Tab:** Toggles the persistent visual tab on the screen edge.
* **Animated Tab Logo:** Toggle the drawer logo animation to save performance.
* **Compact Height:** Limits the drawer to 77% height, keeping the chat input visible.
* **Auto-stow Options:** Close the drawer automatically after sending a standard chat or Whisper+.
* **Focus Follows Mouse:** Automatically switch to a player's page when hovering their card.
* **Auto-Scroll Drawer:** The roster automatically scrolls to the character you are mousing over in the game world.

</details>

<details>
<summary><b>Immersion</b> <i>(Click to expand)</i></summary>

* **Hardcore Lock:** Locks immersion settings ON while your character is bound.
* **Respect Blindness / Gags:** Blurs the roster UI based on blindness and disables Whisper+ if gagged.
* **Respect BCX Rules:** Enforces BCX rules within the CRABS interface.

</details>

<details>
<summary><b>Maps</b> <i>(Click to expand)</i></summary>

* **Show Map Compass:** Toggles the directional arrow feature.
* **SuperZoom:** Unlocks the game's default map zoom limitations (auto-disables if conflicts are detected).

</details>

<details>
<summary><b>Chat</b> <i>(Click to expand)</i></summary>

* **Highlight Mentions:** Alerts you when specific words or your name are spoken. Customize the highlight color.
* **Auto-Capitalize & Color Match:** Capitalizes your name and matches it to your character's label color in highlights.
* **Custom Words & Exclusions:** Add trigger words and use wildcards (e.g., 'pick* a rose') to prevent false alarms.
* **Chat Log Hover Links:** Hovering names in the chat log triggers the focus halo and map compass.
* **Whisper+ Auto-elevate:** Attempts to send a Whisper+ as a standard beep if a friend leaves the room.

</details>

<details>
<summary><b>Config</b> <i>(Click to expand)</i></summary>

* **Disable Cloud Sync:** Keeps settings strictly local, preventing cross-device syncing. Includes a capacity tracker.
* **Delete Server Save:** Wipes your CRABS settings from the game server.
* **Export / Import:** Copy or paste your settings string to backup or share.

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
