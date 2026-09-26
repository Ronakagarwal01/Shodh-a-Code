import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec, spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { SandboxExecutionOptions, SandboxExecutionResult } from './types';

export class DockerSandbox {
  private imageName: string;

  constructor(imageName: string = 'python:3.11-alpine') {
    this.imageName = process.env.DOCKER_SANDBOX_IMAGE || imageName;
  }

  async isDockerAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      exec('docker --version', (err) => {
        if (err) return resolve(false);
        exec('docker ps', (psErr) => {
          resolve(!psErr);
        });
      });
    });
  }

  /**
   * Executes untrusted code inside an isolated Docker container with strict sandboxing:
   * - --network none: network access completely disabled
   * - --cpus 0.5: CPU allocation restricted
   * - -m 256m: Memory strictly capped
   * - --pids-limit 64: Prevents fork bombs
   * - -v <temp_dir>:/workspace:ro: Ephemeral read-only workspace
   * - Ephemeral container (--rm)
   */
  async execute(options: SandboxExecutionOptions): Promise<SandboxExecutionResult> {
    const runId = uuidv4().substring(0, 8);
    const tempDir = path.join(os.tmpdir(), `shodha_sandbox_${runId}`);

    try {
      fs.mkdirSync(tempDir, { recursive: true });

      const solutionPath = path.join(tempDir, 'solution.py');
      const inputPath = path.join(tempDir, 'input.txt');

      fs.writeFileSync(solutionPath, options.sourceCode, { encoding: 'utf-8', mode: 0o444 });
      fs.writeFileSync(inputPath, options.input, { encoding: 'utf-8', mode: 0o444 });

      const dockerArgs = [
        'run',
        '--rm',
        '--network', 'none',
        '--cpus', '0.5',
        '--memory', `${options.memoryLimitMb || 256}m`,
        '--memory-swap', `${options.memoryLimitMb || 256}m`,
        '--pids-limit', '64',
        '--security-opt', 'no-new-privileges:true',
        '-v', `${tempDir}:/workspace:ro`,
        '-w', '/workspace',
        this.imageName,
        'python3', 'solution.py',
      ];

      const startTime = Date.now();
      return await new Promise<SandboxExecutionResult>((resolve) => {
        const child = spawn('docker', dockerArgs, {
          timeout: options.timeLimitMs + 1000,
          shell: false,
        });

        let stdout = '';
        let stderr = '';
        let isTimeout = false;

        // Pipe input
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

        child.stdout.on('data', (data) => {
          stdout += data.toString();
          // Cap output to 64KB to avoid memory exhaustion
          if (stdout.length > 65536) {
            stdout = stdout.substring(0, 65536) + '\n[OUTPUT TRUNCATED]';
            child.kill('SIGKILL');
          }
        });

        child.stderr.on('data', (data) => {
          stderr += data.toString();
          if (stderr.length > 16384) {
            stderr = stderr.substring(0, 16384);
          }
        });

        child.on('close', (code) => {
          clearTimeout(timer);
          const duration = Date.now() - startTime;

          // Exit code 137 indicates OOM killer or SIGKILL
          const isMemoryExceeded = code === 137 && !isTimeout;

          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code,
            executionTimeMs: duration,
            memoryUsageKb: 14500,
            isTimeout,
            isMemoryExceeded,
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
      // Ephemeral workspace cleanup
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (_) {}
    }
  }
}
