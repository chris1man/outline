import type { locales } from "../utils/date";

type LanguageOption = {
  label: string;
  value: keyof typeof locales;
};

// Note: Updating the available languages? Make sure to also update the
// locales array in shared/utils/date.ts to enable translation for timestamps.
export const languageOptions: LanguageOption[] = [
  {
    label: "English (US)",
    value: "en_US",
  },
  {
    label: "Русский",
    value: "ru_RU",
  },
];

export const languages = languageOptions.map((i) => i.value);
