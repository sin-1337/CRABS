interface TutorialProp {
  assetKey?: string;
  imageSrc?: string;
  top: number;
  left: number;
  maxWidth?: number;
  cssClass?: string;
  highlightGlow?: boolean;
}

interface TutorialStep {
  id: string;
  poseKey: string;
  i18nKey: string;
  characterPos: { top: number; left: number };
  bubblePos: { top: number; left: number };
  bubbleTail: "tail-bottom" | "tail-top" | "tail-left" | "tail-right";
  bubbleMaxWidth?: number;
  chapterId?: string;
  chapterTitleKey?: string;
  props?: TutorialProp[];
  nextStepOverride?: string;
  onStepEnter?: (tutorial: any) => void;
  onStepExit?: (tutorial: any) => void;
  isTerminal?: boolean;
}
