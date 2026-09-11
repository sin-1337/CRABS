/**
 * CRABS Base Layer Shared Type Definitions
 *
 * Ambient interfaces and contracts supporting core systems,
 * localization, performance tiers, and Drawer Inversion of Control.
 *
 * @module base/types
 */

/**
 * Performance throttling and visual scaling tiers.
 */
export enum PerformanceLevel {
  NORMAL = 0,
  LOW = 1,
  CRITICAL = 2,
}

/**
 * Supported language locale keys for CRABS localization.
 */
export type SupportedLocale = "en" | "de" | "fr" | "ru" | "cn" | "tw" | "uk";

/**
 * Valid key identifiers that can be dropped via map commands.
 */
export type DropTarget = "bronze" | "silver" | "gold" | "all";

/**
 * Valid view targets for drawer navigation.
 */
export type DrawerPage = "roster" | "help" | "history" | "keys" | string;

/**
 * Definition representing a navigable view registered with the Drawer.
 */
export interface DrawerViewDefinition {
  /** Unique page identifier matching DrawerPage routing. */
  id: DrawerPage;
  /** Function returning the localized header title for this view. */
  title: () => string;
  /** Function returning the rendered HTML string for the view. */
  render: () => string;
  /** Optional callback executed after DOM elements are mounted. */
  onMount?: (root: HTMLElement) => void;
  /** Whether the sort dropdown should be visible for this view. */
  showSort?: boolean;
  /** Whether the layout toggle button should be visible for this view. */
  showLayout?: boolean;
  /** Optional override icon key for header display. */
  icon?: string;
  /** Optional teardown callback invoked when leaving this view. */
  onDeactivate?: () => void;
}

/**
 * Interface representing external state providers (e.g. Roster) that drive drawer behavior.
 */
export interface DrawerStateDelegate {
  /** Checks if module state has mutated and requires a render refresh. */
  isDirty: () => boolean;
  /** Resets the dirty flag after an update cycle. */
  clearDirty: () => void;
  /** Surgical DOM updater targeting dynamic metrics without full re-render. */
  updateUI?: (root: HTMLElement) => void;
  /** Retrieves the active card layout CSS class identifier. */
  layoutMode?: () => string;
  /** Advances to the next sequential card layout mode. */
  cycleLayout?: () => void;
  /** Retrieves the current map keys bitstring signature. */
  getKeyStateString?: () => string;
  /** Callback triggered when the drawer closes to release player focus/tracking. */
  onClearTracking?: () => void;
}

/**
 * Auxiliary UI injector callback invoked after the drawer mounts content (e.g. WhisperPlus).
 */
export type DrawerUIInjector = (root: HTMLElement) => void;

/**
 * Image asset definition.
 */
export interface ImageItem {
  file: string;
  altKey?: string;
  toolTipKey?: string;
  class?: string;
  element?: HTMLImageElement;
}

/**
 * Registry structure for image assets.
 */
export interface ImageStore {
  basePath: string;
  image: Record<string, ImageItem>;
}

/**
 * Registry structure for audio assets.
 */
export interface AudioStore {
  basePath: string;
  audio: Record<string, { file: string }>;
}

/**
 * Parameters for rendering HTML image elements via Assets.printimage().
 */
export interface PrintImage {
  key: string;
  tooltip_override?: string | boolean;
  alt_override?: string;
  css_class_override?: string;
  css_style?: string;
  data?: [string, string];
  style?: string;
}

type ImageStore = {
  readonly basePath: string;
  readonly image: {
    readonly [key: string]: {
      readonly file: string;
      readonly subdir?: string;
      readonly altKey?: string;
      readonly toolTipKey?: string;
      readonly class?: string;
    };
  };
};

type AudioStore = {
  readonly basePath: string;
  readonly audio: {
    readonly [key: string]: string | { readonly file: string };
  };
};
