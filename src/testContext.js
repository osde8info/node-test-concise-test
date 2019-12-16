import * as expectModule from "./expect.js";
import { focusedOnly } from "./focus.js";
import { taggedOnly } from "./tags.js";
import { randomizeBlocks } from "./randomize.js";
import { TestTimeoutError } from "./TestTimeoutError.js";
import { dispatch } from './eventDispatcher.js';
import {
  registerSharedExample,
  findSharedExample,
  buildSharedExampleTest
} from "./sharedExamples.js";

export const expect = expectModule.expect;

let currentDescribe;

const makeDescribe = (name, options) => ({
  ...options,
  name,
  befores: [],
  afters: [],
  children: []
});

currentDescribe = makeDescribe("root");

const parseDescribe = (name, body, options) => {
  const parentDescribe = currentDescribe;
  currentDescribe = makeDescribe(name, {
    skip: body === undefined,
    ...options
  });
  if (body) {
    body();
  }
  currentDescribe = {
    ...parentDescribe,
    children: [...parentDescribe.children, currentDescribe]
  };
};

const describeWithOpts = (
  name,
  eitherBodyOrUserOpts,
  eitherBodyOrExtensionOpts,
  extensionOpts = {}) => {
  if (eitherBodyOrUserOpts instanceof Function)
    parseDescribe(name, eitherBodyOrUserOpts, {
      ...eitherBodyOrExtensionOpts,
      ...extensionOpts
    });
  else
    parseDescribe(name, eitherBodyOrExtensionOpts, {
      ...eitherBodyOrUserOpts,
      ...extensionOpts
    });
};

const itWithOpts = (
  name,
  eitherBodyOrUserOpts,
  eitherBodyOrExtensionOpts,
  extensionOpts = {}) => {
  if (eitherBodyOrUserOpts instanceof Function)
    parseIt(name, eitherBodyOrUserOpts, {
      ...eitherBodyOrExtensionOpts,
      ...extensionOpts
    });
  else
    parseIt(name, eitherBodyOrExtensionOpts, {
      ...eitherBodyOrUserOpts,
      ...extensionOpts
    });
};

export const describe = (name, eitherBodyOrOpts, bodyIfOpts) =>
  describeWithOpts(name, eitherBodyOrOpts, bodyIfOpts, {});

const makeTest = (name, body, options) => ({
  name,
  body,
  ...options,
  errors: [],
  timeoutError: new TestTimeoutError(5000)
});

const parseIt = (name, body, options) => {
  currentDescribe = {
    ...currentDescribe,
    children: [
      ...currentDescribe.children,
      makeTest(name, body, options)]
  }
};

export const it = (name, eitherBodyOrOpts, bodyIfOpts) =>
  itWithOpts(name, eitherBodyOrOpts, bodyIfOpts);

const addExtension = (object, property, fn, options) =>
  Object.defineProperty(
    object,
    property,
    { value: (...args) => fn(...args, options) }
  );

addExtension(it, 'only', itWithOpts, { focus: true });
addExtension(describe, 'only', describeWithOpts, { focus: true });

addExtension(it, 'skip', itWithOpts, { skip: true });
addExtension(describe, 'skip', describeWithOpts, { skip: true });

export const beforeEach = body => {
  currentDescribe = {
    ...currentDescribe,
    befores: [...currentDescribe.befores, body]
  };
};

export const afterEach = body => {
  currentDescribe = {
    ...currentDescribe,
    afters: [...currentDescribe.afters, body]
  };
};

const isIt = testObject =>
  testObject.hasOwnProperty('body');

let describeStack = [];

const withoutLast = arr => arr.slice(0, -1);

const runDescribe = async describe => {
  if (describe.skip) {
    dispatch('skippingDescribe', describeStack, describe);
    return;
  }
  dispatch('beginningDescribe', describeStack, describe);
  describeStack = [...describeStack, describe];
  for (let i = 0; i < describe.children.length; ++i) {
    await runBlock(describe.children[i]);
  }
  describeStack = withoutLast(describeStack);
};

const timeoutPromise = () =>
  currentTest.timeoutError.createTimeoutPromise();

const runBodyAndWait = async (body) => {
  const result = body();
  if (result instanceof Promise) {
    await Promise.race([
      result,
      timeoutPromise()
    ]);
  }
};

const runIt = async test => {
  global.currentTest = test;
  test.describeStack = [ ...describeStack ];
  if (test.skip || !test.body) {
    dispatch('skippingTest', test);
    return;
  }
  const wrappedBody = buildSharedExampleTest(test);
  try {
    invokeBefores(test);
    await runBodyAndWait(wrappedBody);
    invokeAfters(test);
  } catch (e) {
    test.errors.push(e);
  }
  dispatch("finishedTest", test);
  global.currentTest = null;
};

const runItWithOpts = timeout => {
  currentTest = {
    ...currentTest,
    timeoutError: new TestTimeoutError(timeout)
  };
}

addExtension(it, 'timesOutAfter', runItWithOpts, {});

const behavesLike = (name, sharedContextFn) =>
  describeWithOpts(
    name,
    findSharedExample(name),
    { sharedContextFn });

addExtension(it, 'behavesLike', behavesLike, {});
addExtension(describe, 'shared', registerSharedExample);

const invokeAll = fnArray => fnArray.forEach(fn => fn());

const invokeBefores = () =>
  invokeAll(describeStack.flatMap(describe => describe.befores));

const invokeAfters = () =>
  invokeAll(describeStack.flatMap(describe => describe.afters));

const runBlock = block =>
  isIt(block) ? runIt(block) : runDescribe(block);

const anyFailed = block => {
  if (isIt(block)) {
    return block.errors.length > 0;
  } else {
    return block.children.some(anyFailed);
  }
};

export const runParsedBlocks = async ({ tags, shouldRandomize }) => {
  let filtered = focusedOnly(currentDescribe);
  filtered = taggedOnly(tags, filtered);
  filtered = randomizeBlocks(shouldRandomize, filtered);
  for (let i = 0; i < filtered.children.length; ++i) {
    await runBlock(filtered.children[i]);
  }
  return anyFailed(filtered);
};
