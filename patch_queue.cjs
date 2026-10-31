const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// 1. Add queue variables and functions
const queueVars = `
const queue: (() => Promise<void>)[] = [];
let activeRequests = 0;
const MAX_CONCURRENT = 1;

const processQueue = () => {
  if (activeRequests < MAX_CONCURRENT && queue.length > 0) {
    activeRequests++;
    const task = queue.shift();
    task?.();
  }
};

const runInQueue = async <T>(fn: () => Promise<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    const task = async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (e) {
        reject(e);
      } finally {
        activeRequests--;
        processQueue();
      }
    };

    queue.push(task);
    processQueue();
  });
};
`;

content = content.replace('let globalRateLimitUntil = 0;', 'let globalRateLimitUntil = 0;' + queueVars);

// 2. Update generateContentWithFallback to use runInQueue
const oldCall = 'return await callWithRetry(async () => {';
const newCall = 'return await runInQueue(async () => await callWithRetry(async () => {';
const newCallEnd = '}, retries, delay));';

// Find the line inside generateContentWithFallback: 
// return await callWithRetry(async () => {
//      return await ai.models.generateContent(params);
//    }, retries, delay);

const regex = /return await callWithRetry\(async \(\) => \{\n\s+return await ai\.models\.generateContent\(params\);\n\s+\}, retries, delay\);/;
const replacement = `return await runInQueue(async () => await callWithRetry(async () => {
      return await ai.models.generateContent(params);
    }, retries, delay));`;

content = content.replace(regex, replacement);

fs.writeFileSync('server.ts', content);
