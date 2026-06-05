// Runs automatically before `npm run dev` (as the "predev" script). It kills any
// process still listening on port 3000 so a NEW dev server always binds to 3000
// — instead of falling back to 3001 and leaving a stale orphan that corrupts the
// shared .next build cache. This prevents the "two servers, broken build" bug.
import { execSync } from "node:child_process";

const PORT = 3000;

function run(cmd) {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString();
  } catch {
    return ""; // nothing matched / command failed → treat as empty
  }
}

const pids = new Set();

if (process.platform === "win32") {
  // netstat lists LISTENING sockets with the owning PID in the last column.
  const out = run(`netstat -ano | findstr :${PORT}`);
  for (const line of out.split(/\r?\n/)) {
    const m = line.trim().match(/LISTENING\s+(\d+)\s*$/);
    if (m) pids.add(m[1]);
  }
  for (const pid of pids) run(`taskkill /F /PID ${pid}`);
} else {
  // macOS / Linux
  const out = run(`lsof -ti tcp:${PORT}`);
  for (const pid of out.split(/\s+/).filter(Boolean)) {
    pids.add(pid);
    run(`kill -9 ${pid}`);
  }
}

if (pids.size > 0) {
  console.log(`[predev] freed port ${PORT} (stopped ${pids.size} stale process${pids.size > 1 ? "es" : ""})`);
}
