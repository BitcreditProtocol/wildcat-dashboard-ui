import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultUiMessages } from "@bitcredit/ui-library";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const tempOutputPath = resolve(repoRoot, "src/i18n/.source.extracted.json");
const finalOutputPath = resolve(repoRoot, "src/i18n/source.json");
const formatjsBin = resolve(repoRoot, "node_modules/.bin/formatjs");

mkdirSync(dirname(tempOutputPath), { recursive: true });

const extractResult = spawnSync(
  formatjsBin,
  [
    "extract",
    "src/**/*.{ts,tsx}",
    "--ignore=**/*.d.ts",
    `--out-file=${tempOutputPath}`,
    "--id-interpolation-pattern",
    "[sha512:contenthash:base64:6]",
    "--format",
    "simple",
    "--additional-function-names",
    "f",
    "--preserve-whitespace",
  ],
  {
    cwd: repoRoot,
    stdio: "inherit",
  }
);

if (extractResult.status !== 0) {
  process.exit(extractResult.status ?? 1);
}

const extractedMessages = JSON.parse(readFileSync(tempOutputPath, "utf8"));
const mergedMessages = Object.fromEntries(
  Object.entries({
    ...defaultUiMessages,
    ...extractedMessages,
  }).sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
);

writeFileSync(finalOutputPath, `${JSON.stringify(mergedMessages, null, 2)}\n`);
unlinkSync(tempOutputPath);
