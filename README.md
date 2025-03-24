<div width=100% align="center">
  <img src="https://sin-1337.github.io/CRABS/Crab_logo_big.png" alt="CRABS" width="50%" height="50%" align="center">
</div>

<h1 align="center">Crazy Roster Add-on By Sin - Alpha</h1>

**Warning**: 
* This is the Alpha Branch where active development takes place!
* This branch is highly unstable and **not** recommended for end users!

## Installation
### FUSAM
* This method is unsupported in Alpha

### User Script (Violentmonkey / Tampermonkey)
  To install useing the usersceipt method 
  * click the userscript: [crabsloader.user.js](https://github.com/sin-1337/CRABS/raw/refs/heads/Alpha/crabsloader.user.js)
  * Click the [install] button
  * Reload the Bondage Club tab if you have it open already.

### Bookmark
* Copy this URL and add it as a bookmark:
  ```
  javascript:(()=>{fetch('https://sin-1337.github.io/CRABS/Alpha/bundle.js').then(r=>r.text()).then(r=>eval(r));})();
  ```
* Navigate to BondageClub and click the bookmark.

## Usage:
### /players help
Show help. Sample help output below:
```
This command lists the number of admins and players in a room and gives you some informatoin about them

Arguments:<br>
help - show this menu<br>
count - show only the player count<br>
admins - show only a list of admins and the counts<br>
vips - show only room whitelisted and the counts<br>

Badges:<br>
<img src="https://sin-1337.github.io/CRABS/icons/admin.svg" alt="Admin" width="40" height="40" align="center"> = Person is Admin<br>
<img src="https://sin-1337.github.io/CRABS/icons/vip.svg" alt="VIP" width="40" height="40" align="center"> = Person is whitelisted in the room<br>
<img src="https://sin-1337.github.io/CRABS/icons/player.svg" alt="Player" width="40" height="40" align="center"> = Person is a normal user<br>

Icons:<br>
<img src="https://sin-1337.github.io/CRABS/icons/you.svg" alt="You" width="40" height="40" align="center"> = Person is you<br>
<img src="https://sin-1337.github.io/CRABS/icons/owner.svg" alt="Owner" width="40" height="40" align="center"> = Person is your owner<br>
<img src="https://sin-1337.github.io/CRABS/icons/sub.svg" alt="Sub" width="40" height="40" align="center"> = Person is your submissive<br>
<img src="https://sin-1337.github.io/CRABS/icons/trial.svg" alt="Trail" width="40" height="40" align="center"> = Person is on trial with you<br>
<img src="https://sin-1337.github.io/CRABS/icons/lover.svg" alt="Lover" width="40" height="40" align="center"> = Person is your lover<br>
<img src="https://sin-1337.github.io/CRABS/icons/friends.svg" alt="Friend" width="40" height="40" align="center"> = Person is a friend<br>
<img src="https://sin-1337.github.io/CRABS/icons/whitelist.svg" alt="Whitelist" width="40" height="40" align="center"> = You have this person whitelisted<br>
<img src="https://sin-1337.github.io/CRABS/icons/blacklist.svg" alt="blacklist" width="40" height="40" align="center"> = You have this person blacklisted<br>
<img src="https://sin-1337.github.io/CRABS/icons/ghost.svg" alt="ghost" width="40" height="40" align="center"> = You have ghosted this person<br>

Actions:<br>
Click Badge - If you click the badge for a player it will be as if you clicked them to interact.<br>
Click name - If you click the name/number of a player it will whisper them without range constraints.<br>
```
### /players
Shows the roster and lets you work with it.

### /whisper+ [membernumber] 
Lets you whisper at range on maps, otherwise it is just normal whisper

## Acknoledgements:
* Thanks to Sera Eldritch Esper for the wonder logo design! Both the big and mini versions!
* Thanks to Felix for various code advice and assistantce!
* Thanks to all the testers and people who have supported me throught the development of this project!
