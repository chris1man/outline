import { darken, lighten, transparentize } from "polished";
import type { DefaultTheme, Colors } from "styled-components";
import breakpoints from "./breakpoints";

const defaultColors: Colors = {
  transparent: "transparent",
  almostBlack: "#2E2D31",
  lightBlack: "#3D393B",
  almostWhite: "#F4EEEE",
  veryDarkBlue: "#1E191A",
  slate: "#8A7F80",
  slateLight: "#EBD9D7",
  slateDark: "#665C5D",
  smoke: "#F7F1F0",
  smokeLight: "#FCF9F9",
  smokeDark: "#EEDDD9",
  white: "#FFFCFC",
  white05: "rgba(255, 255, 255, 0.05)",
  white10: "rgba(255, 255, 255, 0.1)",
  white50: "rgba(255, 255, 255, 0.5)",
  white75: "rgba(255, 255, 255, 0.75)",
  black: "#000",
  black05: "rgba(0, 0, 0, 0.05)",
  black10: "rgba(0, 0, 0, 0.1)",
  black50: "rgba(0, 0, 0, 0.50)",
  black75: "rgba(0, 0, 0, 0.75)",
  accent: "#CC2929",
  yellow: "#FF9A00",
  warmGrey: "#FCF8F8",
  danger: "#FB2C36",
  warning: "#FF9A00",
  success: "#00C950",
  info: "#787878",
  brand: {
    red: "#CC2929",
    pink: "#EA786D",
    purple: "#D64841",
    blue: "#CC2929",
    marine: "#D94366",
    dusk: "#C00009",
    green: "#00C950",
    yellow: "#FF9A00",
  },
};

/** The narrowest the content of a sidebar can be, excluding its padding. */
const sidebarMinWidth = 240;

const sidebarPadding = 16;

const spacing = {
  sidebarWidth: 260,
  sidebarRightWidth: 300,
  sidebarCollapsedWidth: 16,
  sidebarMinWidth,
  sidebarMaxWidth: 500,
  /** The narrowest a sidebar can be resized to, including its padding. */
  sidebarResizeMinWidth: sidebarMinWidth + sidebarPadding,
};

const buildBaseTheme = (input: Partial<Colors>) => {
  const colors = {
    ...defaultColors,
    ...input,
  };

  return {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, Inter, 'Segoe UI', Roboto, Oxygen, sans-serif",
    fontFamilyMono:
      "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace",
    fontFamilyEmoji:
      "Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Segoe UI, Twemoji Mozilla, Noto Color Emoji, Android Emoji",
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    accentText: colors.white,
    selected: colors.accent,
    textHighlight: "#FDEA9B",
    textHighlightForeground: colors.almostBlack,
    commentMarkBackground: transparentize(0.5, colors.brand.marine),
    commentedImageOutlineDark: colors.brand.marine,
    commentedImageOutlineLight: transparentize(0.7, colors.brand.marine),
    code: colors.lightBlack,
    codeComment: "#008000",
    codePunctuation: "#393a34",
    codeNumber: "#0550ae",
    codeProperty: "#ff0000",
    codeTag: "#800000",
    codeClassName: "#00578a",
    codeString: "#a31515",
    codeSelector: "#800000",
    codeAttrName: "#ff0000",
    codeAttrValue: colors.lightBlack,
    codeEntity: "#ff0000",
    codeKeyword: "#00009f",
    codeFunction: "#393A34",
    codeStatement: "#ff0000",
    codePlaceholder: "#3d8fd1",
    codeInserted: "#0550ae",
    codeImportant: "#e90e90",
    codeConstant: "#0550ae",
    codeParameter: colors.lightBlack,
    codeOperator: "#393a34",
    noticeInfoBackground: colors.brand.blue,
    noticeInfoText: colors.almostBlack,
    noticeTipBackground: "#f5be31",
    noticeTipText: colors.almostBlack,
    noticeWarningBackground: "#d73a49",
    noticeWarningText: colors.almostBlack,
    noticeSuccessBackground: colors.brand.green,
    noticeSuccessText: colors.almostBlack,
    tableSelectedBackground: transparentize(0.9, colors.accent),
    breakpoints,
    ...colors,
    ...spacing,
  };
};

