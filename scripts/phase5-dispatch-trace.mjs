#!/usr/bin/env node
// DEE-104 / Fix #3 of DEE-102 — Phase-5 dispatch filing-time dedupe guard.
//
// Before Phase-5 (Amelia) opens a tea-trace issue for a merged story, this
// helper queries Paperclip for any active trace issue keyed on the same
// (story.slug, merge_sha). If a live trace exists, creation is skipped and
// the existing issue link is printed; otherwise a new issue is filed.
//
// Zero-dep, Node-stable. Mirrors scripts/check-test-fixtures.mjs shape.
// See _bmad-output/sops/phase5-trace-dispatch.md for the dispatcher SOP.

import { readFileSync } from "node:fs";

const ACTIVE_STATUSES = new Set([
  "todo",
  "in_progress",
  "in_review",
  "done",
]);

const EXIT_OK = 0;
const EXIT_USAGE = 3;
const EXIT_API = 4;

function usage(message) {
  if (message) process.stderr.write(`error: ${message}\n\n`);
  process.stderr.write(`Usage:
  phase5-dispatch-trace.mjs \\
    --story-slug <slug> \\
    --merge-sha <sha> \\
    --parent-issue-id <uuid> \\
    --assignee-agent-id <uuid> \\
    --title <title> \\
    --description-file <path.md> \\
    [--goal-id <uuid>] \\
    [--priority high|medium|low|critical] \\
    [--api-url <url>]    (default \$PAPERCLIP_API_URL)
    [--company-id <uuid>] (default \$PAPERCLIP_COMPANY_ID)
    [--api-key <token>]   (default \$PAPERCLIP_API_KEY)
    [--run-id <uuid>]     (default \$PAPERCLIP_RUN_ID)
    [--dry-run]           search only, never POST

Outputs a single JSON dispatch-decision line to stdout (AC3).
Exit codes: 0 OK · 3 usage · 4 API error.
`);
  process.exit(message ? EXIT_USAGE : EXIT_OK);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const tok = argv[i];
    if (tok === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (tok === "-h" || tok === "--help") {
      usage();
    }
    if (!tok.startsWith("--")) usage(`unexpected positional: ${tok}`);
    const key = tok.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      usage(`missing value for ${tok}`);
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function required(args, key, envFallback) {
  const v = args[key] ?? (envFallback ? process.env[envFallback] : undefined);
  if (!v) usage(`missing --${key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}${envFallback ? ` (or env ${envFallback})` : ""}`);
  return v;
}

function emitDecision(payload) {
  process.stdout.write(JSON.stringify(payload) + "\n");
}

async function paperclipFetch(apiUrl, apiKey, runId, path, init = {}) {
  const url = `${apiUrl.replace(/\/+$/, "")}${path}`;
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    ...(runId ? { "X-Paperclip-Run-Id": runId } : {}),
    ...(init.headers || {}),
  };
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const err = new Error(`paperclip ${init.method || "GET"} ${path} -> ${res.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

function shortSha(sha) {
  const trimmed = String(sha || "").trim();
  if (!/^[0-9a-f]{7,}$/i.test(trimmed)) {
    usage(`--merge-sha must be a hex sha (>=7 chars), got: ${sha}`);
  }
  return trimmed.slice(0, 7).toLowerCase();
}

function storyLabelFromSlug(slug) {
  // "2-2-implement-..." -> "Story 2.2"
  const match = String(slug).match(/^(\d+)-(\d+)/);
  return match ? `Story ${match[1]}.${match[2]}` : null;
}

// Trace issue titles are filed with the canonical "Story X.Y tea-trace —"
// shape (see DEE-91 / DEE-100 / DEE-101). Meta-issues that merely discuss
// tea-trace work (e.g., DEE-103 dedupe key, DEE-104 dispatch SOP) do not
// follow this prefix and must NOT match.
const TRACE_TITLE_RE = /^\s*story\s+\d+\.\d+\s+tea-trace\b/i;

function looksLikeTraceIssue(issue, { mergeShaFull, mergeShaShort, slug, storyLabel }) {
  if (!issue) return false;
  if (!ACTIVE_STATUSES.has(issue.status)) return false;
  const title = String(issue.title || "");
  const titleLower = title.toLowerCase();
  const desc = String(issue.description || "").toLowerCase();
  if (!TRACE_TITLE_RE.test(title)) return false;
  const shaFull = String(mergeShaFull || "").toLowerCase();
  const shaShort = String(mergeShaShort || "").toLowerCase();
  const slugLower = String(slug).toLowerCase();
  const labelLower = storyLabel ? storyLabel.toLowerCase() : null;
  const mentionsSha =
    (shaFull && (titleLower.includes(shaFull) || desc.includes(shaFull))) ||
    (shaShort && (titleLower.includes(shaShort) || desc.includes(shaShort)));
  if (!mentionsSha) return false;
  const mentionsStory =
    titleLower.includes(slugLower) ||
    desc.includes(slugLower) ||
    (labelLower && (titleLower.includes(labelLower) || desc.includes(labelLower)));
  return Boolean(mentionsStory);
}

function pickCanonical(matches) {
  // Lowest issueNumber wins; ties (impossible) fall back to oldest createdAt.
  return [...matches].sort((a, b) => {
    const an = Number(a.issueNumber ?? Number.POSITIVE_INFINITY);
    const bn = Number(b.issueNumber ?? Number.POSITIVE_INFINITY);
    if (an !== bn) return an - bn;
    const at = new Date(a.createdAt || 0).getTime();
    const bt = new Date(b.createdAt || 0).getTime();
    return at - bt;
  })[0];
}

async function main() {
  const args = parseArgs(process.argv);
  const slug = required(args, "storySlug");
  const mergeShaFull = required(args, "mergeSha");
  const mergeShaShort = shortSha(mergeShaFull);
  const parentIssueId = required(args, "parentIssueId");
  const assigneeAgentId = required(args, "assigneeAgentId");
  const title = required(args, "title");
  const descriptionFile = required(args, "descriptionFile");
  const goalId = args.goalId || null;
  const priority = args.priority || "high";
  const apiUrl = required(args, "apiUrl", "PAPERCLIP_API_URL");
  const companyId = required(args, "companyId", "PAPERCLIP_COMPANY_ID");
  const apiKey = required(args, "apiKey", "PAPERCLIP_API_KEY");
  const runId = args.runId || process.env.PAPERCLIP_RUN_ID || null;
  const dryRun = Boolean(args.dryRun);
  const storyLabel = storyLabelFromSlug(slug);

  let description;
  try {
    description = readFileSync(descriptionFile, "utf8");
  } catch (err) {
    usage(`cannot read --description-file ${descriptionFile}: ${err.message}`);
  }

  // Step 1 — search by short merge sha. Falls back to the whole sha if the
  // short prefix happens to be empty (handled above) and gives Paperclip's
  // ranked search a single high-signal token.
  let candidates;
  try {
    candidates = await paperclipFetch(
      apiUrl,
      apiKey,
      runId,
      `/api/companies/${encodeURIComponent(companyId)}/issues?q=${encodeURIComponent(mergeShaShort)}`,
    );
  } catch (err) {
    process.stderr.write(`search failed: ${err.message}\n`);
    process.exit(EXIT_API);
  }

  if (!Array.isArray(candidates)) {
    process.stderr.write(`search returned non-array: ${JSON.stringify(candidates).slice(0, 200)}\n`);
    process.exit(EXIT_API);
  }

  const predicate = { mergeShaFull, mergeShaShort, slug, storyLabel };
  const matches = candidates.filter((c) => looksLikeTraceIssue(c, predicate));

  if (matches.length > 0) {
    const canonical = pickCanonical(matches);
    emitDecision({
      event: "phase5_dispatch_decision",
      decision: "skip_existing",
      reason: "live_trace_issue_for_story_and_merge",
      storySlug: slug,
      mergeSha: mergeShaFull,
      mergeShaShort,
      matched: {
        id: canonical.id,
        identifier: canonical.identifier,
        status: canonical.status,
        url: `/DEE/issues/${canonical.identifier}`,
      },
      otherCandidates: matches
        .filter((m) => m.id !== canonical.id)
        .map((m) => ({ id: m.id, identifier: m.identifier, status: m.status })),
      candidatesScanned: candidates.length,
      timestamp: new Date().toISOString(),
    });
    process.exit(EXIT_OK);
  }

  if (dryRun) {
    emitDecision({
      event: "phase5_dispatch_decision",
      decision: "would_create",
      reason: "no_live_trace_match__dry_run",
      storySlug: slug,
      mergeSha: mergeShaFull,
      mergeShaShort,
      candidatesScanned: candidates.length,
      timestamp: new Date().toISOString(),
    });
    process.exit(EXIT_OK);
  }

  // Step 2 — create the trace issue. CTO Fix #1 (DEE-103) is the runtime
  // dedupe-key safety net; this filing-time guard short-circuits before we
  // ever POST, so two parallel dispatchers cannot both create.
  const body = {
    title,
    description,
    parentId: parentIssueId,
    assigneeAgentId,
    status: "todo",
    priority,
  };
  if (goalId) body.goalId = goalId;

  let created;
  try {
    created = await paperclipFetch(
      apiUrl,
      apiKey,
      runId,
      `/api/companies/${encodeURIComponent(companyId)}/issues`,
      { method: "POST", body: JSON.stringify(body) },
    );
  } catch (err) {
    process.stderr.write(`create failed: ${err.message}\n`);
    process.exit(EXIT_API);
  }

  emitDecision({
    event: "phase5_dispatch_decision",
    decision: "created",
    reason: "no_live_trace_match",
    storySlug: slug,
    mergeSha: mergeShaFull,
    mergeShaShort,
    created: {
      id: created.id,
      identifier: created.identifier,
      status: created.status,
      url: created.identifier ? `/DEE/issues/${created.identifier}` : null,
    },
    candidatesScanned: candidates.length,
    timestamp: new Date().toISOString(),
  });
  process.exit(EXIT_OK);
}

main().catch((err) => {
  process.stderr.write(`unhandled: ${err.stack || err.message || err}\n`);
  process.exit(EXIT_API);
});
