import { color } from "./colors.js";
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export class ExpectationError extends Error {
  constructor(message, { actual, expected, source }) {
    super('Expected ' + color(message
      .replace('<actual>', `<bold>${actual}</bold>`)
      .replace('<expected>', `<bold>${expected}</bold>`)
      .replace('<source>', `<bold>${source}</bold>`)))
  }
}
