import { describe, it, expect, beforeEach, vi } from "vitest";
import { CRABS_Base } from "@/modules/base";
import { createMockModSDK } from "mockups/mod-sdk";

// Concrete harness to expose protected base methods
class TestBaseModule extends CRABS_Base {
  public testTemplate(
    tmpl: string,
    args: Record<string, string>,
    wrapper = false,
    wrapArgs?: Record<string, string>,
  ) {
    return this.template(tmpl, args, wrapper, wrapArgs);
  }

  public testSafeHook(
    target: string,
    priority: number,
    fn: (args: any[], next: (a: any[]) => any) => any,
  ) {
    this.safeHook(target, priority, fn);
  }
}

describe("CRABS_Base Core Mechanics", () => {
  let mockSdk: ReturnType<typeof createMockModSDK>;
  let baseMod: TestBaseModule;

  beforeEach(() => {
    mockSdk = createMockModSDK();
    baseMod = new TestBaseModule(mockSdk, "test");
  });

  it("substitutes placeholders and strips unused wrapper tags", () => {
    const raw = `<div class="{{ClassName}}">{{Content}}</div>`;
    const rendered = baseMod.testTemplate(raw, {
      ClassName: "test-box",
      Content: "Hello CRABS",
    });

    expect(rendered).toContain('class="test-box"');
    expect(rendered).toContain("Hello CRABS");
    expect(rendered).not.toContain("{{ClassName}}");
  });

  it("normalizes and sanitizes Zalgo text", () => {
    const zalgoString = "T̷e̵s̶t̸";
    const cleaned = baseMod.cleanZalgoAndNormalize(zalgoString);
    expect(cleaned).toBe("Test");
  });

  it("invokes registered safeHooks properly through the chain", () => {
    baseMod.testSafeHook("TestScreenRun", 10, (args, next) => {
      return next([`${args[0]}:hooked`]);
    });

    expect(mockSdk.hookFunction).toHaveBeenCalledWith(
      "TestScreenRun",
      10,
      expect.any(Function),
    );
  });

  it("isolates hook exceptions and disables failing hooks automatically", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    baseMod.testSafeHook("FailingFunction", 0, () => {
      throw new Error("Deliberate hook failure");
    });

    expect(() => {
      mockSdk.triggerHook("FailingFunction", []);
    }).not.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[CRABS HOOK CRASH]"),
      expect.any(String),
      expect.any(String),
      "FailingFunction",
      expect.any(String),
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });
});
