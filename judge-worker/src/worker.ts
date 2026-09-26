import { Worker, Job } from 'bullmq';
import axios from 'axios';
import { JudgeEngine } from './judge-engine';
import { JudgeJobData } from './types';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const contestApiUrl = process.env.CONTEST_API_URL || 'http://localhost:4000';

const judgeEngine = new JudgeEngine();

console.log(`[JudgeWorker] Initializing worker connecting to Redis at ${redisHost}:${redisPort}...`);

const worker = new Worker<JudgeJobData>(
  'judge-submissions',
  async (job: Job<JudgeJobData>) => {
    console.log(`[JudgeWorker] Received job ${job.id} for submission ${job.data.submissionId}`);

    const result = await judgeEngine.evaluate(job.data);

    // Persist result back to Contest API
    try {
      await axios.post(`${contestApiUrl}/judge/result`, result);
      console.log(`[JudgeWorker] Successfully reported verdict ${result.verdict} for submission ${result.submissionId}`);
    } catch (err: any) {
      console.error(`[JudgeWorker] Failed to post result to contest API: ${err.message}`);
      throw err; // Trigger retry
    }

    return result;
  },
  {
    connection: { host: redisHost, port: redisPort },
    concurrency: 2,
  },
);

worker.on('ready', () => {
  console.log('[JudgeWorker] Worker connected and listening for jobs on queue "judge-submissions"');
});

worker.on('failed', (job, err) => {
  console.error(`[JudgeWorker] Job ${job?.id} failed: ${err.message} (attempts made: ${job?.attemptsMade})`);
});
