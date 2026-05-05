import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultUiMessages } from "@bitcredit/ui-library";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const tempOutputPath = resolve(repoRoot, "src/i18n/.source.extracted.json");
const tempMergedOutputPath = resolve(repoRoot, "src/i18n/.source.merged.json");
const finalOutputPath = resolve(repoRoot, "src/i18n/source.json");
const formatjsBin = resolve(repoRoot, process.platform === "win32" ? "node_modules/.bin/formatjs.cmd" : "node_modules/.bin/formatjs");

if (!existsSync(formatjsBin)) {
  throw new Error(`Could not find local formatjs binary at ${formatjsBin}`);
}

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

try {
  const extractedMessages = JSON.parse(readFileSync(tempOutputPath, "utf8"));
  const mergedMessages = Object.fromEntries(
    Object.entries({
      ...defaultUiMessages,
      ...extractedMessages,
    }).sort(([leftKey], [rightKey]) => {
      if (leftKey < rightKey) {
        return -1;
      }

      if (leftKey > rightKey) {
        return 1;
      }

      return 0;
    })
  );

  writeFileSync(tempMergedOutputPath, `${JSON.stringify(mergedMessages, null, 2)}\n`);
  renameSync(tempMergedOutputPath, finalOutputPath);
} finally {
  rmSync(tempOutputPath, { force: true });
  rmSync(tempMergedOutputPath, { force: true });
}
