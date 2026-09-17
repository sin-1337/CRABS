/**
 * CRABS Whisper+ Module
 *
 * This module implements the enhanced whisper functionality for the CRABS mod.
 * It extends the base whisper command with additional features including:
 * - Target resolution by Member Number, Character Name, or Nickname (with ambiguity guards)
 * - Transparent CommandParse elevation for standard whisper commands (/whisper and /w)
 * - Range-based whisper handling
 * - Enhanced message formatting
 * - Self-whisper support with visual indicators
 * - Bracket replacement for better visual distinction
 * - Integration with the CRABS asset system for icons
 *
 * The module provides both command-line and roster-based interfaces for sending
 * whispers to other players in the chat room.
 *
 * Hardened for defensive execution across missing base game globals,
 * external chat mutations, and safe target validation.
 *
 * @module whisperplus
 */

import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { CRABS_Base, Drawer } from "../base";
import { Assets } from "../base";
import { CrossMod } from "../crossmod/crossmod";
import { Notification } from "../notifications/notifications";
import { Settings } from "../settings/settings";

import locales from "./i18n.json";

/**
 * Class representing the Whisper+ enhanced messaging system.
 * @extends CRABS_Base
 */
export class WhisperPlus extends CRABS_Base {
  /**
   * Creates an instance of the WhisperPlus module and registers its locales.
   *
   * @param {ModSDKModAPI} CRABS - The ModSDK API instance.
   */
  constructor(CRABS: ModSDKModAPI) {
    super(CRABS, "whisperplus", locales);
    Drawer.registerUIInjector((root: HTMLElement) => {
      this.buildui(undefined, undefined, root);
    });
  }

