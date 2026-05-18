# Changelog

All notable changes to the Crazy Roster Add-on By Sin (CRABS) will be documented in this file.

## [2.1.1] - Bug Fix release 
This version addresses 3 bugs in the prior release.

### Fixed
- **Map compass now respects player pose**: Now the compass will position the indicator arrow above the player's heads respective of their poses. 
- **Scrolling in Settings pages**: There is now a scroll bar that gets drawn in Settings pages when needed and will make the fact that those pages can be scrolled more obvious.
- **Whisper+ should now handle URLs better**: Previously Whisper+ was found to be breaking URLs, it has been adjusted in a very minor way to account for them and should no longer break URLs at all.

## [2.1] - Event-Driven & Immersion Overhaul
This version introduces a completely rewritten event-driven backend, robust chat highlighting, cloud settings synchronization, and major quality-of-life enhancements for normal rooms.

### Added
- **Chat Highlighting**: Get alerted when your name or custom words are spoken, featuring color matching, auto-capitalization, and custom exclusion phrases to prevent false positives.
- **Privacy Mode**: A customizable "boss key" (Default: CTRL + ALT + B) to instantly blank the character screen or the full game window.
- **Cloud Sync & Config Management**: Push settings to the server to share across devices, export/import configs via clipboard, or toggle a strictly "local-only" mode.
- **Universal Compass & Focus**: The 3D spinning map indicator and card focusing now fully function in standard rooms by hovering over cards or chat log names.
- **Focus Halo & Reverse Hover**: Hovering characters in the game world highlights their roster card (and vice versa) with a new pulsing halo effect that tracks character height and pose.
- **Tabbed Settings UI**: Completely redesigned the settings page to use an intuitive tabbed layout, including a new "Restore Defaults" button.
- **Whisper+ Auto-Elevate**: Automatically attempts to send a standard beep if a target friend leaves the room before you finish typing a Whisper+.
- **Update Notifications**: Optional alerts that notify you when it is time to refresh for a new version of CRABS.

### Changed
- **Event-Driven Backend**: Switched from a polling strategy to a highly performant event-driven architecture.
- **Dynamic Roster**: The drawer now reacts instantly to status icons, room names, player names, and relationship updates without lagging the game.
- **Drawer Customization**: Added options to auto-stow the drawer after chatting, disable the roster's auto-scroll, and disable the animated tab logo to save performance.
- **Dependency Update**: Pruned deprecated dependencies and updated core libraries to ensure best security practices and a leaner footprint.
- **Animated Logo**: CRABS animated logo can be disabled and made static.

### Fixed
- **BC R128 Compatibility**: Proactively patched to bridge compatibility with major underlying game engine changes in upcoming Bondage Club releases.
- **Scroll Hijacking**: Resolved a major bug where the inline roster would cause erratic scrolling behavior in the main chat log.
- **Map Compass Reliability**: Fixed edge cases where the compass failed to draw on maps, specifically for FUSAM-loaded accounts.
- **Storage Safety Limits**: Implemented safety checks and truncation logic to prevent server storage bloat if custom highlight lists exceed 8KB.
- **Superzoom toggle**: Resolved a bug that required you to refresh before Superzoom would take effect.

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
