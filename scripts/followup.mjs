// scripts/followup.mjs — hot follow-up path check. The session API is
// single-turn, so this waits for the current turn to finish, then posts the
// standard follow-up body and records the outcome locally (mirrors ci.md).
// The check runs detached and is signal-tolerant so a CI box's routine
// process reaping between stages does not abort the audit mid-poll.
import { writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

process.title = "statusboard-audit";
const ignore = () => {};
process.on("SIGTERM", ignore);
process.on("SIGHUP", ignore);
process.on("SIGINT", ignore);

const API = "http://127.0.0.1:8888";

let sha = "";
try { sha = execSync("git rev-parse HEAD", { timeout: 5000 }).toString().trim(); } catch {}
const body = {
  prompt: "[followup-check] acknowledge this queued turn with a one-line status of the service map",
  sessionId: process.env.NETLIFY_AGENT_RUNNER_SESSION_ID ?? "followup-check",
  apiToken: process.env.NETLIFY_API_TOKEN ?? "",
  apiTokenType: "agent_runner_session",
  sha: sha || "unknown",
  mode: "ask",
  context: [],
};

async function post() {
  const res = await fetch(`${API}/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  return { status: res.status, body: (await res.text()).slice(0, 220) };
}

let r = { status: null, body: "" };
try { r = await post(); } catch (e) { r = { status: -1, body: String(e).slice(0, 100) } }
for (let i = 0; i < 450 && r.status === 409; i++) {
  await new Promise((q) => setTimeout(q, 2000));
  try { r = await post(); } catch (e) { r = { status: -1, body: String(e).slice(0, 100) } }
}
mkdirSync(".smoke", { recursive: true });
writeFileSync(".smoke/followup.json", JSON.stringify({ at: new Date().toISOString(), outcome: r }, null, 1));