  /**
   * Initializes the hooks for constant WhisperPlus conversation flow.
   * Hooks are guarded against structural mutations in the chat event chain.
   *
   * @returns {void}
   */
  public setupHooks(): void {
    /**
     * Hook: CommandParse
     * Intercepts chat commands right at execution.
     * Silently routes standard whispers (/whisper and /w) to Whisper+ when "Always On" is enabled,
     * WITHOUT visibly altering the text box while the user is typing.
     */
    this.safeHook(
      "CommandParse",
      10,
      (functionArguments: any[], next: (functionArguments: any[]) => void) => {
        try {
          const command = functionArguments[0];

          if (
            Settings.instance?.data?.whisperPlusAlwaysOn &&
            typeof command === "string" &&
            /^\/(whisper|w)\s+/i.test(command)
          ) {
            functionArguments[0] = command.replace(
              /^\/(whisper|w)\s+/i,
              "/whisper+ ",
            );
          }
        } catch (err) {
          console.error("[CRABS] CommandParse hook error:", err);
        }

        return next(functionArguments);
      },
    );

    /**
     * Hook: ChatRoomSendLocal
     * Fallback beep handling for regular whisper failure.
     */
    this.safeHook(
      "ChatRoomSendLocal",
      10,
      (functionArguments: any[], next: (functionArguments: any[]) => void) => {
        try {
          const message = functionArguments[0];
          const settings = Settings.instance?.data;

          if (
            !settings?.whisperPlusAlwaysOn &&
            settings?.autoBeepOnRegularWhisper &&
            settings?.autoBeepOnLeave &&
            typeof message === "string"
          ) {
            const globalWindow = window as any;
            const prefix: string =
              typeof globalWindow.TextGet === "function"
                ? globalWindow.TextGet("CommandNoWhisperTarget") || ""
                : "";

            if (prefix && message.startsWith(prefix)) {
              const targetStr = message
                .slice(prefix.length)
                .trim()
                .replace(/\.$/, "");
              const memberNumber = parseInt(targetStr, 10);

              if (!isNaN(memberNumber)) {
                const chatInput = document.getElementById(
                  "InputChat",
                ) as HTMLTextAreaElement | null;
                const inputVal = chatInput?.value || "";

                if (/^\/(whisper|w)\s+/i.test(inputVal)) {
                  const parts = inputVal.trim().split(/\s+/);
                  if (parts.length >= 3) {
                    const parsedNum = parseInt(parts[1], 10);
                    if (parsedNum === memberNumber) {
                      const msgIndex =
                        inputVal.indexOf(parts[1]) + parts[1].length;
                      const text = inputVal.slice(msgIndex).trim();

                      if (text && this.trySendAccountBeep(memberNumber, text)) {
                        if (chatInput) {
                          chatInput.value = "";
                          chatInput.dispatchEvent(
                            new Event("input", { bubbles: true }),
                          );
                        }
                        return;
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error("[CRABS] ChatRoomSendLocal hook error:", err);
        }

        return next(functionArguments);
      },
    );

    /**
     * Hook: ChatRoomMessageDisplay
     * Handles visual styling and hides the raw prefix in rendered messages.
     */
    this.safeHook(
      "ChatRoomMessageDisplay",
      10,
      (
        functionArguments: any[],
        next: (functionArguments: any[]) => HTMLDivElement,
      ) => {
        const div = next(functionArguments);

        try {
          const data = functionArguments[0];
          const message = functionArguments[1] as string;

          if (
            div &&
            data?.Type === "Whisper" &&
            typeof message === "string" &&
            message.includes("+:")
          ) {
            const contents = div.querySelectorAll(".chat-room-message-content");
            const contentNode = contents[contents.length - 1];

            if (contentNode && contentNode.innerHTML) {
              contentNode.innerHTML = contentNode.innerHTML.replace(
                /\+:\s?/,
                '<span style="display:none;">$&</span>',
              );
            }

            div.childNodes.forEach((node) => {
              if (
                node.nodeType === Node.TEXT_NODE &&
                node.textContent?.includes("Whisper")
              ) {
                node.textContent = node.textContent.replace(
                  "Whisper",
                  "Whisper+",
                );
              }
            });
          }
        } catch (err) {
          console.error("[CRABS] ChatRoomMessageDisplay hook error:", err);
        }

        return div;
      },
    );
  }

  /**
   * Registers message handlers to stylize Whisper+ messages in the chat log.
   *
   * @returns {void}
   */
  public setupMessageHandlers(): void {
    const globalWindow = window as any;

    if (typeof globalWindow.ChatRoomRegisterMessageHandler === "function") {
      globalWindow.ChatRoomRegisterMessageHandler({
        Description: "Stylize Whisper+ messages",
        Priority: 450,
        Callback: (
          data: any,
          _sender: any,
          message: string,
          _metadata: any,
        ) => {
          if (
            data?.Type === "Whisper" &&
            typeof message === "string" &&
            message.includes("+:")
          ) {
            const stylizedTag =
              '<span style="color: #ff99bb; font-weight: bold; text-shadow: 1px 1px 2px #000;">[W+]<span style="display:none;">+:</span></span>';
            return { msg: message.replace("+:", stylizedTag) };
          }
          return false;
        },
      });
    }
  }

  /**
   * Helper to send an out-of-room account beep to friends / best friends.
   *
   * @param {number} memberNumber - Target member number.
   * @param {string} message - Message text.
   * @returns {boolean} True if successfully queued as a beep.
   * @private
   */
  private trySendAccountBeep(memberNumber: number, message: string): boolean {
    try {
      const globalWindow = window as any;
      const playerWindow = globalWindow.Player;

      const isFriend = playerWindow?.FriendList?.some(
        (id: any) => id == memberNumber,
      );
      const isBestFriend =
        CrossMod.detectMod("BCTweaks") &&
        playerWindow?.BCT?.bctSettings?.bestFriendsList?.some(
          (id: any) => id == memberNumber,
        );

      if (isFriend || isBestFriend) {
        if (typeof globalWindow.ServerSend === "function") {
          globalWindow.ServerSend("AccountBeep", {
            MemberNumber: memberNumber,
            BeepType: "",
            Message: message,
          });
        }

        const defaultMemberName = this.t("chat.fallback_member");
        const targetName =
          playerWindow?.FriendNames?.get?.(memberNumber) || defaultMemberName;

        if (typeof ToastManager !== "undefined") {
          Notification.send({
            message: this.t("notifications.sent_as_beep"),
            title: "Whisper+",
          });
        }

        if (typeof globalWindow.ChatRoomSendLocal === "function") {
          globalWindow.ChatRoomSendLocal(
            this.t("chat.beep_to", {
              targetName,
              memberNumber,
              message,
            }),
          );
        }

        return true;
      }
    } catch (e) {
      console.error("[CRABS] trySendAccountBeep error:", e);
    }

    return false;
  }

  /**
   * Resolves the whisper target and remaining message body.
   * Supports target resolution by:
   * - Explicit Member Number
   * - Player Name (case-insensitive, greedy multi-word matching)
   * - Player Nickname (case-insensitive, greedy multi-word matching)
   *
   * Guarantees ambiguity safety: if multiple room occupants share a name/nickname,
   * targeting fails with a distinct error prompting member number usage.
   *
   * @param {string} commandArguments - Raw arguments string passed to the command.
   * @param {string} command - Full command line string.
   * @returns {{ targetCharacter: any | null; memberNumber: number; message: string; error?: string }}
   * @private
   */
  private resolveTargetAndMessage(
    commandArguments: string,
    command: string,
  ): {
    targetCharacter: any | null;
    memberNumber: number;
    message: string;
    error?: string;
  } {
    let raw = (commandArguments || "").trim();

    // Fallback parsing from full command string if commandArguments was empty
    if (!raw && command) {
      const match = command.match(/^\/\S+\s+(.+)$/s);
      if (match) {
        raw = match[1].trim();
      }
    }

    if (!raw) {
      return {
        targetCharacter: null,
        memberNumber: NaN,
        message: "",
        error: this.t("chat.blank_message"),
      };
    }

    const characters: any[] = (window as any).ChatRoomCharacter || [];

    // Case 1: First token is an explicit numeric Member Number
    const firstSpaceIndex = raw.indexOf(" ");
    const firstToken =
      firstSpaceIndex === -1 ? raw : raw.slice(0, firstSpaceIndex);

    if (/^\d+$/.test(firstToken)) {
      const memberNumber = parseInt(firstToken, 10);
      const message =
        firstSpaceIndex === -1 ? "" : raw.slice(firstSpaceIndex + 1).trim();
      const targetCharacter =
        characters.find((c) => c?.MemberNumber === memberNumber) || null;

      return { targetCharacter, memberNumber, message };
    }

    // Case 2: Target is specified via Name or Nickname
    const tokens = raw.split(/\s+/);
    let matchedChar: any = null;
    let matchedTokenCount = 0;

    const findMatches = (needle: string) => {
      const normalizedNeedle = needle.trim().toLocaleLowerCase();
      if (!normalizedNeedle) return [];
      return characters.filter(
        (c) =>
          c?.Name?.toLocaleLowerCase() === normalizedNeedle ||
          c?.Nickname?.toLocaleLowerCase() === normalizedNeedle,
      );
    };

    // Greedy search: try longest combinations of tokens first to support multi-word names
    for (let i = tokens.length; i >= 1; i--) {
      const candidateName = tokens.slice(0, i).join(" ");
      const matches = findMatches(candidateName);

      if (matches.length > 1) {
        return {
          targetCharacter: null,
          memberNumber: NaN,
          message: "",
          error: `Multiple players match "${candidateName}". Please use their Member Number.`,
        };
      }

      if (matches.length === 1) {
        matchedChar = matches[0];
        matchedTokenCount = i;
        break;
      }
    }

    if (matchedChar) {
      // Reconstruct remaining message starting past the matched name tokens
      const candidateName = tokens.slice(0, matchedTokenCount).join(" ");
      const matchIndex = raw.indexOf(candidateName);
      const message =
        matchIndex !== -1
          ? raw.slice(matchIndex + candidateName.length).trim()
          : "";

      return {
        targetCharacter: matchedChar,
        memberNumber: matchedChar.MemberNumber,
        message,
      };
    }

    return {
      targetCharacter: null,
      memberNumber: NaN,
      message: "",
      error: this.t("chat.invalid_member"),
    };
  }

  /**
   * Validates that the target member exists in the active room.
   * Safely inspects the ChatRoomCharacter collection array.
   *
   * @param {any} target - The target (either member number or character object).
   * @returns {any | null} Validated target character or null if invalid.
   * @private
   */
  private validateTarget(target: any): any {
    if (typeof target === "object" && target !== null) {
      return target;
    }

    const memberNumber = parseInt(target, 10);
    if (isNaN(memberNumber)) {
      return null;
    }

    const characters = (window as any).ChatRoomCharacter;
    return Array.isArray(characters)
      ? characters.find((character) => character?.MemberNumber === memberNumber)
      : null;
  }

  /**
   * Sends a whisper message to a target character.
   *
   * @param {any} target - The target character object or member number.
   * @param {string} message - The message to send.
   * @returns {boolean} Whether the message was sent successfully.
   * @private
   */
  private sendWhisperMessage(target: any, message: string): boolean {
    if (!message) {
      return false;
    }

    const globalWindow = window as any;
    const player = globalWindow.Player;
    const targetMember =
      typeof target === "object" && target !== null
        ? target
        : this.validateTarget(target);

    if (!targetMember) {
      const cmdNoTarget =
        typeof globalWindow.TextGet === "function"
          ? globalWindow.TextGet("CommandNoWhisperTarget")
          : "Cannot find target";

      if (typeof globalWindow.ChatRoomSendLocal === "function") {
        globalWindow.ChatRoomSendLocal(
          `${cmdNoTarget} ${target?.MemberNumber || target}.`,
          30_000,
        );
      }
      return false;
    }

    if (Settings.instance?.data?.closeDrawerOnWhisper) {
      Drawer.close();
    }

    if (targetMember.MemberNumber === player?.MemberNumber) {
      const thoughtIcon = Assets.printimage({ key: "thought" });
      const selfMessage = this.t("chat.note_to_self", {
        icon: thoughtIcon,
        labelColor: player?.LabelColor || "#FFFFFF",
        message,
      });
      if (typeof globalWindow.ChatRoomSendLocal === "function") {
        globalWindow.ChatRoomSendLocal(selfMessage);
      }
      return true;
    }

    let formattedMsg = message.replace(/\(/g, "❪").replace(/\)/g, "❫");

    if (targetMember.MemberNumber === player?.MemberNumber) {
      if (typeof globalWindow.addChatMessage === "function") {
        globalWindow.addChatMessage(formattedMsg);
      } else if (typeof globalWindow.ChatRoomSendLocal === "function") {
        globalWindow.ChatRoomSendLocal(formattedMsg);
      }
      return true;
    } else {
      formattedMsg = `+: ${formattedMsg}`;

      const isMapActive =
        typeof globalWindow.ChatRoomMapViewIsActive === "function" &&
        globalWindow.ChatRoomMapViewIsActive();
      const inRange =
        typeof globalWindow.ChatRoomMapViewCharacterOnWhisperRange ===
        "function"
          ? globalWindow.ChatRoomMapViewCharacterOnWhisperRange(targetMember)
          : true;

      if (isMapActive && !inRange && formattedMsg[0] !== "(") {
        const hasUrl = /https?:\/\/[^\s]+/.test(formattedMsg);
        formattedMsg = `(${formattedMsg}${hasUrl ? " " : ""})`;
      }

      if (
        typeof globalWindow.ChatRoomGenerateChatRoomChatMessage !== "function"
      ) {
        return false;
      }

      const data = globalWindow.ChatRoomGenerateChatRoomChatMessage(
        "Whisper",
        formattedMsg,
      );
      if (!data) {
        return false;
      }

      data.Target = targetMember.MemberNumber;
      const serverData = { ...data, Type: "Whisper" };

      if (typeof globalWindow.ServerSend === "function") {
        globalWindow.ServerSend("ChatRoomChat", serverData);
      }

      data.Sender = player?.MemberNumber;
      if (typeof globalWindow.ChatRoomMessage === "function") {
        globalWindow.ChatRoomMessage(data);
      }

      return true;
    }
  }

  /**
   * Sets up the /whisper+ command for a given member number in chat input.
   *
   * @param {number} memberNumber - Member number of the target.
   * @returns {void}
   */
  public sendWhisper(memberNumber: number): void {
    const globalWindow = window as any;
    const commands = globalWindow.Commands;

    if (Array.isArray(commands)) {
      for (const command of commands) {
        if (
          command?.Tag === "whisper+" &&
          typeof globalWindow.CommandSet === "function"
        ) {
          globalWindow.CommandSet(command.Tag + " " + memberNumber);
          break;
        }
      }
    }
  }

  /**
   * Returns the player's gag level from 0 to 4.
   *
   * @returns {number} The current gag level.
   * @private
   */
  private getGagLevel(): number {
    const player = (window as any).Player;
    if (!player || typeof player.HasEffect !== "function") return 0;

    if (
      player.HasEffect("GagTotal") ||
      player.HasEffect("GagTotal2") ||
      player.HasEffect("GagTotal3") ||
      player.HasEffect("GagTotal4")
    )
      return 4;
    if (player.HasEffect("GagHeavy") || player.HasEffect("GagVeryHeavy"))
      return 3;
    if (player.HasEffect("GagNormal") || player.HasEffect("GagMedium"))
      return 2;
    if (
      player.HasEffect("GagLight") ||
      player.HasEffect("GagVeryLight") ||
      player.HasEffect("GagEasy")
    )
      return 1;
    return 0;
  }

  /**
   * Processes the Whisper+ command.
   * Accepts member numbers, character names, or nicknames as targets.
   *
   * @param {string} commandArguments - Arguments passed from player (target + message).
   * @param {string} command - Full command line passed as command (BC quirk).
   * @returns {number} 0 indicates success, 1 is an error.
   */
  public whisperplus(commandArguments: string, command: string): number {
    const globalWindow = window as any;

    if (Settings.instance?.data?.immersiveGag && this.getGagLevel() > 0) {
      const blockedMsg = this.t("notifications.blocked_gagged");
      if (typeof ToastManager !== "undefined") {
        Notification.send({
          message: blockedMsg,
          title: this.t("notifications.blocked_title"),
        });
      } else if (typeof globalWindow.ChatRoomSendLocal === "function") {
        globalWindow.ChatRoomSendLocal(blockedMsg, 10_000);
      }
      return 1;
    }

    const { targetCharacter, memberNumber, message, error } =
      this.resolveTargetAndMessage(commandArguments, command);

    if (error) {
      if (typeof globalWindow.ChatRoomSendLocal === "function") {
        globalWindow.ChatRoomSendLocal(error, 30_000);
      }
      return 1;
    }

    if (Settings.instance?.data?.respectBcxRules) {
      const ruleState = CrossMod.getBCXRuleState(
        "speech_restrict_whisper_send",
      );
      if (ruleState?.isEnforced) {
        ruleState.triggerAttempt?.(memberNumber);
        return 1;
      }
    }

    if (!message) {
      if (typeof globalWindow.ChatRoomSendLocal === "function") {
        globalWindow.ChatRoomSendLocal(this.t("chat.blank_message"), 30_000);
      }
      return 1;
    }

    // If target is not currently in the room
    if (!targetCharacter) {
      let beepSent = false;

      if (Settings.instance?.data?.autoBeepOnLeave && !isNaN(memberNumber)) {
        beepSent = this.trySendAccountBeep(memberNumber, message);
        if (beepSent) return 0;
      }

      let errorMsg = this.t("chat.player_left");
      if (
        Settings.instance?.data?.autoBeepOnLeave &&
        !isNaN(memberNumber) &&
        !beepSent
      ) {
        errorMsg += this.t("chat.auto_beep_failed");
      }

      if (typeof ToastManager !== "undefined") {
        Notification.send({
          message: errorMsg,
          title: this.t("notifications.failed_title"),
        });
      }

      if (typeof globalWindow.ChatRoomSendLocal === "function") {
        globalWindow.ChatRoomSendLocal(errorMsg, 50_000);
      }

      return 1;
    }

    const success = this.sendWhisperMessage(targetCharacter, message);
    return success ? 0 : 1;
  }
}
