// modules/notifications/types.d.ts

declare namespace Toasts {
  type Type = "info" | "success" | "warning" | "error" | (string & {});
  type CloseReason = "timeout" | "click" | "external" | (string & {});
  type IconColor = "black" | "white" | "accent" | "default";

  interface Options {
    message: string;
    title?: string;
    type?: Type;
    category?: string;
    duration?: number;
    progress?: boolean;
    stopProgressOnHover?: boolean;
    onClick?: (ev: MouseEvent, toast: ToastElement) => void;
    onShow?: (toast: ToastElement) => void;
    onClose?: (toast: ToastElement, reason: CloseReason) => void;
    icon?: string;
    iconColor?: IconColor;
    buttons?: ToastButton[];
    clampMessage?: boolean;
  }

  interface ToastButton {
    label: string;
    onClick: (
      this: HTMLButtonElement,
      ev: MouseEvent,
      toast: ToastElement,
    ) => void;
  }

  interface ToastElement extends HTMLDivElement {
    _dismiss?: (reason: CloseReason) => void;
    _timeoutTimerRemove?: () => void;
  }
}

declare class ToastManagerClass {
  static maxStack: number;
  queue: Required<Toasts.Options>[];
  active: number;

  info(msg: string, opts?: Omit<Toasts.Options, "message" | "type">): void;
  success(msg: string, opts?: Omit<Toasts.Options, "message" | "type">): void;
  warning(msg: string, opts?: Omit<Toasts.Options, "message" | "type">): void;
  error(msg: string, opts?: Omit<Toasts.Options, "message" | "type">): void;
  custom(
    msg: string,
    type: Toasts.Type,
    opts?: Omit<Toasts.Options, "message" | "type">,
  ): void;
  dismissAll(): void;
  dismissByType(type: Toasts.Type): void;
  dismissByCategory(category: string): void;
}

declare global {
  var ToastManager: ToastManagerClass;

  type NotificationParams = {
    message: string;
    title?: string;
    image?: string;
    duration?: number;
  };

  type ErrorNotificationParams = {
    message: string;
    duration?: number;
  };
}

export {};
