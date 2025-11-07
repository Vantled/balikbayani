// lib/utils/objectDiff.ts
// Utility helpers for extracting changed values between two plain objects.

export interface DiffOptions {
  ignoreKeys?: string[];
  includeKeys?: string[];
}

const isObjectLike = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object';
};

const valuesAreEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b)) {
    return true;
  }
  if (typeof a === 'object' || typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return false;
};

const buildKeySet = (oldData: any, newData: any, options: DiffOptions): string[] => {
  const keys = new Set<string>();
  const addKeys = (source: any) => {
    if (!isObjectLike(source)) return;
    Object.keys(source).forEach(key => keys.add(key));
  };

  if (options.includeKeys && options.includeKeys.length > 0) {
    options.includeKeys.forEach(key => keys.add(key));
  } else {
    addKeys(oldData);
    addKeys(newData);
  }

  if (options.ignoreKeys && options.ignoreKeys.length > 0) {
    options.ignoreKeys.forEach(key => keys.delete(key));
  }

  return Array.from(keys);
};

export const extractChangedValues = <T extends Record<string, any> | null | undefined>(
  oldData: T,
  newData: T,
  options: DiffOptions = {}
): { oldValues: Record<string, unknown>; newValues: Record<string, unknown> } => {
  const relevantKeys = buildKeySet(oldData, newData, options);
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};

  relevantKeys.forEach(key => {
    const oldValue = isObjectLike(oldData) ? oldData[key] : undefined;
    const newValue = isObjectLike(newData) ? newData[key] : undefined;

    if (!valuesAreEqual(oldValue, newValue)) {
      if (typeof oldValue !== 'undefined') {
        oldValues[key] = oldValue;
      }
      if (typeof newValue !== 'undefined') {
        newValues[key] = newValue;
      }
    }
  });

  return { oldValues, newValues };
};

