import ar from "./ar";
import en from "./en";
import fr from "./fr";

export const dictionaries: Record<string, Record<string, string>> = { ar, en, fr };

export const DEFAULT_LANGUAGE = "ar";

export function getDirection(lang: string): "rtl" | "ltr" {
  return lang === "ar" ? "rtl" : "ltr";
}
