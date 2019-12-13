import { color } from "./colors.js";
import path from 'path';

export class ExpectationError extends Error {
  constructor(message, { actual, expected, source }) {
    super('Expected ' + color(message
      .replace('<actual>', `<red>${actual}</red>`)
      .replace('<expected>', `<green>${expected}</green>`)
      .replace('<source>', `<bold>${source}</bold>`)))
  }
}
