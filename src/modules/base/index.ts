/**
 * CRABS Base Layer Entry Point
 *
 * Re-exports the base abstract class, core UI sub-systems, and modular utilities.
 *
 * @module base
 */

export { CRABS_Base, PerformanceLevel } from "./core";
export { Drawer } from "./drawer";
export type {
  DrawerPage,
  DrawerViewDefinition,
  DrawerStateDelegate,
  DrawerUIInjector,
  ImageItem,
  ImageStore,
  AudioStore,
  PrintImage,
} from "./types";
export * from "./assets";
export * from "./localization";
export * from "./color";
export * from "./context";
export * from "./keybinds";
