# concise-test

A new, concise JavaScript test framework with some power features like [shared examples](#shared-examples) and [tagging tests](#tags).

It's written with ES6 modules so you'll need a modern version of Node. Upgrading to the latest version is recommended, but you can [use older versions too](#use-node-versions-prior-to-13.12).

**This package is usable but under active development. Please consider [contributing](#contributing-to-concise-test).**

`concise-test` is the subject of [a book on test runners](https://leanpub.com/byo-test).

# Basic usage

```
npm install --save-dev concise-test
```

Add the following to the `scripts` section of your `package.json`:

``` javascript
{
  "scripts": {
    "test": "concise-test"
  }
}
```

To run tests:

```
npm test
```

Your test files must be in the `test` directory and end with the extension `.tests.js`.


An example of a basic test file:

``` javascript
import { describe, it, expect, beforeEach, afterEach } from "concise-test";

const add = (a, b) => a + b;

describe("add", () => {

  beforeEach(() => {
    // test set up
  });
  
  afterEach(() => {
    // test tear down
  });

  it("adds two numbers", () => {
    expect(add(1, 2)).toBe(3);
  });
});
```

You can also run a single test file by using the command:

```
npm test -- path/to/file.js
```

# Interesting features

## Shared examples

A shared example is a `describe` block that can be imported into another `describe` block using the `it.behavesLike` function. Importing it pulls in all the `beforeEach`, `afterEach` and test specifications into the current describe block. This is useful when you have a *type* of object that you want to test. For example, if you're testing React components you can create a shared example that performs setup and teardown of your React component.

To define a shared example, you use `describe.shared`. Each test within a shared example block can optionally take test parameters that the importer passes to it.

``` javascript
describe.shared("a list", () => {
  describe("adding entries", () => {
    it("returns true on success", ({ type, entry }) => {
      expect(type.add(entry)).toBe(true);
    });
  });
});
```

This can then be imported into a test set like this:

``` javascript
describe("my list component", () => {
  let repository, newTodo;
  
  beforeEach(() => {
    repository = ...; // set up repository
    newTodo = ...; // set up newTodo
  });

  it.behavesLike("a list", () => ({
    type: repository,
    entry: newTodo
  }));
  
  // ... other tests here ...
});
```

In the above example, you can see that `it.behavesLikes` takes a function that when run returns the `type` and `entry` parameters that the shared examples needs. The reason that this is a function is so you can use `beforeEach` blocks to perform any set up in the importing `describe` block, as is the case for `repository` and `newTodo`.

## Tags

Tags allow you to group certain test suites with string labels so that they can be run together as a group. This is useful when you have a set of objects that often change together. For example, React components are often backed by Redux reducers that change in tandem. By tagging both test suites, you can easily run them together.

To tag, insert a new second parameer into either the `describe` or `it` calls.

``` javascript
describe("Foo component", { tags: [ "foo" ] }), () => {
  ...
});
```

Then on the command line:

``` javascript
npm test -- --tags foo
```

The `--tags` option takes a comma-separated list of tags.

# Full API

| Function | What does it do? |
| -------- | ---------------- |
| `describe(name, body)` | Describes a test suite. `body` must be a function; that function can call `beforeEach`, `afterEach`, `it` plus nested calls to `describe`.|
| `it(name, body)` | Describes a test. Can exist standalone or within a test suite. If `body` returns a `Promise`, the test runner `await`s it. If `it` is defined within a shared example (see `describe.shared` below) then `body` can take paramaters the test runner will pass to it.|
| `describe(name, options, body)` | Describes a test suite with particular options. So far the only support options is `tags`, which is an array of strings. |
| `it(name, options, body)` | Describes a test with particular options. Support the `tags` option and also `timesOutAfter`. |
| `beforeEach(body)` | Instructs the runner to run `body` before each test in the test suite. Can be used to set up variables declared within the `describe` block. You can use multiple `beforeEach` blocks. They are run in the order they are defined, starting with the root-level `describe` block and then moving into each nested `describe` in turn.|
| `afterEach(body)` | Instructs the runner to run `body` after each test in the test suite. Use this if your test modifies any global state that should be reset before the next test is run. For multiple `afterEach` blocks, they are run in the same order as `beforeEach` blocks.|
| `expect(actual).matcher(expected)` | Defines an expectation. Each test can have multiple expectations. See the [Supported matchers](#supported-matchers) table below for a list of matchers.|
| `describe.only` and `it.only` | Focuses a test suite or a test. If a test or test suite is focused, then only those tests are run. You can use `.only` multiple times and all will be focused. `it.only` takes precedence over `describe.only`, so if you have a test in a suite marked as `it.only` then only that test will be run regardless of whether or not the containing test suite was marked as `describe.only`. |
| `describe.skip` and `it.skip` | Skips this test or test suite. |
| `it(name)` | A body-less test. The test is marked as skipped.|
| `describe.shared(name, body)` and `describe.shared(name, options, body)`| Defines a shared example that can be imported with `it.behavesLike`. |
| `it.behavesLike(name, parameterFn)` | Imports a shared eample into this test suite. `parameterFn` is run before each test within the shared example, and the result is passed as the value to each test `body.` See [Shared examples](#shared-examples).|
| `it.timesOutAfter(ms)` | Used in a test or in a `beforeEach` block to denote that an asynchronous test should be failed if the test does not finish within the given number of milliseconds.|

You will need to import each of the functions that you use, as shown in the [Basic usage](#basic-usage) example.

## Supported matchers

| Matcher |
| ------- |
| `toBeDefined()` |
| `toBe(expectedValue)` |
| `toThrow()` |
| `toThrow(expectedError)` |
| `toHaveLength(expectedLength)` |


# Why does `concise-test` exist? Aren't there enough test runners?

This test framework was originally built as an educational tool. The creation of it is outlined in the ebook [Build your own test framework](https://leanpub.com/byo-test). However, it is a fully usable and versatile testing framework and is ready for production use.

It sits apart from other JavaScript test frameworks in that it is purposefully *not* an "at scale" solution. We strive to write code that is short, elegant, maintainable JavaScript code.

It is also *opinionated*. We want to guide you to writing *better* tests. For example, `concise-test` does not support snapshot testing and does not promote the idea of complex visual diffs for matchers. We also avoid configuration options where possible. There's also no support for `beforeAll` and `afterAll`.

# Using Node versions prior to 13.12

Pass the `--experimental-modules` flag to the Node runtime.

# Contributing to `concise-test`

This package is maintained and developed by [Daniel Irvine](https://github.com/dirv), and is licensed under the MIT license. I welcome all contributions, be it issues, pull requests, or just general feedback. If you're interested in getting involved with development, take a look at [the issues list](https://github.com/dirv/concise-test/issues).
