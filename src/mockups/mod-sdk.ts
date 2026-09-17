import { vi } from "vitest";
import type { ModSDKModAPI } from "bondage-club-mod-sdk";

export function createMockModSDK(): ModSDKModAPI & {
  triggerHook: (target: string, args?: any[]) => any;
  getHooks: (target: string) => Array<{ priority: number; callback: Function }>;
} {
  const hooks = new Map<string, { priority: number; callback: Function }[]>();

  return {
    hookFunction: vi.fn(
      (target: string, priority: number, callback: Function) => {
        if (!hooks.has(target)) hooks.set(target, []);
        hooks.get(target)!.push({ priority, callback });
      },
    ),
    triggerHook: (target: string, args: any[] = []) => {
      const handlers = hooks.get(target) || [];
      handlers.sort((a, b) => b.priority - a.priority);

      const runChain = (index: number, currentArgs: any[]): any => {
        if (index >= handlers.length) return;
        return handlers[index].callback(currentArgs, (nextArgs: any[]) =>
          runChain(index + 1, nextArgs),
        );
      };

      return runChain(0, args);
    },
    getHooks: (target: string) => hooks.get(target) || [],
  } as any;
}
