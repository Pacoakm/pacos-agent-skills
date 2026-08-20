"""Static server for the camera picker, with one extra verb: PUT.

`python3 -m http.server` cannot write, so the picker could only keep poses in
the browser's localStorage — which is per-origin (file:// and localhost are two
different stores), invisible, and gone the moment anything clears site data.
The poses are the whole output of the tool, so they belong in a file.

This serves the tree read-only exactly like http.server, and accepts PUT to a
single filename, `camera-poses.json`, inside any `tools/` directory under the
root. Everything else is refused. Bound to localhost.

It also answers Range requests, which http.server does not. Without that the
draft player cannot seek: the browser asks for the bytes around t=574s, gets a
200 with the whole file instead of a 206, and `currentTime` never moves.

    python3 <project>/tools/serve.py [port] [root-above-the-project]
"""
from __future__ import annotations

import functools
import hashlib
import json
import os
import re
import signal
import subprocess
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

# the files a page may write back. Everything else is refused.
SAVE_NAME = "camera-poses.json"
WRITABLE = {"camera-poses.json", "review-notes.json", "draft-marks.json"}

# Checks the dashboard may run. A fixed list of argv vectors — nothing from the
# request reaches a shell, so a page can offer a "re-check" button without the
# server becoming a way to run anything.
RUNNABLE = {
    "poses":    ["check_poses.py", "--json"],
    "joins":    ["check_joins.py", "--json"],
    "progress": ["render_progress.py", "--json"],
    "progress-master": ["render_progress.py", "--json", "--master"],
    "review":   ["build_review.py"],
    "concat":   ["concat_draft.py"],
    "extract":  ["extract_3d.py"],
    "dashboard": ["build_dashboard.py"],
}

# Long jobs. A render takes minutes to hours, so it cannot be a request that
# waits: it is spawned detached, its output goes to out/jobs/<name>.log, and the
# page polls. Same fixed-argv rule as RUNNABLE — nothing from the request runs.
JOBS = {
    "draft":  ["render.py", "draft"],
    "master": ["render.py", "master"],
}


def etag_of(path):
    """Content hash, so a tab can tell whether the file moved under it."""
    try:
        return '"' + hashlib.sha1(path.read_bytes()).hexdigest()[:16] + '"'
    except OSError:
        return '"none"'

RANGE_RE = re.compile(r"bytes=(\d*)-(\d*)\s*$")


