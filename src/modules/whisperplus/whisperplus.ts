/**
 * CRABS Whisper+ Module
 *
 * This module implements the enhanced whisper functionality for the CRABS mod.
 * It extends the base whisper command with additional features including:
 * - Range-based whisper handling
 * - Enhanced message formatting
 * - Self-whisper support with visual indicators
 * - Bracket replacement for better visual distinction
 * - Integration with the CRABS asset system for icons
 *
 * The module provides both command-line and roster-based interfaces for sending
 * whispers to other players in the chat room.
 */

import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { CRABS_Base } from "../base";
import { Assets } from "../assets";
import { CrossMod } from "../crossmod";
import { Notification } from "../notifications";
import { Settings } from "../settings";
import { Drawer } from "../drawer";

import * as locales from "./i18n";

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
  }

  /**
   * Initializes the hooks for constant WhisperPlus conversation flow.
   *
   * @returns {void}
   */
  public setupHooks(): void {
    /**
     * Hook: CommandParse
     * Intercepts chat commands before execution to convert standard whispers
     * into Whisper+ commands when the "Always On" setting is enabled.
     */
    this.safeHook(
      "CommandParse",
      10,
      (functionArguments: any[], next: (functionArguments: any[]) => void) => {
        let command = functionArguments[0] as string;

        if (Settings.instance.data.whisperPlusAlwaysOn) {
          if (typeof command === "string" && command.startsWith("/whisper ")) {
            functionArguments[0] = command.replace(/^\/whisper /, "/whisper+ ");
          }
        }

        return next(functionArguments);
      },
    );

    /**
     * Hook: ChatRoomSendLocal
     * Intercepts standard whisper missing-target errors to auto-elevate to a beep
     * if autoBeepOnRegularWhisper is enabled and whisperPlusAlwaysOn is disabled.
     */
    this.safeHook(
      "ChatRoomSendLocal",
      10,
      (functionArguments: any[], next: (functionArguments: any[]) => void) => {
        const message = functionArguments[0] as string;

        if (
          !Settings.instance.data.whisperPlusAlwaysOn &&
          Settings.instance.data.autoBeepOnRegularWhisper &&
          Settings.instance.data.autoBeepOnLeave &&
          typeof message === "string"
        ) {
          const prefix: string =
            (TextGet as any)("CommandNoWhisperTarget") || "";
          if (message.startsWith(prefix)) {
            const targetStr = message
              .slice(prefix.length)
              .trim()
              .replace(/\.$/, "");
            const memberNumber = parseInt(targetStr, 10);

            if (!isNaN(memberNumber)) {
              const chatInput = document.getElementById(
                "InputChat",
              ) as HTMLTextAreaElement;
              const inputVal = chatInput?.value || "";

              if (inputVal.startsWith("/whisper ")) {
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

        return next(functionArguments);
      },
    );

    /**
     * Hook: ChatRoomMessageNameClick
     * Intercepts clicks on a character's name or quick-reply arrow.
     */
    this.safeHook(
      "ChatRoomMessageNameClick",
      10,
      function (
        this: HTMLElement,
        functionArguments: any[],
        next: (functionArguments: any[]) => void,
      ) {
        const contents = this.parentElement?.querySelectorAll(
          ".chat-room-message-content",
        );
        const contentNode = contents ? contents[contents.length - 1] : null;
        const isWhisperPlus =
          Settings.instance.data.whisperPlusAlwaysOn ||
          contentNode?.textContent?.includes("+:");

        next(functionArguments);

        if (isWhisperPlus) {
          const chatInput = document.getElementById(
            "InputChat",
          ) as HTMLTextAreaElement;
          if (chatInput && chatInput.value.startsWith("/whisper ")) {
            chatInput.value = chatInput.value.replace(
              /^\/whisper /,
              "/whisper+ ",
            );
            chatInput.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
      },
    );

    /**
     * Hook: ChatRoomMessageSetReply
     * Intercepts "Reply" from context menus.
     */
    this.safeHook(
      "ChatRoomMessageSetReply",
      10,
      (functionArguments: any[], next: (functionArguments: any[]) => void) => {
        const messageId = functionArguments[0];
        const contentNode = document.querySelector(`[msgid="${messageId}"]`);
        const isWhisperPlus =
          Settings.instance.data.whisperPlusAlwaysOn ||
          contentNode?.textContent?.includes("+:");

        next(functionArguments);

        if (isWhisperPlus) {
          const chatInput = document.getElementById(
            "InputChat",
          ) as HTMLTextAreaElement;
          if (chatInput && chatInput.value.startsWith("/whisper ")) {
            chatInput.value = chatInput.value.replace(
              /^\/whisper /,
              "/whisper+ ",
            );
            chatInput.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
      },
    );

    /**
     * Hook: ChatRoomMessageDisplay
     */
    this.safeHook(
      "ChatRoomMessageDisplay",
      10,
      (
        functionArguments: any[],
        next: (functionArguments: any[]) => HTMLDivElement,
      ) => {
        const data = functionArguments[0];
        const message = functionArguments[1] as string;

        const div = next(functionArguments);

        if (div && data?.Type === "Whisper" && message?.includes("+:")) {
          const contents = div.querySelectorAll(".chat-room-message-content");
          const contentNode = contents[contents.length - 1];

          if (contentNode && contentNode.innerHTML) {
            contentNode.innerHTML = contentNode.innerHTML.replace(
              /\+:\s?/,
              '<span style="display:none;">$&</span>',
            );
          }

          div.childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE && node.textContent) {
              if (node.textContent.includes("Whisper")) {
                node.textContent = node.textContent.replace(
                  "Whisper",
                  "Whisper+",
                );
              }
            }
          });
        }

        return div;
      },
    );

    // Global delegated listener for Whisper+ clicks
    document.addEventListener(
      "click",
      (event) => {
        const target = event.target as HTMLElement;
        const nameElement = target.closest(".CRABS_player-name") as HTMLElement;

        if (nameElement) {
          const memberNumStr = nameElement.getAttribute("data-player-number");
          if (memberNumStr) {
            event.stopPropagation();
            event.preventDefault();

            const memberNumber = parseInt(memberNumStr, 10);
            if (!isNaN(memberNumber)) {
              this.sendWhisper(memberNumber);
            }
          }
        }
      },
      { capture: true },
    );
  }

  /**
   * Registers message handlers to stylize Whisper+ messages in the chat log.
   *
   * @returns {void}
   */
  public setupMessageHandlers(): void {
    ChatRoomRegisterMessageHandler({
      Description: "Stylize Whisper+ messages",
      Priority: 450,
      Callback: (data: any, _sender: any, message: string, _metadata: any) => {
        if (data.Type === "Whisper" && message.includes("+:")) {
          const stylizedTag =
            '<span style="color: #ff99bb; font-weight: bold; text-shadow: 1px 1px 2px #000;">[W+]<span style="display:none;">+:</span></span>';
          return { msg: message.replace("+:", stylizedTag) };
        }
        return false;
      },
    });
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
    const playerWindow = (window as any).Player;

    const isFriend = playerWindow?.FriendList?.some(
      (id: any) => id == memberNumber,
    );
    const isBestFriend =
      CrossMod.detectMod("BCTweaks") &&
      playerWindow?.BCT?.bctSettings?.bestFriendsList?.some(
        (id: any) => id == memberNumber,
      );

    if (isFriend || isBestFriend) {
      ServerSend("AccountBeep", {
        MemberNumber: memberNumber,
        BeepType: "",
        Message: message,
      });

      const defaultMemberName = this.t("chat.fallback_member");
      const targetName =
        playerWindow?.FriendNames?.get?.(memberNumber) || defaultMemberName;

      if (typeof ToastManager !== "undefined") {
        Notification.send({
          message: this.t("notifications.sent_as_beep"),
          title: "Whisper+",
        });
      }
      ChatRoomSendLocal(
        this.t("chat.beep_to", {
          targetName,
          memberNumber,
          message,
        }),
      );

      return true;
    }

    return false;
  }

  /**
   * Parses the command arguments to extract member number and message.
   *
   * @param {string} commandArguments - The arguments string passed to the command.
   * @param {string} command - The full command string.
   * @returns {{ memberNumber: number, message: string }} Parsed member number and message.
   * @private
   */
  private parseArguments(
    commandArguments: string,
    command: string,
  ): { memberNumber: number; message: string } {
    let memberNumber: number = NaN;
    let message: string = "";

    if (command) {
      const commandParts = command.trim().split(/\s+/);
      if (commandParts.length >= 2) {
        memberNumber = parseInt(commandParts[1]);

        if (!isNaN(memberNumber)) {
          const prefix = `${commandParts[0]} ${commandParts[1]} `;
          const prefixIndex = command.indexOf(prefix);

          if (prefixIndex !== -1) {
            message = command.substring(prefixIndex + prefix.length);
            return { memberNumber, message };
          }
        }
      }
    }

    const firstSpaceIndex = commandArguments.indexOf(" ");
    if (firstSpaceIndex !== -1) {
      memberNumber = parseInt(commandArguments.slice(0, firstSpaceIndex));
      message = commandArguments.slice(firstSpaceIndex + 1);
    } else {
      memberNumber = parseInt(commandArguments);
    }

    return { memberNumber, message };
  }

  /**
   * Validates that the target member exists.
   *
   * @param {any} target - The target (either member number or character object).
   * @returns {any | null} Validated target character or null if invalid.
   * @private
   */
  private validateTarget(target: any): any {
    if (typeof target === "object" && target !== null) {
      return target;
    }

    const memberNumber = parseInt(target);
    if (isNaN(memberNumber)) {
      return null;
    }

    return ChatRoomCharacter.find(
      (character) => character.MemberNumber === memberNumber,
    );
  }

  /**
   * Sends a whisper message to a target character.
   *
   * @param {any} target - The target character or member number.
   * @param {string} message - The message to send.
   * @returns {boolean} Whether the message was sent successfully.
   * @private
   */
  private sendWhisperMessage(target: any, message: string): boolean {
    if (!message) {
      return false;
    }

    const targetMember = this.validateTarget(target);
    if (!targetMember) {
      ChatRoomSendLocal(
        `${TextGet("CommandNoWhisperTarget")} ${target}.`,
        30_000,
      );
      return false;
    }

    if (Settings.instance.data.closeDrawerOnWhisper) {
      Drawer.close();
    }

    if (targetMember.MemberNumber === Player.MemberNumber) {
      const thoughtIcon = Assets.printimage({ key: "thought" });
      const selfMessage = this.t("chat.note_to_self", {
        icon: thoughtIcon,
        labelColor: Player.LabelColor || "#FFFFFF",
        message,
      });
      ChatRoomSendLocal(selfMessage);
      return false;
    }

    let formattedMsg = message.replace(/\(/g, "❪").replace(/\)/g, "❫");

    if (target.MemberNumber === Player.MemberNumber) {
      addChatMessage(formattedMsg);
      return true;
    } else {
      formattedMsg = `+: ${formattedMsg}`;

      if (
        ChatRoomMapViewIsActive() &&
        !ChatRoomMapViewCharacterOnWhisperRange(target) &&
        formattedMsg[0] !== "("
      ) {
        const hasUrl = /https?:\/\/[^\s]+/.test(formattedMsg);
        formattedMsg = `(${formattedMsg}${hasUrl ? " " : ""})`;
      }

      const data = ChatRoomGenerateChatRoomChatMessage("Whisper", formattedMsg);
      if (!data) {
        return false;
      }

      data.Target = targetMember.MemberNumber;
      const serverData = { ...data, Type: "Whisper" };
      ServerSend("ChatRoomChat", serverData);

      data.Sender = Player.MemberNumber;
      ChatRoomMessage(data);

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
    for (const command of Commands) {
      if (command.Tag == "whisper+") {
        window.CommandSet(command.Tag + " " + memberNumber);
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
    if (
      Player.HasEffect("GagTotal") ||
      Player.HasEffect("GagTotal2") ||
      Player.HasEffect("GagTotal3") ||
      Player.HasEffect("GagTotal4")
    )
      return 4;
    if (Player.HasEffect("GagHeavy") || Player.HasEffect("GagVeryHeavy"))
      return 3;
    if (Player.HasEffect("GagNormal") || Player.HasEffect("GagMedium"))
      return 2;
    if (
      Player.HasEffect("GagLight") ||
      Player.HasEffect("GagVeryLight") ||
      Player.HasEffect("GagEasy")
    )
      return 1;
    return 0;
  }

  /**
   * Processes the Whisper+ command.
   *
   * @param {string} commandArguments - Arguments passed from player (message).
   * @param {string} command - Arguments passed as command (BC quirk).
   * @returns {number} 0 indicates success, 1 is an error.
   */
  public whisperplus(commandArguments: string, command: string): number {
    if (Settings.instance.data.immersiveGag && this.getGagLevel() > 0) {
      const blockedMsg = this.t("notifications.blocked_gagged");
      if (typeof ToastManager !== "undefined") {
        Notification.send({
          message: blockedMsg,
          title: this.t("notifications.blocked_title"),
        });
      } else {
        ChatRoomSendLocal(blockedMsg, 10_000);
      }
      return 1;
    }

    if (Settings.instance.data.respectBcxRules) {
      const ruleState = CrossMod.getBCXRuleState(
        "speech_restrict_whisper_send",
      );
      if (ruleState?.isEnforced) {
        const { memberNumber } = this.parseArguments(commandArguments, command);
        ruleState.triggerAttempt(memberNumber);
        return 1;
      }
    }

    const { memberNumber, message } = this.parseArguments(
      commandArguments,
      command,
    );

    if (isNaN(memberNumber)) {
      ChatRoomSendLocal(this.t("chat.invalid_member"), 30_000);
      return 1;
    }

    if (!message) {
      ChatRoomSendLocal(this.t("chat.blank_message"), 30_000);
      return 1;
    }

    const target = ChatRoomCharacter.find(
      (character: any) => character.MemberNumber == memberNumber,
    );

    if (!target) {
      let beepSent = false;

      if (Settings.instance.data.autoBeepOnLeave) {
        beepSent = this.trySendAccountBeep(memberNumber, message);
        if (beepSent) return 0;
      }

      let errorMsg = this.t("chat.player_left");
      if (Settings.instance.data.autoBeepOnLeave && !beepSent) {
        errorMsg += this.t("chat.auto_beep_failed");
      }

      if (typeof ToastManager !== "undefined") {
        Notification.send({
          message: errorMsg,
          title: this.t("notifications.failed_title"),
        });
      }
      ChatRoomSendLocal(errorMsg, 50_000);

      return 1;
    }

    const success = this.sendWhisperMessage(target || memberNumber, message);
    return success ? 0 : 1;
  }
}
