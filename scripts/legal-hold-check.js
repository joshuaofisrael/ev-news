#!/usr/bin/env node
import { formatHoldReport, loadApprovals, loadModerateClearances, reviewDirectory } from "../lib/legal-hold.js";

const args = process.argv.slice(2);
const dir = args.find((arg) => !arg.startsWith("--")) || "src/content/posts";
const approvalsArg = args.find((arg) => arg.startsWith("--approvals="));
const clearancesArg = args.find((arg) => arg.startsWith("--clearances="));
const asJson = args.includes("--json");

let result;
try {
  const approvals = loadApprovals(approvalsArg ? approvalsArg.slice("--approvals=".length) : undefined);
  const clearances = loadModerateClearances(
    clearancesArg ? clearancesArg.slice("--clearances=".length) : undefined,
  );
  result = reviewDirectory(dir, { approvals, clearances });
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

if (asJson) console.log(JSON.stringify(result, null, 2));
else console.log(formatHoldReport(result));
process.exit(result.ok ? 0 : 1);
