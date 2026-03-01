const UNSET = Symbol('UNSET');

type ConfigurationValue<T> = {
  (): T | undefined;
  set(value: T | undefined): void;
};

type RequiredConfigurationValue<T> = {
  (): T;
  set(value: T): void;
};

type ConfigurationValueFactory = {
  <T = string>(): ConfigurationValue<T>;
  required<T = string>(readableKey: string): RequiredConfigurationValue<T>;
};

export const configurationValue: ConfigurationValueFactory = Object.assign(
  function <T = string>() {
    let value: T | undefined = undefined;

    const fn = (() => value) as ConfigurationValue<T>;
    fn.set = (next) => { value = next; };

    return fn;
  },
  {
    required: function <T = string>(readableKey: string) {
      let value: T | typeof UNSET = UNSET;

      const fn = (() => {
        if (value === UNSET) {
          throw new Error(`Required configuration value ${readableKey} was read before being set`);
        }
        return value;
      }) as RequiredConfigurationValue<T>;

      fn.set = (next) => {
        // required: disallow "unset"
        if (next === undefined) {
          throw new Error(`Required configuration value ${readableKey} cannot be set to undefined`);
        }
        value = next;
      };

      return fn;
    },
  }
);
