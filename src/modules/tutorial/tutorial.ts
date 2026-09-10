import { CRABS_Base } from "../base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Assets } from "../assets";
import DOMPurify from "dompurify";
import locales from "./i18n.json";
import { TUTORIAL_STEPS, TutorialStep } from "./steps";
import "./templates/tutorial.css";
import tutorialTemplate from "./templates/tutorial.html";

type StepNavMode = "default" | "back" | "resume";

interface StoredTutorialState {
  stepIndex: number;
  completed: boolean;
  dismissed: boolean;
}

export class Tutorial extends CRABS_Base {
  private boundKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  private static readonly STORAGE_KEY = "CRABS_TutorialState";

  private state: StoredTutorialState = {
    stepIndex: 0,
    completed: false,
    dismissed: false,
  };

  private lastMode: StepNavMode = "default";

  constructor(CRABS: ModSDKModAPI) {
    super(CRABS, "tutorial", locales);
    this.loadState();
  }

  private loadState(): void {
    const raw = localStorage.getItem(Tutorial.STORAGE_KEY);
    if (raw) {
      try {
        this.state = JSON.parse(raw);
      } catch {
        this.resetState();
      }
    }
  }

  private saveState(): void {
    localStorage.setItem(Tutorial.STORAGE_KEY, JSON.stringify(this.state));
  }

  public resetState(): void {
    this.state = { stepIndex: 0, completed: false, dismissed: false };
    this.saveState();
  }

  /** Starts or resumes the tutorial overlay */
  public startTutorial(forceRestart: boolean = false): void {
    if (forceRestart) {
      this.state.stepIndex = 0;
      this.state.completed = false;
      this.state.dismissed = false;
      this.lastMode = "default";
    } else if (this.state.dismissed && !this.state.completed) {
      this.lastMode = "resume";
      this.state.dismissed = false;
    } else {
      this.lastMode = "default";
    }

    this.saveState();
    this.render();
  }

  private getStepDialogue(step: TutorialStep): string {
    const base = step.i18nKey;
    if (this.lastMode === "back") {
      const backLine = this.t(`${base}.back`);
      if (backLine && backLine !== `${base}.back`) return backLine;
    }
    if (this.lastMode === "resume") {
      const resumeLine = this.t(`${base}.resume`);
      if (resumeLine && resumeLine !== `${base}.resume`) return resumeLine;
    }
    return this.t(`${base}.default`);
  }

  private buildChapterSidebar(currentStep: TutorialStep): string {
    const seenChapters = new Set<string>();
    let html = "";

    TUTORIAL_STEPS.forEach((step, index) => {
      // Ensure step belongs to a chapter before generating a sidebar entry
      if (
        step.chapterId &&
        step.chapterTitleKey &&
        !seenChapters.has(step.chapterId)
      ) {
        seenChapters.add(step.chapterId);
        const isActive =
          step.chapterId === currentStep.chapterId ? "active" : "";
        const label = this.t(step.chapterTitleKey);

        html += `
          <button class="CRABS_tut_chapter_item ${isActive}" data-jump-step="${index}">
            ${label}
          </button>
        `;
      }
    });

    return html;
  }

  private buildPropsHtml(step: TutorialStep): string {
    if (!Array.isArray(step.props) || step.props.length === 0) {
      return "";
    }

    return step.props
      .map((prop) => {
        let imageHtml = "";

        if (prop.assetKey) {
          imageHtml = Assets.printimage({
            key: prop.assetKey as any,
            css_class_override: "CRABS_tut_prop_img",
          });
        } else if (prop.imageSrc) {
          imageHtml = `<img src="${prop.imageSrc}" class="CRABS_tut_prop_img" alt="Tutorial reference" />`;
        }

        const glowClass = prop.highlightGlow ? "glow" : "";
        const customClass = prop.cssClass || "";
        const maxPropW = prop.maxWidth
          ? `--prop-max-w: ${prop.maxWidth}px;`
          : "";

        return `
          <div class="CRABS_tut_prop_item ${glowClass} ${customClass}" 
               style="top: ${prop.top}%; left: ${prop.left}%; ${maxPropW}">
            ${imageHtml}
          </div>
        `;
      })
      .join("");
  }

