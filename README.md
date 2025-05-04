<div width=100% align="center">
  <img src="https://sin-1337.github.io/CRABS/Crab_logo_big.png" alt="CRABS" width="50%" height="50%" align="center">
</div>

<h1 align="center">Crazy Roster Add-on By Sin - Beta</h1>

## Warnings: 
* This is the Beta Branch where testing takes place!
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

### Bookmark:
* Copy this URL and add it as a bookmark:
  ```
  javascript:(()=>{fetch('https://sin-1337.github.io/CRABS/Beta/bundle.js').then(r=>r.text()).then(r=>eval(r));})();
  ```
* Navigate to BondageClub and click the bookmark.

## Usage:
### /roster
<p>This command lists the number of admins and players in a room and gives you some information about them.</p>

<p>
Arguments:<br>
help - show this menu<br>
count - show only the player count<br>
admins - show only a list of admins and the counts<br>
vips - show only room whitelisted and the counts<br>
banner - draws the banner again </br>
version - shows the version of CRABS </br>
</p>

### /whisper+ [membernumber] 
Synonyms: /w+
<p>Command that lets you whisper at range on maps, 
activated automatically by clicking the player
name in the roster. </p>

### /dropkeys [gold silver bronze / all]
<p>Command that lets you drop your keys, you can 
supply one or more key colors, or all to drop 
all keys. </p>

<p>
### Badges: <br>
<img src="https://sin-1337.github.io/CRABS/icons/admin.svg" alt="Admin" width="40" height="40" align="center"> = Person is Admin<br>
<img src="https://sin-1337.github.io/CRABS/icons/vip.svg" alt="VIP" width="40" height="40" align="center"> = Person is whitelisted in the room<br>
<img src="https://sin-1337.github.io/CRABS/icons/player.svg" alt="Player" width="40" height="40" align="center"> = Person is a normal user<br>
</p>

<p>
### Icons: <br>
<img src="https://sin-1337.github.io/CRABS/icons/you.svg" alt="You" width="40" height="40" align="center"> = Person is you<br>
<img src="https://sin-1337.github.io/CRABS/icons/owner.svg" alt="Owner" width="40" height="40" align="center"> = Person is your owner<br>
<img src="https://sin-1337.github.io/CRABS/icons/sub.svg" alt="Sub" width="40" height="40" align="center"> = Person is your submissive<br>
<img src="https://sin-1337.github.io/CRABS/icons/trial.svg" alt="Trail" width="40" height="40" align="center"> = Person is on trial with you<br>
<img src="https://sin-1337.github.io/CRABS/icons/lover.svg" alt="Lover" width="40" height="40" align="center"> = Person is your lover<br>
<img src="https://sin-1337.github.io/CRABS/icons/friends.svg" alt="Friend" width="40" height="40" align="center"> = Person is a friend<br>
<img src="https://sin-1337.github.io/CRABS/icons/whitelist.svg" alt="Whitelist" width="40" height="40" align="center"> = You have this person whitelisted<br>
<img src="https://sin-1337.github.io/CRABS/icons/blacklist.svg" alt="blacklist" width="40" height="40" align="center"> = You have this person blacklisted<br>
<img src="https://sin-1337.github.io/CRABS/icons/ghost.svg" alt="ghost" width="40" height="40" align="center"> = You have ghosted this person<br>
</p>

### Status Icons:
<p>There are 3 icons on the right side of each player card.
They indicate if the player is gagged, blind, or deaf 
and will light up to show this stats.</p>

### Keys:
<p>When on a map, 3 key icons in the upper right corner of
the roster will light up as you collect the different keys. </p>

### Actions:
<p>Click Badge - If you click the badge for a player it will be as if you clicked them to interact.<br>
Click name - If you click the name/number of a player it will whisper them without range constraints.<br>
</p>

## Acknoledgements:
* Thanks to Sera Eldritch Esper for the wonderful logo design! Both the big and mini versions!
* Thanks to many friends for various code advice and assistance!
* Thanks to all the testers and people who have supported me throughout the development of this project!
