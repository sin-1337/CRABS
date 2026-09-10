export interface TutorialStep {
  id: string;
  poseKey: string;
  i18nKey: string;
  characterPos: { top: number; left: number };
  bubblePos: { top: number; left: number };
  bubbleTail: "tail-bottom" | "tail-top" | "tail-left" | "tail-right";
  bubbleMaxWidth?: number;

  // Chapter tracking (undefined for detour / hidden steps)
  chapterId?: string;
  chapterTitleKey?: string;

  // Branching hooks
  nextStepOverride?: string; // Jump to specific step instead of index + 1
  onStepEnter?: (tutorial: any) => void;
  onStepExit?: (tutorial: any) => void;
  isTerminal?: boolean; // Ends tutorial immediately (e.g. rage quit)
}

export interface TutorialProp {
  assetKey?: string; // Key registered in Assets.printimage
  imageSrc?: string; // Direct URL or data URI fallback
  top: number; // Percentage from top (0-100)
  left: number; // Percentage from left (0-100)
  maxWidth?: number; // Optional max width in px
  cssClass?: string; // Optional custom animation/outline class
  highlightGlow?: boolean; // Adds a glowing focus ring around the prop
}

export interface TutorialStep {
  id: string;
  poseKey: string;
  i18nKey: string;
  characterPos: { top: number; left: number };
  bubblePos: { top: number; left: number };
  bubbleTail: "tail-bottom" | "tail-top" | "tail-left" | "tail-right";
  bubbleMaxWidth?: number;

  chapterId?: string;
  chapterTitleKey?: string;

  // Optional visual props/UI cutouts for this scene
  props?: TutorialProp[];

  nextStepOverride?: string;
  onStepEnter?: (tutorial: any) => void;
  onStepExit?: (tutorial: any) => void;
  isTerminal?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Main Linear Track
// ─────────────────────────────────────────────────────────────
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    chapterId: "basics",
    chapterTitleKey: "chapters.basics",
    poseKey: "char_welcome",
    i18nKey: "steps.welcome",
    characterPos: { top: 60, left: 65 },
    bubblePos: { top: 40, left: 45 },
    bubbleTail: "tail-bottom",
  },
  {
    id: "roster",
    chapterId: "roster",
    chapterTitleKey: "chapters.roster",
    poseKey: "char_explaining",
    i18nKey: "steps.roster",
    characterPos: { top: 35, left: 75 },
    bubblePos: { top: 30, left: 40 },
    bubbleTail: "tail-right",
    bubbleMaxWidth: 420,
  },
];

// ─────────────────────────────────────────────────────────────
// Detour / Easter Egg Sequences
// ─────────────────────────────────────────────────────────────
export const SPECIAL_SEQUENCES: Record<string, TutorialStep[]> = {
  // Triggered when user clicks character 3 times
  character_annoyed: [
    {
      id: "poke_1",
      poseKey: "char_annoyed",
      i18nKey: "special.poke_1",
      characterPos: { top: 50, left: 50 },
      bubblePos: { top: 30, left: 50 },
      bubbleTail: "tail-bottom",
    },
    {
      id: "poke_rage_quit",
      poseKey: "char_angry",
      i18nKey: "special.poke_rage_quit",
      characterPos: { top: 50, left: 50 },
      bubblePos: { top: 30, left: 50 },
      bubbleTail: "tail-bottom",
      isTerminal: true, // Shuts down tutorial and sets dismissed
    },
  ],

  // Multi-step intro played when resuming after being away
  resume_long: [
    {
      id: "resume_confused",
      poseKey: "char_thinking",
      i18nKey: "special.resume_confused",
      characterPos: { top: 60, left: 65 },
      bubblePos: { top: 42, left: 45 },
      bubbleTail: "tail-bottom",
    },
    {
      id: "resume_reorient",
      poseKey: "char_welcome",
      i18nKey: "special.resume_reorient",
      characterPos: { top: 60, left: 65 },
      bubblePos: { top: 42, left: 45 },
      bubbleTail: "tail-bottom",
    },
  ],
};
