import path from 'path';
import fs from 'fs';
import { formatStackTrace } from "./stackTraceFormatter.js";
import { runParsedBlocks } from "./testContext.js";
import { install } from './reporters/default.js';
import { dispatch } from "./eventDispatcher.js";

Error.prepareStackTrace = formatStackTrace;

const exitCodes = {
  ok: 0,
  failures: 1,
  cannotAccessFile: 2,
  parseError: 3
};

const isSingleFileMode = () =>
  process.argv[2] && !process.argv[2].startsWith("-");

const getSingleFilePath = async () => {
  const filePathArg = process.argv[2];
  try {
    const fullPath = path.resolve(process.cwd(), filePathArg);
    await fs.promises.access(fullPath);
    return [fullPath];
  } catch {
    console.error(`File ${filePathArg} could not be accessed.`)
    process.exit(exitCodes.cannotAccessFile);
  }
};

const discoverTestFiles = async () => {
  const testDir = path.resolve(process.cwd(), 'test');
  const dir = await fs.promises.opendir(testDir);
  let testFilePaths = [];
  for await (const dirent of dir) {
    if (dirent.name.endsWith(".tests.js")) {
      const fullPath = path.resolve(dir.path, dirent.name);
      testFilePaths.push(fullPath);
    }
  }
  return testFilePaths;
};

const chooseTestFiles = () =>
  isSingleFileMode() ? getSingleFilePath() : discoverTestFiles();

const readRandomFlag = () => {
  if(process.argv.find(t => t === "--randomize")) {
    return true;
  }
};

const readTags = () => {
  const tagArgIndex = process.argv.findIndex(t => t === "--tags");
  if (tagArgIndex > -1) {
    return process
      .argv[tagArgIndex + 1]
      .split(',')
      .map(tag => tag.trim());
  }
};

export const run = async () => {
  install();
  try {
    const testFilePaths = await chooseTestFiles();
    await Promise.all(testFilePaths.map(async testFilePath => {
      await import(testFilePath);
    }));
    const failed = await runParsedBlocks({
      tags: readTags(),
      shouldRandomize: readRandomFlag()
    });
    dispatch("finishedTestRun");
    process.exit(failed ? exitCodes.failures : exitCodes.ok);
  } catch(e) {
    console.error(e);
    process.exit(exitCodes.parseError);
  }
};
