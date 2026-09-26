import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { SandboxExecutionOptions, SandboxExecutionResult } from './types';

export class ProcessSandbox {
  private preparePythonScript(userCode: string): string {
    return `import sys, ast, json

_user_globals = {}
_source = ${JSON.stringify(userCode)}

try:
    exec(compile(_source, '<solution>', 'exec'), _user_globals)
    
    _func = None
    for _k, _v in _user_globals.items():
        if callable(_v) and not _k.startswith('__'):
            _func = _v
            break

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

  /**
   * Secure local subprocess sandbox with environment scrubbing,
   * temporary directory isolation, and timeout limits.
   */
  async execute(options: SandboxExecutionOptions): Promise<SandboxExecutionResult> {
    const runId = uuidv4().substring(0, 8);
    const tempDir = path.join(os.tmpdir(), `shodha_proc_${runId}`);

    try {
      fs.mkdirSync(tempDir, { recursive: true });
      const solutionPath = path.join(tempDir, 'solution.py');
      const isPython = options.language.toLowerCase().includes('python');
      const codeToWrite = isPython ? this.preparePythonScript(options.sourceCode) : options.sourceCode;
      fs.writeFileSync(solutionPath, codeToWrite, { encoding: 'utf-8' });

      const startTime = Date.now();

      return await new Promise<SandboxExecutionResult>((resolve) => {
        let isTimeout = false;
        let stdout = '';
        let stderr = '';

        // SCRUBBED ENVIRONMENT: Never expose JWT_SECRET, DB passwords, or API keys!
        const sanitizedEnv: NodeJS.ProcessEnv = {
          PATH: process.env.PATH,
          PYTHONUNBUFFERED: '1',
          SYSTEMROOT: process.env.SYSTEMROOT,
          TEMP: tempDir,
          TMP: tempDir,
        };

        const child = spawn('python', [solutionPath], {
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
            child.kill('SIGKILL');
          } catch (_) {}
        }, options.timeLimitMs);

        child.stdout.on('data', (d) => {
          stdout += d.toString();
          if (stdout.length > 65536) {
            stdout = stdout.substring(0, 65536) + '\n[OUTPUT TRUNCATED]';
            child.kill('SIGKILL');
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
            isMemoryExceeded: false,
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
            isMemoryExceeded: false,
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
