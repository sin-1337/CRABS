# Changelog

All notable changes to the Crazy Roster Add-on By Sin (CRABS) will be documented in this file.

## [2.0] - Alpha
This version introduces significant architectural improvements and new interface features.

### Added
- **Interactive Side Drawer**: A new stowable UI element providing quick access to Roster and Help features.
- **Map Compass**: Directional tracking arrow that appears on the map when hovering over player IDs in the roster.
- **Immersive Blindness**: Roster interface now dynamically blurs based on character blindness levels, with full BCX rule support.
- **Enhanced Iconography**: Added specialized detection for Family members and Trial partners.
- **BCTweaks Integration**: Added "Best Friend" icon support and list prioritization.
- **Global Variable Strategy**: Migrated to a more robust internal state management system for better stability.

### Changed
- **Code Documentation**: Performed a comprehensive TSDoc overhaul for the entire codebase (Classes, Methods, Interfaces).
- **Refactoring**: Renamed all single-character and non-verbose variables to descriptive, professional alternatives.
- **Drawer Logic**: Improved visibility management; the drawer now automatically stows when entering focus screens or profile menus.
- **Map Compass UI**: Improved the compass arrow rendering with dynamic scaling and high-contrast borders for visibility on all tiles.

### Fixed
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

## [1.3.0] - Core Release
Initial implementation of the advanced roster and basic command suite.

### Added
- Initial `/roster` command suite.
- `/whisper+` for range-restricted communication.
- `/dropkeys` utility for map rooms.
- Basic status indicators for Gag, Blind, and Deaf states.
- Room administrative and whitelisting badges.
