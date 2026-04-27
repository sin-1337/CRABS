# Changelog

All notable changes to the Crazy Roster Add-on By Sin (CRABS) will be documented in this file.

## [2.1] - Feature release!
### Added
- **Improved Drawer**: CRABS Drawer is now more reactive to change, Status icons, Room name, Player name, relationships all dynamically update now!
The backend switched from a polling strategy to an event driven one! This should allow CRABS to be more performant!
- **Update Notifications**: CRABS can now notify you if there is an update and let you know to refresh, you can turn this off in settings.
- **Optional Static Logo**: You can disable the animated logo on the drawer now, making it static.
- **Player Focus Indicators**: The compass feature comes to normal rooms! Now you can mouse over a player card, and you'll get an indicator in the room for which player you are on. You can also click the card or turn on focus follows mouse to switch to the page the player is on automatically!
- **Animations**: Player cards have been given a new animation to indicate the one with focus!
- **Performance Throttle Enhancments**: CRABS performance throttling has been enhanced to disable some animations when frame delta lag is detected.
- **Settings Page Updated**: Settings page has been overhauled to add scrolling for more options, and it arranges them by hierarchy! Hopefully this makes the options less confusing!

## [2.0.1] - Clean up and Bug Fix
### Fixed
- Fixed bug where Gag, Deaf, Blind, didn't update in the drawer when those status changed.,
- Fixed the same bug for the relationship icons.,
- Fixed bug where if the settings were accessed outside of a chatroom the "back to chat" button would cause a crash.,
- Fixed bug where the banner would reprint if the room name was updated.

## [2.0] - Rave
This version introduces significant architectural improvements, dynamic performance scaling, and a brand new stowable UI.

### Added
- **Interactive Side Drawer**: A new stowable UI element providing quick access to Roster and Help features.
- **Smart Performance Scaling**: Dynamically adjusts UI update rates, blur quality, and animations based on true frame delta to prevent lag, bypassing manual FPS caps.
- **Map Compass & Sticky Tracking**: Directional tracking arrow that appears on the map when hovering over player IDs. Added a clickable compass button in the Drawer UI to persistently track players.
- **Immersive Blindness**: Roster interface now dynamically blurs based on character blindness levels, with full BCX rule support.
- **Quick Chat Return**: Added a dedicated "To Chat" button inside the CRABS settings menu to instantly return to gameplay.
- **Hybrid Map Support**: The Drawer roster automatically refreshes its layout and content when moving between map and non-map zones in hybrid rooms.
- **Enhanced Iconography**: Added specialized detection for Family members and Trial partners.
- **BCTweaks Integration**: Added "Best Friend" icon support and list prioritization.
- **Global Variable Strategy**: Migrated to a more robust internal state management system for better stability.

### Changed
- **Code Documentation**: Performed a comprehensive TSDoc overhaul for the entire codebase (Classes, Methods, Interfaces).
- **Refactoring**: Renamed all single-character and non-verbose variables to descriptive, professional alternatives.
- **Drawer Logic**: Improved visibility management; the drawer now automatically stows when entering focus screens or profile menus.
- **Map Compass UI**: Improved the compass arrow rendering with dynamic scaling and high-contrast borders for visibility on all tiles.

### Fixed
- **Compass Tooltip Visibility**: Fixed an issue where the compass icon's tooltip would inappropriately dim; tooltips now remain fully bright.
- **Banner Loading**: Resolved a race condition where the banner would occasionally fail to render during room synchronization.
- **Help Output**: Corrected formatting issues in the command documentation.
- **BC Compatibility**: Applied critical fixes to ensure stability with recent Bondage Club game updates.
- **Beta Deployment**: Resolved issues with the automated build process for the Beta branch.

## [1.3.1] - Stability & Performance
Incremental updates focused on bug fixes and performance optimization.

### Fixed
- Improved response time for friend list queries.
- Resolved minor CSS collisions with other popular mods.
- Optimized asset loading sequence to reduce initial load times.

## [1.0] - Core Release
Initial implementation of the advanced roster and basic command suite.

### Added
- Initial `/roster` command suite.
- `/whisper+` for range-restricted communication.
- `/dropkeys` utility for map rooms.
- Basic status indicators for Gag, Blind, and Deaf states.
- Room administrative and whitelisting badges.