class Handler(SimpleHTTPRequestHandler):
    def _target(self):
        """The file this request may write, or None."""
        path = Path(self.translate_path(self.path)).resolve()
        root = Path(self.directory).resolve()
        if path.name not in WRITABLE or path.parent.name != "tools":
            return None
        if root not in path.parents:
            return None
        return path

    def do_PUT(self):
        target = self._target()
        if target is None:
            self.send_error(403, "only " + ", ".join(sorted(WRITABLE))
                            + " under a tools/ directory may be written")
            return
        # Two browser tabs each hold their own copy of the pose map and PUT the
        # whole thing, so without this the older tab silently wins. The client
        # sends back the hash it loaded; if the file has moved on since, refuse.
        want = self.headers.get("If-Match")
        have = etag_of(target)
        if want and want != have:
            body = json.dumps({"error": "stale", "etag": have}).encode()
            self.send_response(409)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        try:
            body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
            data = json.loads(body.decode("utf-8"))       # reject junk early
        except (ValueError, UnicodeDecodeError) as exc:
            self.send_error(400, f"not JSON: {exc}")
            return
        target.parent.mkdir(parents=True, exist_ok=True)
        tmp = target.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1),
                       encoding="utf-8")
        tmp.replace(target)                               # atomic, no half file
        self.send_response(204)
        self.send_header("Content-Length", "0")
        self.end_headers()

    # ---- long jobs ---------------------------------------------------------
    def _jobdir(self):
        d = Path(self.directory).resolve()
        for c in (d, *d.parents):
            if (c / "video-plan.json").exists():
                return c / "out" / "jobs"
        return None

    def _job_paths(self, name):
        base = self._jobdir()
        if base is None:
            # the server root is above the project; find it from the URL instead
            parts = [p for p in self.path.split("/") if p]
            for i in range(len(parts), 0, -1):
                c = Path(self.directory).joinpath(*parts[:i]).resolve()
                if (c / "video-plan.json").exists():
                    base = c / "out" / "jobs"
                    break
        if base is None:
            return None, None, None
        base.mkdir(parents=True, exist_ok=True)
        return base, base / f"{name}.log", base / f"{name}.pid"

    def job_start(self, name, project):
        argv = JOBS.get(name)
        if argv is None:
            return {"error": "unknown job " + name}
        base = project / "out" / "jobs"
        base.mkdir(parents=True, exist_ok=True)
        log, pidf = base / f"{name}.log", base / f"{name}.pid"
        if pidf.exists() and self._alive(pidf):
            return {"error": name + " is already running"}
        env = dict(os.environ)
        env["PYTHONPATH"] = os.pathsep.join(
            [str(Path.home() / ".claude/skills/smartquest-video-production/scripts"),
             env.get("PYTHONPATH", "")])
        env["SQ_PROJECT"] = str(project)
        fh = open(log, "w")
        p = subprocess.Popen([sys.executable,
                              str(project / "tools" / argv[0]), *argv[1:]],
                             cwd=str(project), env=env, stdout=fh,
                             stderr=subprocess.STDOUT, start_new_session=True)
        pidf.write_text(str(p.pid))
        return {"started": name, "pid": p.pid}

    @staticmethod
    def _alive(pidf):
        try:
            os.kill(int(pidf.read_text().strip()), 0)
            return True
        except (OSError, ValueError):
            return False

    def job_status(self, name, project):
        base = project / "out" / "jobs"
        log, pidf = base / f"{name}.log", base / f"{name}.pid"
        running = pidf.exists() and self._alive(pidf)
        text = log.read_text(encoding="utf-8", errors="replace") if log.exists() else ""
        return {"job": name, "running": running,
                "log": text[-8000:], "lines": text.count("\n")}

    def job_stop(self, name, project):
        base = project / "out" / "jobs"
        pidf = base / f"{name}.pid"
        if not (pidf.exists() and self._alive(pidf)):
            return {"error": name + " is not running"}
        try:
            os.killpg(os.getpgid(int(pidf.read_text().strip())), signal.SIGTERM)
        except OSError as e:
            return {"error": str(e)}
        return {"stopped": name}

    def _project_from_path(self):
        parts = [p for p in self.path.split("/") if p]
        for i in range(len(parts), -1, -1):
            c = Path(self.directory).joinpath(*parts[:i]).resolve()
            if (c / "video-plan.json").exists():
                return c
        return None

    def do_POST(self):
        """POST /run/<check>, /start/<job>, /stop/<job>."""
        raw = self.path.split("?")[0].rstrip("/")
        for verb in ("/start/", "/stop/", "/job/"):
            if verb in raw:
                head, name = raw.rsplit(verb, 1)
                project = Path(self.directory).joinpath(
                    *[p for p in head.split("/") if p]).resolve()
                if not (project / "video-plan.json").exists():
                    self.send_error(404, "no project at " + head)
                    return
                fn = {"/start/": self.job_start, "/stop/": self.job_stop,
                      "/job/": self.job_status}[verb]
                self._json(fn(name, project))
                return
        name = raw.rsplit("/", 1)[-1]
        argv = RUNNABLE.get(name)
        if "/run/" not in raw or argv is None:
            self.send_error(403, "not a runnable check: " + name)
            return
        project = self._project_from_path()
        tools = (project / "tools") if project else Path(__file__).resolve().parent
        env = dict(os.environ)
        skill = Path.home() / ".claude/skills/smartquest-video-production/scripts"
        env["PYTHONPATH"] = str(skill) + os.pathsep + env.get("PYTHONPATH", "")
        if project:
            env["SQ_PROJECT"] = str(project)
        try:
            r = subprocess.run([sys.executable, str(tools / argv[0]), *argv[1:]],
                               cwd=str(tools.parent), capture_output=True,
                               text=True, timeout=300, env=env)
            body = json.dumps({"ok": r.returncode == 0, "code": r.returncode,
                               "out": (r.stdout + r.stderr)[-20000:]}).encode()
        except subprocess.TimeoutExpired:
            body = json.dumps({"ok": False, "out": "timed out after 300s"}).encode()
        self._raw_json(body)

    def _json(self, obj):
        self._raw_json(json.dumps(obj, ensure_ascii=False).encode())

    def _raw_json(self, body):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        """SimpleHTTPRequestHandler ignores Range; video seeking needs it."""
        rng = self.headers.get("Range")
        path = self.translate_path(self.path)
        if not rng or not os.path.isfile(path):
            return super().do_GET()
        m = RANGE_RE.match(rng.strip())
        if not m:
            return super().do_GET()

        size = os.path.getsize(path)
        first, last = m.group(1), m.group(2)
        if first == "":                       # bytes=-500 — the tail
            start, end = max(0, size - int(last or 0)), size - 1
        else:
            start = int(first)
            end = int(last) if last else size - 1
        end = min(end, size - 1)
        if start > end or start >= size:
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return

        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        try:
            with open(path, "rb") as f:
                f.seek(start)
                remaining = end - start + 1
                while remaining > 0:
                    chunk = f.read(min(64 * 1024, remaining))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass                              # the player moved on; normal

    def end_headers(self):
        self.send_header("Accept-Ranges", "bytes")
        if any(self.path.split("?")[0].endswith(n) for n in WRITABLE):
            t = self._target()
            if t is not None:
                self.send_header("ETag", etag_of(t))
        # the page is regenerated by extract_3d.py, so never serve a stale one.
        # Media is exempt: no-store would re-download the draft on every seek.
        if not self.path.split("?")[0].endswith((".mp4", ".m4a", ".webm")):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        if self.command != "GET":
            super().log_message(fmt, *args)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8777
    root = sys.argv[2] if len(sys.argv) > 2 else "."
    handler = functools.partial(Handler, directory=str(Path(root).resolve()))
    # threading, not HTTPServer: a video range request holds its connection
    # open, and a single-threaded server then blocks every other request —
    # including the next seek, which stalls playback into a pause
    srv = ThreadingHTTPServer(("127.0.0.1", port), handler)
    print(f"serving {Path(root).resolve()} on http://127.0.0.1:{port}"
          f"  (PUT enabled for */tools/{SAVE_NAME})", flush=True)
    srv.serve_forever()


if __name__ == "__main__":
    main()
