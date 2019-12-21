import { listen, dispatch } from "../eventDispatcher.js";
import { color } from "../colors.js";

const indent = (stack, message) =>
  `${" ".repeat(stack.length * 2)}${message}`;

const parseName = name => {
  if (name instanceof Function) {
    return name.name;
  } else {
    return name;
  }
}

const fullTestDescription = ({ name, describeStack }) =>
  [ ...describeStack, { name } ]
      .map(({ name }) => `<bold>${parseName(name)}</bold>`)
    .join(' → ');

const printFailure = failure => {
  console.error(color(fullTestDescription(failure)));
  failure.errors.forEach(error => {
    console.error(error.message);
    console.error(error.stack);
  });
  console.error("");
};

const printFailures = failures => {
  if (failures.length > 0) {
    console.error("");
    console.error("Failures:");
    console.error("");
  }
  failures.forEach(printFailure);
};

export const install = () => {
  let successes = 0;
  let failures = [];

  listen("beginningDescribe", (describeStack, { name, sharedContextFn }) => {
    if (sharedContextFn) {
      console.log(indent(describeStack, color(`${parseName(name)} (<cyan>shared</cyan>)`)));
    } else {
      console.log(indent(describeStack, parseName(name)));
    }
  });

  listen("finishedTest", test => {
    if (test.errors.length > 0) {
      console.log(indent(
        test.describeStack,
        color(`<red>✗</red> ${test.name}`)));
      failures.push(test);
    } else {
      successes++;
      console.log(indent(
        test.describeStack,
        color(`<green>✓</green> ${test.name}`)));
    }
  });

  listen("finishedTestRun", () => {
    printFailures(failures);
    console.log(color(
      `<green>${successes}</green> tests passed, ` +
      `<red>${failures.length}</red> tests failed.`));
  });

  listen("skippingDescribe", (describeStack, { name }) => {
    console.log(indent(describeStack, color(`<strike>${parseName(name)}</strike>`)));
  });

  listen("skippingTest", ({ describeStack, name }) => {
    console.log(indent(describeStack, color(`<yellow>?</yellow> <strike>${name}</strike>`)));
  });
};
