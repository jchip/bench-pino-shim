"use strict";

const _ = require("lodash");
const AbsLog = require("abstract-logging");
const Benchmark = require("benchmark");
const Pino = require("pino");

const SAVE_CHILD = Symbol("save-child");

function shim(logger, createShim) {
  logger[SAVE_CHILD] = logger.child;
  logger.child = (...args) => {
    const childLogger = logger[SAVE_CHILD](...args);

    const instance = createShim();

    // https://www.npmjs.com/package/abstract-logging#interface
    instance.fatal = (...args) => childLogger.fatal(...args);
    instance.error = (...args) => childLogger.error(...args);
    instance.warn = (...args) => childLogger.warn(...args);
    instance.info = (...args) => childLogger.info(...args);
    instance.debug = (...args) => childLogger.debug(...args);
    instance.trace = (...args) => childLogger.trace(...args);
    instance.child = (...args) => childLogger.child(...args);

    return instance;
  };

  return logger;
}

function shimWithLoop(logger, createShim) {
  const methods = Object.keys(AbsLog.__proto__);
  logger[SAVE_CHILD] = logger.child;
  logger.child = (...args) => {
    const childLogger = logger[SAVE_CHILD](...args);

    const instance = createShim();

    for (const m of methods) {
      instance[m] = (...args) => childLogger[m](...args);
    }

    return instance;
  };

  return logger;
}

const suite = new Benchmark.Suite();

const HAPI_SHIM = Symbol("hapi-shim-log");

const createShimLogger = () => {
  const instance = (...args) => logger.log(...args);
  instance[HAPI_SHIM] = true;
  return instance;
};

const logger = shim(Pino(), createShimLogger);
const loggerWithLoop = shimWithLoop(Pino(), createShimLogger);

suite
  .add("shim", () => {
    const child = logger.child({ level: "info" });
    return child;
  })
  .add("shimWithLoop", () => {
    const child = loggerWithLoop.child({ level: "info" });
    return child;
  })
  .on("cycle", event => {
    console.log(String(event.target));
  })
  .on("complete", function () {
    console.log("Fastest is " + this.filter("fastest").map("name"));
  })
  .run();
