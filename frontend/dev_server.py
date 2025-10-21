
import argparse
import http.server
import socketserver
import subprocess
import sys
import os
import signal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATIC_DIR = ROOT / 'frontend' / 'static_site'


def _load_env_file_into_environ(env_path: Path) -> None:
    # """Small .env loader: sets values into os.environ. Ignores comments and blank lines.
    # Handles simple KEY=VALUE and strips surrounding quotes from values.
    
    if not env_path.exists():
        return
    try:
        with env_path.open('r', encoding='utf8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' not in line:
                    continue
                key, val = line.split('=', 1)
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                # don't overwrite existing env vars set in the shell
                if key not in os.environ:
                    os.environ[key] = val
    except Exception:
        # best-effort loader; don't fail if something goes wrong
        pass

parser = argparse.ArgumentParser(description='Serve SPA and optionally start backend (uvicorn)')
parser.add_argument('--serve-port', type=int, default=5500, help='Port to serve static SPA')
# Start backend by default; provide --no-backend to disable starting it
parser.add_argument('--no-backend', action='store_true', help='Do not start backend (backend is started by default)')
parser.add_argument('--backend-port', type=int, default=8000, help='Port for backend uvicorn')
args = parser.parse_args()

if not STATIC_DIR.exists():
    print('Static SPA directory not found:', STATIC_DIR)
    sys.exit(1)

backend_proc = None

try:
    if not args.no_backend:
        print('Starting backend via uvicorn...')
        # Load .env from project root into os.environ so the backend inherits MONGO_URI etc.
        _load_env_file_into_environ(ROOT / '.env')
        # Run uvicorn referencing the package module (src.app:app) from project root so
        # relative imports inside the `src` package work correctly.
        backend_cmd = [sys.executable, '-m', 'uvicorn', 'src.app:app', '--host', '127.0.0.1', '--port', str(args.backend_port), '--reload']
        backend_proc = subprocess.Popen(backend_cmd, cwd=str(ROOT))
        print('Backend started with PID', backend_proc.pid)

    os.chdir(str(STATIC_DIR))
    handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(('127.0.0.1', args.serve_port), handler) as httpd:
        print(f"Serving SPA at http://127.0.0.1:{args.serve_port}")
        print(f"Backend (if enabled) at http://127.0.0.1:{args.backend_port}")
        print('Press Ctrl+C to stop')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
finally:
    if backend_proc:
        try:
            print('Stopping backend...')
            backend_proc.terminate()
            backend_proc.wait(timeout=5)
        except Exception:
            pass
    print('Exiting')
