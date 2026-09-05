/**
 * CRABS Chat Manager Module
 *
 * Handles chat log interactions, custom font normalization,
 * chat hover states, and message mention highlighting.
 */

import { CRABS_Base } from "../base";
import { ModSDKModAPI } from "bondage-club-mod-sdk";
import { Settings } from "../settings";
import type { Roster } from "../roster";
import "./templates/chat.css";

import * as locales from "./i18n";

/**
 * Class managing chat log message hooks, highlights, and DOM hovers.
 * @extends CRABS_Base
 */
export class ChatManager extends CRABS_Base {
  private roster: Roster;
  public chatLogHoveredPlayer: number | null = null;
  private hoveredNormalizedMessage: HTMLElement | null = null;

  /**
   * Initializes the ChatManager module and registers its localization dictionary.
   *
   * @param {ModSDKModAPI} CRABS - The ModSDK API instance.
   * @param {Roster} rosterInstance - Active Roster module reference for hover sync.
   */
  constructor(CRABS: ModSDKModAPI, rosterInstance: Roster) {
    super(CRABS, "chat", locales);
    this.roster = rosterInstance;
    this.setupMessageHooks();
    this.setupChatLogHover();
  }

  /**
   * Recursively normalizes or restores text nodes within an element.
   *
   * @param {HTMLElement} element - The root message element to scan.
   * @param {boolean} normalize - Whether to apply font normalization or restore original text.
   * @returns {void}
   * @private
   */
  private toggleTextNormalization(
    element: HTMLElement,
    normalize: boolean,
  ): void {
    const originalStore = (element as any)._crabsOriginalTextNodes as
      | Map<Text, string>
      | undefined;

    if (normalize) {
      const textMap = originalStore || new Map<Text, string>();
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode() as Text | null;

      while (node) {
        const parent = node.parentElement;
        if (!parent?.classList.contains("chat-room-metadata")) {
          const raw = node.nodeValue || "";
          const normalized = this.cleanZalgoAndNormalize(raw);
          if (raw !== normalized) {
            if (!textMap.has(node)) {
              textMap.set(node, raw);
            }
            node.nodeValue = normalized;
          }
        }
        node = walker.nextNode() as Text | null;
      }

      if (textMap.size > 0) {
        (element as any)._crabsOriginalTextNodes = textMap;
      }
    } else if (originalStore) {
      originalStore.forEach((origText, node) => {
        if (node && node.parentNode) {
          node.nodeValue = origText;
        }
      });
      delete (element as any)._crabsOriginalTextNodes;
    }
  }

  /**
   * Sets up mouseover and mouseout listeners across the chat log.
   *
   * @private
   * @returns {void}
   */
  private setupChatLogHover(): void {
    document.addEventListener("mouseover", (mouseEvent) => {
      const target = mouseEvent.target as HTMLElement;
      if (!target) return;

      const messageElement = target.closest(
        ".ChatMessage",
      ) as HTMLElement | null;

      // --- Font Normalization on Message Hover ---
      if (
        Settings.instance?.data?.normalizeFontOnHover !== false &&
        messageElement &&
        this.hoveredNormalizedMessage !== messageElement
      ) {
        if (
          this.hoveredNormalizedMessage &&
          this.hoveredNormalizedMessage !== messageElement
        ) {
          this.toggleTextNormalization(this.hoveredNormalizedMessage, false);
        }
        this.hoveredNormalizedMessage = messageElement;
        this.toggleTextNormalization(messageElement, true);
      }

      // --- Player Name Highlight Hover ---
      if (Settings.instance?.data?.chatLogHover === false) return;
      const nameElement = target.closest(".ChatMessageName");

      if (nameElement && messageElement) {
        const senderID = parseInt(messageElement.dataset.sender || "", 10);
        const targetID = parseInt(messageElement.dataset.target || "", 10);
        const isWhisper =
          messageElement.classList.contains("ChatMessageWhisper");

        const player = (window as any).Player;
        let memberNumber = senderID;

        if (
          isWhisper &&
          senderID === player?.MemberNumber &&
          !isNaN(targetID)
        ) {
          memberNumber = targetID;
        }

        if (
          !isNaN(memberNumber) &&
          this.chatLogHoveredPlayer !== memberNumber
        ) {
          this.chatLogHoveredPlayer = memberNumber;
          if (this.roster) {
            this.roster.chatLogHoveredPlayer = memberNumber;
            this.roster.hoveredMapPlayer = memberNumber;
          }
        }
      }
    });

    document.addEventListener("mouseout", (mouseEvent) => {
      const target = mouseEvent.target as HTMLElement;
      const relatedTarget = mouseEvent.relatedTarget as HTMLElement | null;
      if (!target) return;

      // --- Restore Font on Leaving Message ---
      const messageElement = target.closest(
        ".ChatMessage",
      ) as HTMLElement | null;
      if (
        messageElement &&
        (!relatedTarget || !messageElement.contains(relatedTarget))
      ) {
        if (this.hoveredNormalizedMessage === messageElement) {
          this.toggleTextNormalization(messageElement, false);
          this.hoveredNormalizedMessage = null;
        }
      }

      // --- Clear Player Highlight ---
      if (Settings.instance?.data?.chatLogHover === false) return;
      if (target.closest(".ChatMessageName")) {
        this.chatLogHoveredPlayer = null;
        if (this.roster) {
          this.roster.chatLogHoveredPlayer = null;
          this.roster.hoveredMapPlayer = null;
        }
      }
    });
  }

