type LogFn = (...args: any[]) => void;

const noop: LogFn = () => {};

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

const makeLogger = (prefix?: string) => {
  const withPrefix =
    (fn: LogFn): LogFn =>
    (...args: any[]) =>
      prefix ? fn(prefix, ...args) : fn(...args);

  const log = isDev ? withPrefix(console.log.bind(console)) : noop;
  const info = isDev ? withPrefix(console.info.bind(console)) : noop;
  const debug = isDev ? withPrefix(console.debug?.bind(console) ?? console.log.bind(console)) : noop;
  const warn = withPrefix(console.warn.bind(console));
  const error = withPrefix(console.error.bind(console));

  return { log, info, debug, warn, error };
};

export const logger = makeLogger();
export const createLogger = (prefix: string) => makeLogger(prefix);
