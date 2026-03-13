import source from "./source.json";
import enUS from "./en-US/translation.json";
import achUG from "./ach-UG/translation.json";
import enGB from "./en-GB/translation.json";
import deAT from "./de-AT/translation.json";
import deDE from "./de-DE/translation.json";
import esAR from "./es-AR/translation.json";
import esES from "./es-ES/translation.json";
import itIT from "./it-IT/translation.json";
import trTR from "./tr-TR/translation.json";

export const messagesByLocale: Record<string, Record<string, string>> = {
  "en-US": enUS,
  "ach-UG": achUG,
  "en-GB": enGB,
  "de-AT": deAT,
  "de-DE": deDE,
  "es-AR": esAR,
  "es-ES": esES,
  "it-IT": itIT,
  "tr-TR": trTR,
};

export const supportedLocales = Object.keys(messagesByLocale);

export { source };