  public render(): void {
    let step = TUTORIAL_STEPS[this.state.stepIndex];

    // Failsafe: If cache points to a step that no longer exists, reset it
    if (!step) {
      console.warn(
        `[CRABS Tutorial] Step ${this.state.stepIndex} not found. Resetting state.`,
      );
      this.resetState();
      step = TUTORIAL_STEPS[this.state.stepIndex];
      if (!step) return; // Abort completely if TUTORIAL_STEPS is empty
    }

    const isFirst = this.state.stepIndex === 0;
    const isLast = this.state.stepIndex === TUTORIAL_STEPS.length - 1;
    const maxW = step.bubbleMaxWidth ? `${step.bubbleMaxWidth}px` : "360px";

    const templateVars: Record<string, string> = {
      sidebarTitle: this.t("headers.chapters"),
      chapterItems: this.buildChapterSidebar(step),
      dialogueText: this.getStepDialogue(step),
      stepCounter: `${this.state.stepIndex + 1} / ${TUTORIAL_STEPS.length}`,
      prevLabel: this.t("controls.prev"),
      nextLabel: isLast ? this.t("controls.finish") : this.t("controls.next"),
      closeTooltip: this.t("controls.close"),
      closeIcon: Assets.printimage({
        key: "close",
        css_class_override: "CRABS_icon",
      }),
      characterImage: Assets.printimage({ key: step.poseKey as any }),
      charTop: `${step.characterPos.top}`,
      charLeft: `${step.characterPos.left}`,
      bubbleTop: `${step.bubblePos.top}`,
      bubbleLeft: `${step.bubblePos.left}`,
      bubbleTailClass: step.bubbleTail,
      bubbleMaxWidth: maxW,
      propsContainer: this.buildPropsHtml(step),
    };

    const compiledHtml = this.template(tutorialTemplate, templateVars, false);

    let container = document.getElementById("CRABS_Tutorial_Container");
    if (!container) {
      container = document.createElement("div");
      container.id = "CRABS_Tutorial_Container";
      document.body.appendChild(container);
    }

    container.innerHTML = DOMPurify.sanitize(compiledHtml, {
      USE_PROFILES: { html: true },
    });

    this.buildui(undefined, undefined, container);

    const prevBtn = container.querySelector(
      "#CRABS_tut_btn_prev",
    ) as HTMLButtonElement;
    if (prevBtn) prevBtn.disabled = isFirst;
  }

  public override buildui(
    output?: string,
    elementId?: string,
    root?: HTMLElement,
  ): void {
    super.buildui(output, elementId, root);

    this.attachEvent(
      "CRABS_tut_btn_next",
      () => this.onNext(),
      undefined,
      undefined,
      "click",
      "id",
      root,
    );

    this.attachEvent(
      "CRABS_tut_btn_prev",
      () => this.onPrev(),
      undefined,
      undefined,
      "click",
      "id",
      root,
    );

    this.attachEvent(
      "CRABS_tut_btn_close",
      () => this.onDismiss(),
      undefined,
      undefined,
      "click",
      "id",
      root,
    );

    this.attachEvent(
      "CRABS_tut_chapter_item",
      (jumpIndex: string) => {
        const idx = parseInt(jumpIndex, 10);
        if (!isNaN(idx) && idx >= 0 && idx < TUTORIAL_STEPS.length) {
          this.lastMode = idx < this.state.stepIndex ? "back" : "default";
          this.state.stepIndex = idx;
          this.saveState();
          this.render();
        }
      },
      "jumpStep",
      undefined,
      "click",
      "class",
      root,
    );

    // Remove any previous listener to avoid stacking on re-renders
    if (this.boundKeyHandler) {
      window.removeEventListener("keydown", this.boundKeyHandler, true);
    }

    // Capture Escape key to close the tutorial
    this.boundKeyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.code === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this.onDismiss();
      }
    };

    window.addEventListener("keydown", this.boundKeyHandler, true);
  }

  private onNext(): void {
    if (this.state.stepIndex < TUTORIAL_STEPS.length - 1) {
      this.state.stepIndex++;
      this.lastMode = "default";
      this.saveState();
      this.render();
    } else {
      this.state.completed = true;
      this.saveState();
      this.destroy();
    }
  }

  private onPrev(): void {
    if (this.state.stepIndex > 0) {
      this.state.stepIndex--;
      this.lastMode = "back";
      this.saveState();
      this.render();
    }
  }

  private onDismiss(): void {
    this.state.dismissed = true;
    this.saveState();
    this.destroy();
  }

  public destroy(): void {
    if (this.boundKeyHandler) {
      window.removeEventListener("keydown", this.boundKeyHandler, true);
      this.boundKeyHandler = null;
    }

    const container = document.getElementById("CRABS_Tutorial_Container");
    if (container) container.remove();
  }
}