export const buildLightTheme = (input: Partial<Colors>): DefaultTheme => {
  const colors = buildBaseTheme(input);

  return {
    ...colors,
    isDark: false,
    background: colors.white,
    backgroundSecondary: colors.warmGrey,
    backgroundTertiary: "#F2E9E8",
    backgroundQuaternary: darken(0.05, "#F2E9E8"),
    link: colors.accent,
    cursor: colors.almostBlack,
    text: colors.almostBlack,
    textSecondary: colors.slateDark,
    textTertiary: colors.slate,
    textDiffInserted: colors.almostBlack,
    textDiffInsertedBackground: "rgba(18, 138, 41, 0.16)",
    textDiffDeleted: colors.slateDark,
    textDiffDeletedBackground: "rgba(255, 180, 173, 0.25)",
    placeholder: "#AA9D9E",
    sidebarBackground: "#F7F0EF",
    sidebarHoverBackground: "#F0E4E2",
    sidebarActiveBackground: "#FFE4E1",
    sidebarControlHoverBackground: "rgb(204 41 41 / 10%)",
    sidebarDraftBorder: "#EDC2BC",
    sidebarText: "#665C5D",
    backdrop: "rgba(0, 0, 0, 0.2)",
    shadow: "rgba(0, 0, 0, 0.2)",

    modalBackdrop: "rgba(0, 0, 0, 0.25)",
    modalBackground: colors.white,
    modalShadow:
      "0 4px 8px rgb(0 0 0 / 8%), 0 2px 4px rgb(0 0 0 / 0%), 0 30px 40px rgb(0 0 0 / 8%)",

    menuItemSelected: colors.warmGrey,
    menuBackground: colors.white,
    menuShadow:
      "0 0 0 1px rgb(0 0 0 / 2%), 0 4px 8px rgb(0 0 0 / 8%), 0 2px 4px rgb(0 0 0 / 0%), 0 30px 40px rgb(0 0 0 / 8%)",
    divider: colors.slateLight,
    titleBarDivider: colors.slateLight,
    inputBorder: colors.slateLight,
    inputBorderFocused: colors.slate,
    inputBackground: colors.warmGrey,
    listItemHoverBackground: colors.warmGrey,
    mentionBackground: colors.warmGrey,
    mentionHoverBackground: "#F2E9E8",
    tableSelected: colors.accent,
    buttonNeutralBackground: colors.white,
    buttonNeutralHoverBackground: colors.warmGrey,
    buttonNeutralText: colors.almostBlack,
    buttonNeutralBorder: "#EBD9D7",
    tooltipBackground: colors.almostBlack,
    tooltipText: colors.white,
    toastBackground: colors.white,
    toastText: colors.almostBlack,
    quote: colors.slateLight,
    codeBackground: colors.smoke,
    codeBorder: colors.smokeDark,
    embedBorder: colors.slateLight,
    horizontalRule: colors.smokeDark,
    progressBarBackground: colors.slateLight,
    scrollbarBackground: colors.smoke,
    scrollbarThumb: darken(0.15, colors.smokeDark),
  };
};

export const buildDarkTheme = (input: Partial<Colors>): DefaultTheme => {
  const colors = buildBaseTheme(input);

  return {
    ...colors,
    isDark: true,
    background: colors.almostBlack,
    backgroundSecondary: "#2A2324",
    backgroundTertiary: "#382F30",
    backgroundQuaternary: lighten(0.1, "#382F30"),
    link: "#F19A94",
    text: colors.almostWhite,
    cursor: colors.almostWhite,
    textSecondary: lighten(0.1, colors.slate),
    textTertiary: colors.slate,
    textDiffInserted: colors.almostWhite,
    textDiffInsertedBackground: "rgba(63,185,80,0.25)",
    textDiffDeleted: darken(0.1, colors.almostWhite),
    textDiffDeletedBackground: "rgba(248,81,73,0.15)",
    placeholder: "#8A7F80",
    sidebarBackground: colors.veryDarkBlue,
    sidebarHoverBackground: lighten(0.05, colors.veryDarkBlue),
    sidebarActiveBackground: lighten(0.09, colors.veryDarkBlue),
    sidebarControlHoverBackground: colors.white10,
    sidebarDraftBorder: lighten(0.2, colors.veryDarkBlue),
    sidebarText: colors.slate,
    backdrop: "rgba(0, 0, 0, 0.5)",
    shadow: "rgba(0, 0, 0, 0.6)",

    modalBackdrop: colors.black50,
    modalBackground: "#251F20",
    modalShadow:
      "0 0 0 1px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.08)",

    menuItemSelected: lighten(0.09, "#251F20"),
    menuBackground: "#251F20",
    menuShadow:
      "0 0 0 1px rgb(34 40 52), 0 8px 16px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.08)",
    divider: lighten(0.1, colors.almostBlack),
    titleBarDivider: darken(0.4, colors.slate),
    inputBorder: colors.slateDark,
    inputBorderFocused: colors.slate,
    inputBackground: "#302829",
    listItemHoverBackground: colors.white10,
    mentionBackground: lighten(0.09, colors.veryDarkBlue),
    mentionHoverBackground: lighten(0.15, colors.veryDarkBlue),
    tableSelected: colors.accent,
    buttonNeutralBackground: colors.almostBlack,
    buttonNeutralHoverBackground: lighten(0.09, colors.veryDarkBlue),
    buttonNeutralText: colors.white,
    buttonNeutralBorder: colors.slateDark,
    tooltipBackground: colors.white,
    tooltipText: colors.lightBlack,
    toastBackground: colors.veryDarkBlue,
    toastText: colors.almostWhite,
    quote: colors.almostWhite,
    code: colors.almostWhite,
    codeBackground: "#1d202a",
    codeBorder: colors.white10,
    codeComment: "#6a9955",
    codePunctuation: "#b3b3b3",
    codeProperty: "#b5cea8",
    codeNumber: "#b5cea8",
    codeTag: "#b5cea8",
    codeOperator: "#d4d4d4",
    codeConstant: "#9cdcfe",
    codeParameter: "#9cdcfe",
    codeSelector: "#ce9178",
    codeEntity: "#d4d4d4",
    codeStatement: "#d16969",
    codeInserted: "#b5cea8",
    codeString: "#ce9178",
    codeKeyword: "#569Cd6",
    codeFunction: "#dcdcaa",
    codeClassName: "#4ec9b0",
    codeImportant: "#569Cd6",
    codeAttrName: "#9cdcfe",
    codeAttrValue: "#ce9178",
    embedBorder: colors.black50,
    horizontalRule: lighten(0.1, colors.almostBlack),
    noticeInfoText: colors.white,
    noticeTipText: colors.white,
    noticeWarningText: colors.white,
    noticeSuccessText: colors.white,
    progressBarBackground: colors.slate,
    scrollbarBackground: colors.black,
    scrollbarThumb: colors.lightBlack,
  };
};

export const buildPitchBlackTheme = (input: Partial<Colors>) => {
  const colors = buildDarkTheme(input);

  return {
    ...colors,
    background: colors.black,
    codeBackground: colors.almostBlack,
  };
};

export const light = buildLightTheme(defaultColors);

export default light as DefaultTheme;
