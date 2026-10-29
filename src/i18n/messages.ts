import { operatorSpanish } from "./operator-es";
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
import zuZA from "./zu-ZA/translation.json";

export const messagesByLocale: Record<string, Record<string, string>> = {
  "en-US": { ...source, ...enUS },
  "ach-UG": achUG,
  "en-GB": { ...source, ...enGB },
  "de-AT": deAT,
  "de-DE": deDE,
  "es-AR": { ...esAR, ...operatorSpanish },
  "es-ES": { ...esES, ...operatorSpanish },
  "it-IT": itIT,
  "tr-TR": trTR,
  "zu-ZA": zuZA,
};

export const supportedLocales = Object.keys(messagesByLocale);

export { source };
