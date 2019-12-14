import { listen, dispatch } from '../eventDispatcher.js';

const indent = (stack, message) =>
  `${' '.repeat(stack.length * 2)}${message}`;

export const install = () => {
  listen('beginningDescribe', (describeStack, { name }) => {
    console.log(indent(describeStack, name));
  });
};
