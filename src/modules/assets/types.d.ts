type PrintImage = {
  key: string;
  css_class_override?: string;
  css_style?: string;
  tooltip_override?: string | false;
  alt_override?: string;
  data?: [string, string];
};

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
