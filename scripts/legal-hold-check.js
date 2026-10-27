#!/usr/bin/env node
import { formatHoldReport, loadApprovals, reviewDirectory } from "../lib/legal-hold.js";

const args = process.argv.slice(2);
const dir = args.find((arg) => !arg.startsWith("--")) || "src/content/posts";
const approvalsArg = args.find((arg) => arg.startsWith("--approvals="));
const asJson = args.includes("--json");

let result;
try {
  const approvals = loadApprovals(approvalsArg ? approvalsArg.slice("--approvals=".length) : undefined);
  result = reviewDirectory(dir, { approvals });
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

if (asJson) console.log(JSON.stringify(result, null, 2));
else console.log(formatHoldReport(result));
process.exit(result.ok ? 0 : 1);
