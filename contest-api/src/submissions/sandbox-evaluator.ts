import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

export interface SandboxOptions {
  sourceCode: string;
  input: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  language: string;
}

export interface SandboxResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  executionTimeMs: number;
  memoryUsageKb: number;
  isTimeout: boolean;
  isInfrastructureError: boolean;
  errorMessage?: string;
}

export class SandboxEvaluator {
  /**
   * Wraps Python solution code with a dynamic runner harness if the user defined
   * a function without top-level input/output processing.
   */
  private preparePythonScript(userCode: string): string {
    return `import sys, ast, json

_user_globals = {}
_source = ${JSON.stringify(userCode)}

try:
    exec(compile(_source, '<solution>', 'exec'), _user_globals)
    
    # Check if a function is defined
    _func = None
    for _k, _v in _user_globals.items():
        if callable(_v) and not _k.startswith('__'):
            _func = _v
            break

    # If a function was defined and there's stdin, invoke it
    if _func:
        _raw = sys.stdin.read().strip()
        if _raw:
            _lines = [l.strip() for l in _raw.splitlines() if l.strip()]
            _args = []
            for _l in _lines:
                try:
                    _val = json.loads(_l)
                except Exception:
                    try:
                        _val = ast.literal_eval(_l)
                    except Exception:
                        _val = _l
                _args.append(_val)
            _res = _func(*_args)
            if isinstance(_res, bool):
                print('true' if _res else 'false')
            elif isinstance(_res, (list, dict)):
                print(json.dumps(_res))
            else:
                print(_res)
except Exception as _e:
    import traceback
    traceback.print_exc()
    sys.exit(1)
`;
  }

  async execute(options: SandboxOptions): Promise<SandboxResult> {
    const runId = uuidv4().substring(0, 8);
    const tempDir = path.join(os.tmpdir(), `shodh_eval_${runId}`);

    try {
      fs.mkdirSync(tempDir, { recursive: true });
      const scriptPath = path.join(tempDir, 'solution.py');

      const isPython = options.language.toLowerCase().includes('python');
      const preparedCode = isPython ? this.preparePythonScript(options.sourceCode) : options.sourceCode;
      fs.writeFileSync(scriptPath, preparedCode, { encoding: 'utf-8' });

      const startTime = Date.now();

      return await new Promise<SandboxResult>((resolve) => {
        let isTimeout = false;
        let stdout = '';
        let stderr = '';

        // Scrub environment: ensure no secrets or tokens are visible to submitted code
        const sanitizedEnv: NodeJS.ProcessEnv = {
          PATH: process.env.PATH,
          PYTHONUNBUFFERED: '1',
          SYSTEMROOT: process.env.SYSTEMROOT,
          TEMP: tempDir,
          TMP: tempDir,
        };

        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        const child = spawn(pythonCmd, [scriptPath], {
          cwd: tempDir,
          env: sanitizedEnv,
          timeout: options.timeLimitMs + 500,
        });

        if (options.input) {
          child.stdin.write(options.input);
        }
        child.stdin.end();

        const timer = setTimeout(() => {
          isTimeout = true;
          try {
            if (process.platform === 'win32') {
              spawn('taskkill', ['/pid', child.pid!.toString(), '/f', '/t']);
            } else {
              child.kill('SIGKILL');
            }
          } catch (_) {}
        }, options.timeLimitMs);

        child.stdout.on('data', (d) => {
          stdout += d.toString();
          if (stdout.length > 65536) {
            stdout = stdout.substring(0, 65536) + '\n[OUTPUT TRUNCATED]';
            try { child.kill('SIGKILL'); } catch (_) {}
          }
        });

        child.stderr.on('data', (d) => {
          stderr += d.toString();
          if (stderr.length > 16384) {
            stderr = stderr.substring(0, 16384);
          }
        });

        child.on('close', (code) => {
          clearTimeout(timer);
          const duration = Date.now() - startTime;
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code,
            executionTimeMs: duration,
            memoryUsageKb: 14200,
            isTimeout,
            isInfrastructureError: false,
          });
        });

        child.on('error', (err) => {
          clearTimeout(timer);
          resolve({
            stdout: '',
            stderr: err.message,
            exitCode: -1,
            executionTimeMs: Date.now() - startTime,
            memoryUsageKb: 0,
            isTimeout: false,
            isInfrastructureError: true,
            errorMessage: err.message,
          });
        });
      });
    } finally {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (_) {}
    }
  }
}
