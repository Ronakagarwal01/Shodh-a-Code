import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  UserEntity,
  UserRole,
  ContestEntity,
  ContestStatus,
  ProblemEntity,
  ProblemDifficulty,
  TestCaseEntity,
  SubmissionEntity,
  SubmissionVerdict,
  LeaderboardEntryEntity,
  ContestIncidentEntity,
} from '../entities';

export async function runSeed(dataSource: DataSource) {
  const userRepo = dataSource.getRepository(UserEntity);
  const contestRepo = dataSource.getRepository(ContestEntity);
  const problemRepo = dataSource.getRepository(ProblemEntity);
  const testCaseRepo = dataSource.getRepository(TestCaseEntity);
  const subRepo = dataSource.getRepository(SubmissionEntity);
  const lbRepo = dataSource.getRepository(LeaderboardEntryEntity);
  const incRepo = dataSource.getRepository(ContestIncidentEntity);

  console.log('[Seed] Seeding Shodh-a-Code database...');

  // 1. Users
  const salt = await bcrypt.genSalt(10);
  const hashedPass = await bcrypt.hash('Password123!', salt);

  const usersData = [
    {
      id: 'usr-learner-01',
      username: 'ronak',
      displayName: 'Ronak Agarwal',
      email: 'ronak@shodha.ai',
      passwordHash: hashedPass,
      organization: 'Shodh Academy',
      role: UserRole.LEARNER,
    },
    {
      id: 'usr-learner-02',
      username: 'priya_sharma',
      displayName: 'Priya Sharma',
      email: 'priya@shodha.ai',
      passwordHash: hashedPass,
      organization: 'Shodh Academy',
      role: UserRole.LEARNER,
    },
    {
      id: 'usr-learner-03',
      username: 'aarav_patel',
      displayName: 'Aarav Patel',
      email: 'aarav@shodha.ai',
      passwordHash: hashedPass,
      organization: 'Shodh Academy',
      role: UserRole.LEARNER,
    },
    {
      id: 'usr-instructor-01',
      username: 'prof_vikram',
      displayName: 'Prof. Vikram Sen',
      email: 'vikram@shodha.ai',
      passwordHash: hashedPass,
      organization: 'Shodh Academy',
      role: UserRole.INSTRUCTOR,
    },
    {
      id: 'usr-admin-01',
      username: 'admin_shodha',
      displayName: 'Platform Admin',
      email: 'admin@shodha.ai',
      passwordHash: hashedPass,
      organization: 'Shodh Academy',
      role: UserRole.ADMIN,
    },
  ];

  for (const u of usersData) {
    const existing = await userRepo.findOne({ where: { id: u.id } });
    if (!existing) {
      await userRepo.save(userRepo.create(u));
    }
  }

  // 2. Contests
  const contestsData = [
    {
      id: 'contest-spring-2026',
      slug: 'spring-2026',
      title: 'Spring 2026 Algorithmic Championship',
      description: 'Annual competitive programming contest covering arrays, binary search, graph theory, and dynamic programming.',
      startTime: '2026-03-24T14:00:00Z',
      endTime: '2026-03-24T17:00:00Z',
      status: ContestStatus.ACTIVE,
      organization: 'Shodh Academy',
      problemIds: ['prob-two-sum', 'prob-binary-search', 'prob-rotated-sorted-array', 'prob-course-schedule', 'prob-coin-change'],
    },
    {
      id: 'contest-warmup-2026',
      slug: 'warmup-2026',
      title: 'Winter Warmup Contest 2026',
      description: 'Practice contest for platform onboarding and system familiarization.',
      startTime: '2026-01-10T10:00:00Z',
      endTime: '2026-01-10T12:00:00Z',
      status: ContestStatus.ENDED,
      organization: 'Shodh Academy',
      problemIds: ['prob-two-sum', 'prob-binary-search'],
    },
  ];

  for (const c of contestsData) {
    const existing = await contestRepo.findOne({ where: { id: c.id } });
    if (!existing) {
      await contestRepo.save(contestRepo.create(c));
    }
  }

  // 3. Problems
  const problemsData = [
    {
      id: 'prob-two-sum',
      slug: 'two-sum-distinct',
      title: 'Two Sum Distinct',
      statement: 'Given an array of integers `nums` and an integer `target`, return indices of the two distinct numbers such that they add up to `target`. Each input will have exactly one solution, and you may not use the same element twice.\n\nImplement `twoSum(nums, target)` returning `[index1, index2]`.',
      difficulty: ProblemDifficulty.EASY,
      constraints: ['2 <= nums.length <= 10^5', '-10^9 <= nums[i] <= 10^9', '-10^9 <= target <= 10^9', 'Only one valid answer exists.'],
      examplesJson: JSON.stringify([
        { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'nums[0] + nums[1] == 9, so return [0, 1].' },
        { input: 'nums = [3,2,4], target = 6', output: '[1,2]', explanation: 'nums[1] + nums[2] == 6, so return [1, 2].' },
      ]),
      tags: ['Array', 'Hash Table', 'Two Pointers'],
      contestId: 'contest-spring-2026',
      conceptId: 'concept-arrays',
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      points: 100,
      starterCodeJson: JSON.stringify({
        python: 'def twoSum(nums: list[int], target: int) -> list[int]:\n    # Write your solution here\n    pass\n',
      }),
    },
    {
      id: 'prob-binary-search',
      slug: 'search-in-rotated-sorted-array',
      title: 'Search in Rotated Sorted Array',
      statement: 'There is an integer array `nums` sorted in ascending order (with distinct values) that is possibly rotated at an unknown pivot index `k`.\n\nGiven the array `nums` after the possible rotation and an integer `target`, return the index of `target` if it is in `nums`, or `-1` if it is not in `nums`.\n\nYou must write an algorithm with `O(log n)` runtime complexity.',
      difficulty: ProblemDifficulty.MEDIUM,
      constraints: ['1 <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4', 'All values of nums are unique.', '-10^4 <= target <= 10^4'],
      examplesJson: JSON.stringify([
        { input: 'nums = [4,5,6,7,0,1,2], target = 0', output: '4', explanation: 'Element 0 is at index 4.' },
        { input: 'nums = [4,5,6,7,0,1,2], target = 3', output: '-1', explanation: 'Element 3 is not found in nums.' },
      ]),
      tags: ['Binary Search', 'Divide and Conquer', 'Monotonicity'],
      contestId: 'contest-spring-2026',
      conceptId: 'concept-binary-search',
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      points: 200,
      starterCodeJson: JSON.stringify({
        python: 'def search(nums: list[int], target: int) -> int:\n    # O(log n) binary search\n    pass\n',
      }),
    },
    {
      id: 'prob-rotated-sorted-array',
      slug: 'find-minimum-in-rotated-sorted-array',
      title: 'Find Minimum in Rotated Sorted Array',
      statement: 'Suppose an array of length `n` sorted in ascending order is rotated between `1` and `n` times.\n\nGiven the sorted rotated array `nums` of unique elements, return the minimum element of this array.\n\nYou must write an algorithm that runs in `O(log n)` time.',
      difficulty: ProblemDifficulty.MEDIUM,
      constraints: ['1 <= nums.length <= 10^5', '-5000 <= nums[i] <= 5000', 'All the integers of nums are unique.'],
      examplesJson: JSON.stringify([
        { input: 'nums = [3,4,5,1,2]', output: '1', explanation: 'The original array was [1,2,3,4,5] rotated 3 times.' },
        { input: 'nums = [4,5,6,7,0,1,2]', output: '0', explanation: 'Minimum is 0.' },
      ]),
      tags: ['Binary Search', 'Arrays'],
      contestId: 'contest-spring-2026',
      conceptId: 'concept-binary-search',
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      points: 200,
      starterCodeJson: JSON.stringify({
        python: 'def findMin(nums: list[int]) -> int:\n    # Write your O(log n) solution here\n    pass\n',
      }),
    },
    {
      id: 'prob-course-schedule',
      slug: 'course-schedule-cycle-detection',
      title: 'Course Schedule & Dependency Ordering',
      statement: 'There are a total of `numCourses` courses you have to take, labeled from `0` to `numCourses - 1`. You are given an array `prerequisites` where `prerequisites[i] = [a, b]` indicates that you must take course `b` first if you want to take course `a`.\n\nReturn `true` if you can finish all courses. Otherwise, return `false`.',
      difficulty: ProblemDifficulty.MEDIUM,
      constraints: ['1 <= numCourses <= 2000', '0 <= prerequisites.length <= 5000', 'prerequisites[i].length == 2', 'All prerequisite pairs are unique.'],
      examplesJson: JSON.stringify([
        { input: 'numCourses = 2, prerequisites = [[1,0]]', output: 'true', explanation: 'Take course 0 then course 1.' },
        { input: 'numCourses = 2, prerequisites = [[1,0],[0,1]]', output: 'false', explanation: 'A cycle exists; impossible to finish.' },
      ]),
      tags: ['Depth-First Search', 'Breadth-First Search', 'Graph', 'Topological Sort'],
      contestId: 'contest-spring-2026',
      conceptId: 'concept-graphs',
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      points: 250,
      starterCodeJson: JSON.stringify({
        python: 'def canFinish(numCourses: int, prerequisites: list[list[int]]) -> bool:\n    # Graph cycle detection\n    pass\n',
      }),
    },
    {
      id: 'prob-coin-change',
      slug: 'fewest-coins-change',
      title: 'Fewest Coins Change',
      statement: 'You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.\n\nReturn the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return `-1`.\n\nYou may assume that you have an infinite number of each kind of coin.',
      difficulty: ProblemDifficulty.HARD,
      constraints: ['1 <= coins.length <= 12', '1 <= coins[i] <= 2^31 - 1', '0 <= amount <= 10^4'],
      examplesJson: JSON.stringify([
        { input: 'coins = [1,2,5], amount = 11', output: '3', explanation: '11 = 5 + 5 + 1' },
        { input: 'coins = [2], amount = 3', output: '-1', explanation: 'Cannot form amount 3.' },
      ]),
      tags: ['Dynamic Programming', 'Breadth-First Search'],
      contestId: 'contest-spring-2026',
      conceptId: 'concept-recursion-dp',
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      points: 300,
      starterCodeJson: JSON.stringify({
        python: 'def coinChange(coins: list[int], amount: int) -> int:\n    # DP optimization\n    pass\n',
      }),
    },
  ];

  for (const p of problemsData) {
    const existing = await problemRepo.findOne({ where: { id: p.id } });
    if (!existing) {
      await problemRepo.save(problemRepo.create(p));
    }
  }

  // 4. Test cases (sample + hidden)
  const testCasesData = [
    // Two sum
    { id: 'tc-ts-01', problemId: 'prob-two-sum', input: '[2,7,11,15]\n9', expectedOutput: '[0, 1]', isHidden: false, orderIndex: 1, explanation: 'Sample visible test case' },
    { id: 'tc-ts-02', problemId: 'prob-two-sum', input: '[3,2,4]\n6', expectedOutput: '[1, 2]', isHidden: false, orderIndex: 2, explanation: 'Sample visible test case' },
    { id: 'tc-ts-03', problemId: 'prob-two-sum', input: '[3,3]\n6', expectedOutput: '[0, 1]', isHidden: true, orderIndex: 3, explanation: 'Hidden evaluation test case' },
    { id: 'tc-ts-04', problemId: 'prob-two-sum', input: '[-1,-2,-3,-4,-5]\n-8', expectedOutput: '[2, 4]', isHidden: true, orderIndex: 4, explanation: 'Hidden negative numbers test' },

    // Binary search
    { id: 'tc-bs-01', problemId: 'prob-binary-search', input: '[4,5,6,7,0,1,2]\n0', expectedOutput: '4', isHidden: false, orderIndex: 1, explanation: 'Sample test' },
    { id: 'tc-bs-02', problemId: 'prob-binary-search', input: '[4,5,6,7,0,1,2]\n3', expectedOutput: '-1', isHidden: false, orderIndex: 2, explanation: 'Target not found' },
    { id: 'tc-bs-03', problemId: 'prob-binary-search', input: '[1]\n0', expectedOutput: '-1', isHidden: true, orderIndex: 3, explanation: 'Hidden single-element array' },
    { id: 'tc-bs-04', problemId: 'prob-binary-search', input: '[3,1]\n1', expectedOutput: '1', isHidden: true, orderIndex: 4, explanation: 'Hidden two-element rotated array boundary' },

    // Rotated sorted min
    { id: 'tc-rm-01', problemId: 'prob-rotated-sorted-array', input: '[3,4,5,1,2]', expectedOutput: '1', isHidden: false, orderIndex: 1, explanation: 'Sample test' },
    { id: 'tc-rm-02', problemId: 'prob-rotated-sorted-array', input: '[4,5,6,7,0,1,2]', expectedOutput: '0', isHidden: false, orderIndex: 2, explanation: 'Sample test' },
    { id: 'tc-rm-03', problemId: 'prob-rotated-sorted-array', input: '[2,1]', expectedOutput: '1', isHidden: true, orderIndex: 3, explanation: 'Hidden two-element array' },

    // Course schedule
    { id: 'tc-cs-01', problemId: 'prob-course-schedule', input: '2\n[[1,0]]', expectedOutput: 'true', isHidden: false, orderIndex: 1, explanation: 'Simple DAG' },
    { id: 'tc-cs-02', problemId: 'prob-course-schedule', input: '2\n[[1,0],[0,1]]', expectedOutput: 'false', isHidden: false, orderIndex: 2, explanation: 'Simple cycle' },
    { id: 'tc-cs-03', problemId: 'prob-course-schedule', input: '4\n[[1,0],[2,0],[3,1],[3,2]]', expectedOutput: 'true', isHidden: true, orderIndex: 3, explanation: 'Diamond DAG' },

    // Coin change
    { id: 'tc-cc-01', problemId: 'prob-coin-change', input: '[1,2,5]\n11', expectedOutput: '3', isHidden: false, orderIndex: 1, explanation: 'Sample' },
    { id: 'tc-cc-02', problemId: 'prob-coin-change', input: '[2]\n3', expectedOutput: '-1', isHidden: false, orderIndex: 2, explanation: 'Impossible' },
    { id: 'tc-cc-03', problemId: 'prob-coin-change', input: '[1]\n0', expectedOutput: '0', isHidden: true, orderIndex: 3, explanation: 'Base case amount=0' },
  ];

  for (const tc of testCasesData) {
    const existing = await testCaseRepo.findOne({ where: { id: tc.id } });
    if (!existing) {
      await testCaseRepo.save(testCaseRepo.create(tc));
    }
  }

  // 5. Submissions
  const submissionsData = [
    {
      id: 'sub-fail-001',
      userId: 'usr-learner-01',
      contestId: 'contest-spring-2026',
      problemId: 'prob-binary-search',
      sourceCode: 'def search(nums, target):\n    left, right = 0, len(nums) # BUG: should be len(nums) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if nums[mid] == target: return mid\n        elif nums[mid] < target: left = mid + 1\n        else: right = mid - 1\n    return -1',
      language: 'python',
      verdict: SubmissionVerdict.RUNTIME_ERROR,
      status: 'COMPLETED',
      executionTimeMs: 42,
      memoryUsageKb: 14200,
      score: 0,
      judgeVersion: 'v1.4.1',
      failureReason: 'IndexError: list index out of range on test case 4',
      testResultsJson: JSON.stringify([
        { testCaseId: 'tc-bs-01', orderIndex: 1, isHidden: false, passed: true, verdict: 'ACCEPTED', executionTimeMs: 25 },
        { testCaseId: 'tc-bs-02', orderIndex: 2, isHidden: false, passed: true, verdict: 'ACCEPTED', executionTimeMs: 28 },
        { testCaseId: 'tc-bs-03', orderIndex: 3, isHidden: true, passed: true, verdict: 'ACCEPTED', executionTimeMs: 31 },
        { testCaseId: 'tc-bs-04', orderIndex: 4, isHidden: true, passed: false, verdict: 'RUNTIME_ERROR', executionTimeMs: 42, errorMessage: 'IndexError: list index out of range' },
      ]),
    },
    {
      id: 'sub-fail-002',
      userId: 'usr-learner-02',
      contestId: 'contest-spring-2026',
      problemId: 'prob-rotated-sorted-array',
      sourceCode: 'def findMin(nums):\n    left, right = 0, len(nums) - 1\n    while left < right:\n        mid = (left + right) // 2\n        if nums[mid] > nums[right]:\n            left = mid # BUG: infinite loop when left == mid\n        else:\n            right = mid\n    return nums[left]',
      language: 'python',
      verdict: SubmissionVerdict.TIME_LIMIT_EXCEEDED,
      status: 'COMPLETED',
      executionTimeMs: 2005,
      memoryUsageKb: 15100,
      score: 0,
      judgeVersion: 'v1.4.1',
      failureReason: 'Time Limit Exceeded: CPU time exceeded 2.0s limit (Infinite loop on 2-element array)',
      testResultsJson: JSON.stringify([
        { testCaseId: 'tc-rm-01', orderIndex: 1, isHidden: false, passed: true, verdict: 'ACCEPTED', executionTimeMs: 25 },
        { testCaseId: 'tc-rm-02', orderIndex: 2, isHidden: false, passed: true, verdict: 'ACCEPTED', executionTimeMs: 28 },
        { testCaseId: 'tc-rm-03', orderIndex: 3, isHidden: true, passed: false, verdict: 'TIME_LIMIT_EXCEEDED', executionTimeMs: 2005 },
      ]),
    },
    {
      id: 'sub-infra-001',
      userId: 'usr-learner-01',
      contestId: 'contest-spring-2026',
      problemId: 'prob-course-schedule',
      sourceCode: 'def canFinish(numCourses, prerequisites):\n    from collections import deque, defaultdict\n    graph = defaultdict(list)\n    indegree = [0] * numCourses\n    for u, v in prerequisites:\n        graph[v].append(u)\n        indegree[u] += 1\n    q = deque([i for i in range(numCourses) if indegree[i] == 0])\n    visited = 0\n    while q:\n        node = q.popleft()\n        visited += 1\n        for nxt in graph[node]:\n            indegree[nxt] -= 1\n            if indegree[nxt] == 0: q.append(nxt)\n    return visited == numCourses',
      language: 'python',
      verdict: SubmissionVerdict.JUDGE_ERROR,
      status: 'FAILED',
      executionTimeMs: 0,
      memoryUsageKb: 0,
      score: 0,
      judgeVersion: 'v1.4.2',
      failureReason: 'Sandbox runtime exception: cgroup v2 memory accounting failure (exit code 137)',
      testResultsJson: '[]',
    },
    {
      id: 'sub-accept-001',
      userId: 'usr-learner-03',
      contestId: 'contest-spring-2026',
      problemId: 'prob-two-sum',
      sourceCode: 'def twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            return [seen[diff], i]\n        seen[num] = i\n    return []',
      language: 'python',
      verdict: SubmissionVerdict.ACCEPTED,
      status: 'COMPLETED',
      executionTimeMs: 35,
      memoryUsageKb: 14100,
      score: 100,
      judgeVersion: 'v1.4.1',
      failureReason: null,
      testResultsJson: JSON.stringify([
        { testCaseId: 'tc-ts-01', orderIndex: 1, isHidden: false, passed: true, verdict: 'ACCEPTED', executionTimeMs: 25 },
        { testCaseId: 'tc-ts-02', orderIndex: 2, isHidden: false, passed: true, verdict: 'ACCEPTED', executionTimeMs: 28 },
        { testCaseId: 'tc-ts-03', orderIndex: 3, isHidden: true, passed: true, verdict: 'ACCEPTED', executionTimeMs: 31 },
        { testCaseId: 'tc-ts-04', orderIndex: 4, isHidden: true, passed: true, verdict: 'ACCEPTED', executionTimeMs: 35 },
      ]),
    },
  ];

  for (const s of submissionsData) {
    const existing = await subRepo.findOne({ where: { id: s.id } });
    if (!existing) {
      await subRepo.save(subRepo.create(s));
    }
  }

  // 6. Leaderboard
  const lbData = [
    {
      id: 'contest-spring-2026_usr-learner-03',
      contestId: 'contest-spring-2026',
      userId: 'usr-learner-03',
      username: 'aarav_patel',
      displayName: 'Aarav Patel',
      totalScore: 100,
      solvedCount: 1,
      totalPenaltyMinutes: 25,
      problemScoresJson: JSON.stringify({
        'prob-two-sum': { problemId: 'prob-two-sum', solved: true, score: 100, attempts: 1, timeToSolveMinutes: 25 },
      }),
      lastSubmissionTime: '2026-03-24T14:10:00Z',
    },
    {
      id: 'contest-spring-2026_usr-learner-01',
      contestId: 'contest-spring-2026',
      userId: 'usr-learner-01',
      username: 'ronak',
      displayName: 'Ronak Agarwal',
      totalScore: 0,
      solvedCount: 0,
      totalPenaltyMinutes: 40,
      problemScoresJson: JSON.stringify({
        'prob-binary-search': { problemId: 'prob-binary-search', solved: false, score: 0, attempts: 1, timeToSolveMinutes: 0 },
        'prob-course-schedule': { problemId: 'prob-course-schedule', solved: false, score: 0, attempts: 1, timeToSolveMinutes: 0 },
      }),
      lastSubmissionTime: '2026-03-24T14:32:15Z',
    },
    {
      id: 'contest-spring-2026_usr-learner-02',
      contestId: 'contest-spring-2026',
      userId: 'usr-learner-02',
      username: 'priya_sharma',
      displayName: 'Priya Sharma',
      totalScore: 0,
      solvedCount: 0,
      totalPenaltyMinutes: 20,
      problemScoresJson: JSON.stringify({
        'prob-rotated-sorted-array': { problemId: 'prob-rotated-sorted-array', solved: false, score: 0, attempts: 1, timeToSolveMinutes: 0 },
      }),
      lastSubmissionTime: '2026-03-24T14:20:00Z',
    },
  ];

  for (const lb of lbData) {
    const existing = await lbRepo.findOne({ where: { id: lb.id } });
    if (!existing) {
      await lbRepo.save(lbRepo.create(lb));
    }
  }

  // 7. Incidents
  const incidentData = {
    id: 'incident-2026-03-24-01',
    contestId: 'contest-spring-2026',
    title: 'Judge Worker v1.4.2 cgroup v2 Accounting Regression',
    startTime: '2026-03-24T14:30:00Z',
    endTime: '2026-03-24T14:35:00Z',
    status: 'RESOLVED',
    severity: 'CRITICAL',
    summary: 'Deployment of Judge Worker v1.4.2 at 14:30 introduced an unhandled cgroup memory parsing exception on Linux kernel 6.x, causing false JUDGE_ERROR and exit 137 container crashes on valid submissions.',
    rootCause: 'Kernel cgroup v2 memory.current parser raised unhandled ValueError when parsing swap statistics in container runtime.',
    timelineJson: JSON.stringify([
      { timestamp: '2026-03-24T14:25:00Z', event: 'Judge v1.4.1 Active', details: 'Nominal judge performance. 0.2% error rate.', type: 'DEPLOYMENT' },
      { timestamp: '2026-03-24T14:30:00Z', event: 'Deployment of Judge v1.4.2', details: 'Judge worker service updated with new memory quota driver.', type: 'DEPLOYMENT' },
      { timestamp: '2026-03-24T14:32:00Z', event: 'Error Spike Detected', details: '14 submissions received JUDGE_ERROR within 2 minutes.', type: 'INCIDENT' },
      { timestamp: '2026-03-24T14:35:00Z', event: 'Rollback to Judge v1.4.1', details: 'Worker pool reverted to v1.4.1. Affected submissions automatically re-queued.', type: 'ROLLBACK' },
    ]),
    affectedSubmissions: ['sub-infra-001', 'sub-infra-002', 'sub-infra-003'],
  };

  const existingInc = await incRepo.findOne({ where: { id: incidentData.id } });
  if (!existingInc) {
    await incRepo.save(incRepo.create(incidentData));
  }

  console.log('[Seed] Database seeded successfully with 5 users, 2 contests, 5 problems, test cases, submissions, leaderboard, and incident!');
}
