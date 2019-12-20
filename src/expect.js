import { ExpectationError } from "./ExpectationError.js";
import * as matchers from './matchers.js';

const spacedNameRegex = new RegExp(/([A-Z])/g);

const spacedName = camelCase =>
  camelCase.replace(spacedNameRegex, ' $&').toLowerCase();

const not = (name, actual, ...args) => {
  try {
    matchers[name](actual, ...args);
    currentTest.errors.push(new ExpectationError(
      "<bold>not</bold> <source> <actual>", { actual, source: spacedName(name) }));
  } catch (e) {
    if (!e instanceof ExpectationError)
      throw e;
  }
};

const notMatcherHandler = actual => ({
  get: (_, name) => (...args) => not(name, actual, ...args)
});

const matcherHandler = actual => ({
  get: (_, name) => {
    if (name === "not") {
      return new Proxy({}, notMatcherHandler(actual));
    }
    return (...args) => {
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
  }
});

export const expect = actual =>
  new Proxy({}, matcherHandler(actual));
