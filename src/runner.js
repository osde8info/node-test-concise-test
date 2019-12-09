import fs from 'fs';
import path from 'path';
import { color } from './colors.js';
import * as matchers from './matchers.js';
import { ExpectationError } from "./ExpectationError.js";

let successes = 0;
let currentTest;
let failures = [];
let describeStack = [];

const exitCodes = {
  ok: 0,
  failures: 1
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

export const run = async () => {
  try {
    const testFilePaths = await discoverTestFiles();
    await Promise.all(testFilePaths.map(async testFilePath => {
      await import(testFilePath);
    }));
  } catch(e) {
    console.error(e);
  }
  printFailures();
  console.log(color(
    `<green>${successes}</green> tests passed, ` +
    `<red>${failures.length}</red> tests failed.`));
  process.exit(failures.length > 0 ? exitCodes.failures : exitCodes.ok);
};

const indent = message =>
  `${' '.repeat(describeStack.length * 2)}${message}`;

const invokeAll = fnArray => fnArray.forEach(fn => fn());

const invokeBefores = () =>
  invokeAll(describeStack.flatMap(describe => describe.befores))

const invokeAfters = () =>
  invokeAll(describeStack.flatMap(describe => describe.afters))

const makeTest = name =>
  ({ testName: name, errors: [], describeStack });

export const it = (name, body) => {
  currentTest = makeTest();
  try {
    invokeBefores();
    body();
    invokeAfters();
  } catch (e) {
    currentTest.errors.push(e);
  }
  if (currentTest.errors.length > 0) {
    console.log(indent(color(`<red>✗</red> ${name}`)));
    failures.push(currentTest);
  } else {
    successes++;
    console.log(indent(color(`<green>✓</green> ${name}`)));
  }
};

const fullTestDescription = ({ testName, describeStack }) =>
  [ ...describeStack, { name: testName } ]
      .map(({ name }) => `<bold>${name}</bold>`)
    .join(' → ');

const printFailure = failure => {
  console.error(color(fullTestDescription(failure)));
  failure.errors.forEach(error => console.error(error));
  console.error("");
}

const printFailures = () => {
  if (failures.length > 0) {
    console.error("\nFailures: \n");
  }
  failures.forEach(printFailure);
};

const withoutLast = arr => arr.slice(0, -1);

const makeDescribe = name => ({ name, befores: [], afters: [] });

export const describe = (name, body) => {
  console.log(indent(name));
  describeStack = [...describeStack, makeDescribe(name)];
  body();
  describeStack = withoutLast(describeStack);
}

const last = arr => arr[arr.length - 1];

const currentDescribe = () =>
  last(describeStack);

const updateDescribe = newProps => {
  const newDescribe = {
    ...currentDescribe(),
    ...newProps
  };
  describeStack = [
    ...withoutLast(describeStack),
    newDescribe
  ];
}
export const beforeEach = body =>
  updateDescribe({ befores: [...currentDescribe().befores, body] });

export const afterEach = body =>
  updateDescribe({ afters: [...currentDescribe().afters, body] });

const matcherHandler = actual => ({
  get: (_, name) => (...args) => {
    try {
      matchers[name](actual, ...args);
    } catch(e) {
      if (e instanceof ExpectationError) {
        currentTest.errors.push(e);
      } else {
        throw e;
      }
    }
  }
});

export const expect = actual =>
  new Proxy({}, matcherHandler(actual));
