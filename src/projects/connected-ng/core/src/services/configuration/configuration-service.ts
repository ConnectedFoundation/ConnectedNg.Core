import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ConfigurationService {
  private configurationStorage: any = {};

  setConfiguration(key: string, value: any) {
    this.configurationStorage[key] = value;
  }

  getConfiguration<T>(key: string): (T | null) {
    return this.configurationStorage[key] as T;
  }

  parseConfiguration(values: any, keyPrefix: string = '') {
    if (!values || typeof values !== 'object') {
      return;
    }

    this.traverseAndStore(values, keyPrefix ? [keyPrefix] : []);
  }


  private traverseAndStore(obj: any, keyPath: string[]): void {
    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) {
        continue;
      }

      const value = obj[key];
      const currentPath = [...keyPath, key];

      if (typeof value !== 'object') {
        // It's a ConfigurationValue, store its current value
        const configKey = currentPath.join(':');
        const configValue = value;
        this.setConfiguration(configKey, configValue);
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        // It's a nested object, recurse
        this.traverseAndStore(value, currentPath);
      }
    }
  }

  bind<T>(object: T, parentKey: string = '') {
    if (!object || typeof object !== 'object') {
      return;
    }

    for (const key in object) {
      if (object.hasOwnProperty(key)) {
        const property = (object as any)[key];
        const currentKey = parentKey ? `${parentKey}:${key}` : key;

        // Check if this is a ConfigurationValue (function with a set method)
        if (typeof property === 'function' && typeof property.set === 'function') {
          const value = this.getConfiguration<any>(currentKey);

          if (value !== null && value !== undefined) {
            property.set(value);
          }
        } else if (typeof property === 'object' && property !== null) {
          // Recursively bind nested objects
          this.bind(property, currentKey);
        }
      }
    }
  }
}