  /**
   * Hooks into the base game's message display pipeline to process keyword matching,
   * name styling, inline colors, and external system notifications.
   *
   * @private
   * @returns {void}
   */
  private setupMessageHooks(): void {
    this.safeHook(
      "ChatRoomMessageDisplay",
      10,
      (hookArguments: any, nextFunction: Function) => {
        const messageData = hookArguments[0];
        const rawSender = hookArguments[2];
        const messageDiv = nextFunction(hookArguments);

        const globalWindow = window as any;
        let wasAtBottom = true;

        try {
          if (!messageDiv || !(messageDiv instanceof HTMLElement))
            return messageDiv;

          const player = globalWindow.Player;
          if (!player) return messageDiv;

          // Check scroll state right after the base game appended the message
          wasAtBottom =
            typeof globalWindow.ElementIsScrolledToEnd === "function"
              ? globalWindow.ElementIsScrolledToEnd("TextAreaChatLog")
              : true;

          const highlightMentionsEnabled =
            Settings.instance?.data?.highlightMentions !== false;
          const browserNotificationsEnabled =
            !!Settings.instance?.data?.browserNotifications;
          const colorMatchNamesEnabled =
            !!Settings.instance?.data?.colorMatchNames;

          // Only skip if all message processing features are disabled
          if (
            !highlightMentionsEnabled &&
            !browserNotificationsEnabled &&
            !colorMatchNamesEnabled
          ) {
            return messageDiv;
          }

          if (messageData && messageData.Type === "ServerMessage")
            return messageDiv;
          if (messageDiv.classList.contains("ChatMessageEnterLeave"))
            return messageDiv;

          // Determine sender member number
          const senderMemberNumber =
            typeof rawSender === "number"
              ? rawSender
              : (rawSender?.MemberNumber ??
                parseInt(messageDiv.dataset.sender || "", 10));

          if (senderMemberNumber === player.MemberNumber) return messageDiv;

          // --- COMPILE IGNORE PHRASES ---
          const rawIgnorePhrases = (
            Settings.instance?.data?.ignorePhrases || ""
          )
            .split("\n")
            .map((rawString: string) =>
              rawString ? String(rawString).trim() : "",
            )
            .filter((trimmedString: string) => trimmedString.length > 0);

          let ignoreRegex: RegExp | null = null;
          if (rawIgnorePhrases.length > 0) {
            rawIgnorePhrases.sort(
              (firstPhrase: string, secondPhrase: string) =>
                secondPhrase.length - firstPhrase.length,
            );

            const escapeRegExp = (textToEscape: string) =>
              textToEscape.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const ignorePatterns = rawIgnorePhrases.map((validPhrase: string) =>
              escapeRegExp(validPhrase).replace(/\\\*/g, ".*?"),
            );

            ignoreRegex = new RegExp(`(${ignorePatterns.join("|")})`, "gi");
          }

          // --- COMPILE MENTION REGEX ---
          const wordsToMatch = [
            player.Name,
            player.Nickname,
            ...(Settings.instance?.data?.customHighlightWords || "").split(","),
          ]
            .map((rawInput: any) => (rawInput ? String(rawInput).trim() : ""))
            .filter((validInput: string) => validInput.length > 0);

          if (wordsToMatch.length === 0) return messageDiv;

          wordsToMatch.sort(
            (firstName: string, secondName: string) =>
              secondName.length - firstName.length,
          );
          const escapedWords = wordsToMatch.map((nameToEscape: string) =>
            nameToEscape.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          );
          const mentionRegex = new RegExp(
            `(^|\\W)(${escapedWords.join("|")})(?=\\W|$)`,
            "gi",
          );

          const playerColor = player.LabelColor || "#FF00FF";
          const doInlineColor = colorMatchNamesEnabled;
          const doCapitalize = !!Settings.instance?.data?.capitalizeNames;
          let isMentioned = false;

          const processTextChunk = (textChunk: string): string => {
            mentionRegex.lastIndex = 0;
            if (mentionRegex.test(textChunk)) isMentioned = true;
            if (!doInlineColor && !doCapitalize) return textChunk;

            mentionRegex.lastIndex = 0;
            return textChunk.replace(
              mentionRegex,
              (
                _match: string,
                precedingBoundary: string,
                matchedName: string,
              ) => {
                let formattedName = matchedName;

                if (doCapitalize) {
                  formattedName = formattedName.replace(
                    /\b\w/g,
                    (firstLetter: string) => firstLetter.toUpperCase(),
                  );
                }

                if (doInlineColor) {
                  return `${precedingBoundary}<span style="color: ${playerColor} !important; font-weight: bold !important;">${formattedName}</span>`;
                }

                return `${precedingBoundary}${formattedName}`;
              },
            );
          };

          const searchAndHighlight = (domNode: Node) => {
            const childNodesArray = Array.from(domNode.childNodes);
            for (const childNode of childNodesArray) {
              if (childNode.nodeType === 3) {
                // TEXT_NODE
                const rawTextValue = childNode.nodeValue;
                if (!rawTextValue) continue;

                let newlyGeneratedHTML = "";
                let hasModifications = false;

                if (ignoreRegex) {
                  ignoreRegex.lastIndex = 0;
                  const textPartsArray = rawTextValue.split(ignoreRegex);

                  for (
                    let partIndex = 0;
                    partIndex < textPartsArray.length;
                    partIndex++
                  ) {
                    if (partIndex % 2 === 0) {
                      const processedText = processTextChunk(
                        textPartsArray[partIndex],
                      );
                      if (processedText !== textPartsArray[partIndex])
                        hasModifications = true;
                      newlyGeneratedHTML += processedText;
                    } else {
                      newlyGeneratedHTML += textPartsArray[partIndex];
                    }
                  }
                } else {
                  const processedText = processTextChunk(rawTextValue);
                  if (processedText !== rawTextValue) hasModifications = true;
                  newlyGeneratedHTML += processedText;
                }

                if (hasModifications) {
                  const replacementSpan = document.createElement("span");
                  replacementSpan.innerHTML = newlyGeneratedHTML;
                  childNode.parentNode?.replaceChild(
                    replacementSpan,
                    childNode,
                  );
                }
              } else if (childNode.nodeType === 1) {
                // ELEMENT_NODE
                const htmlElement = childNode as HTMLElement;

                if (
                  htmlElement.classList.contains("ChatMessageName") ||
                  htmlElement.classList.contains("chat-room-metadata") ||
                  htmlElement.classList.contains("chat-room-message-reply")
                ) {
                  continue;
                }
                searchAndHighlight(childNode);
              }
            }
          };

          searchAndHighlight(messageDiv);

          if (isMentioned) {
            // Trigger Desktop Notification when window loses focus OR tab is hidden
            const isBackgrounded = document.hidden || !document.hasFocus();

            if (browserNotificationsEnabled && isBackgrounded) {
              const BrowserNotify = (window as any).Notification;
              if (BrowserNotify && BrowserNotify.permission === "granted") {
                // Resolve sender name via ChatRoomCharacter list or data attributes
                const senderCharacter = Array.isArray(
                  globalWindow.ChatRoomCharacter,
                )
                  ? globalWindow.ChatRoomCharacter.find(
                      (c: any) => c.MemberNumber === senderMemberNumber,
                    )
                  : null;

                const senderIdentity =
                  senderCharacter?.Nickname ||
                  senderCharacter?.Name ||
                  rawSender?.Name ||
                  (senderMemberNumber
                    ? `Member #${senderMemberNumber}`
                    : this.t("notifications.unknown_sender"));

                new BrowserNotify(this.t("notifications.mention_title"), {
                  body: this.t("notifications.mention_body", {
                    sender: senderIdentity,
                  }),
                  tag: "crabs-mention", // Replaces older mention notifications instead of flooding the desktop
                });
              }
            }

            // In-Game Highlight Logic
            if (highlightMentionsEnabled) {
              messageDiv.classList.add("CRABS_mention_highlight");
              const userHexColor =
                Settings.instance?.data?.highlightColor || "#FFFF00";

              messageDiv.style.setProperty(
                "background-color",
                this.convertColor(userHexColor, 0.02),
                "important",
              );
              messageDiv.style.setProperty(
                "border-left",
                `4px solid ${this.convertColor(userHexColor, 0.8)}`,
                "important",
              );

              const isAtBottom =
                typeof globalWindow.ElementIsScrolledToEnd === "function"
                  ? globalWindow.ElementIsScrolledToEnd("TextAreaChatLog")
                  : true;

              if (
                isAtBottom &&
                typeof globalWindow.ElementScrollToEnd === "function"
              ) {
                setTimeout(() => {
                  globalWindow.ElementScrollToEnd("TextAreaChatLog");
                }, 0);
              }
            }
          }
        } catch (err) {
          console.error("[CRABS] Error in chat highlight hook", err);
        } finally {
          if (
            wasAtBottom &&
            typeof globalWindow.ElementScrollToEnd === "function"
          ) {
            setTimeout(() => {
              globalWindow.ElementScrollToEnd("TextAreaChatLog");
            }, 0);
          }
        }

        return messageDiv;
      },
    );
  }
}
