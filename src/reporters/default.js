import { listen, dispatch } from "../eventDispatcher.js";
import { color } from "../colors.js";

const indent = (stack, message) =>
  `${" ".repeat(stack.length * 2)}${message}`;

const fullTestDescription = ({ name, describeStack }) =>
  [ ...describeStack, { name } ]
      .map(({ name }) => `<bold>${name}</bold>`)
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
    console.error("\nFailures: \n");
  }
  failures.forEach(printFailure);
};

export const install = () => {
  let successes = 0;
  let failures = [];

  listen("beginningDescribe", (describeStack, { name }) => {
    console.log(indent(describeStack, name));
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
};