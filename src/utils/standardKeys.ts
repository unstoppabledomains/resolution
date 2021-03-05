import SupportedKeys from '../config/supported-keys.json';

const StandardKeys: Record<string, string> = {};
for (const key in SupportedKeys.keys) {
  if (SupportedKeys.keys.hasOwnProperty(key)) {
    const deprecatedKeyName = SupportedKeys.keys[key].deprecatedKeyName;
    if (deprecatedKeyName && deprecatedKeyName.length > 0) {
      StandardKeys[deprecatedKeyName] = key;
    }
  }
}

export default StandardKeys;
