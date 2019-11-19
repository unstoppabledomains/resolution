/**
 * Iterates over an object and replace the inner object with the values of iteratee
 * @param object 
 * @param iteratee
 */
export function mapValues(object, iteratee) {
  const returnee = {};
  for (const key in object) {
    if (!object.hasOwnProperty(key)) continue;
    switch (typeof object[key]) {
      case 'object': {
        returnee[key] = mapValues(object[key], iteratee);
        break;
      }
      default: {
        if (object[iteratee])
          return object[iteratee];
      }
    }
  }
  return returnee;
}

/**
 * Clones the object
 * @param object 
 */
export function clone(object) {
  return JSON.parse(JSON.stringify(object));
}


/**
 * Parses object in format { "key.key2.key3" : value } into { key: { key2: {key3: value } } }
 * @param object object to parse
 * @param key string to split 
 * @param value value to make it equal to
 */
export function set(object, key, value) {
    let current = object
    const tokens = key.split(".")
    const last = tokens.pop();
    tokens.forEach(token => {
      current[token] = typeof(current[token]) == "object" ? current[token] : {}
      current = current[token]
    });
    current[last] = value;
    return object;
}

/**
 * Transforms an object by applying func to each properpty and storing them inside the accumulator.
 * @param object - object to operate on
 * @param func - func to apply
 * @param accumulator - accumulator object to store the results
 */
export function transform(object, func, accumulator) {
  for (const key in object) {
    if (!object.hasOwnProperty(key)) continue;
    func(accumulator, object[key], key);
  }
  return accumulator;
}

/**
 * Should invert the object (keys becomes values and values becomes keys)
 * @param object 
 */
export function invert(object) {
  const returnee = {};

  for (const key in object) {
    if(!object.hasOwnProperty(key)) continue;
    returnee[object[key]] = key;
  }
  return returnee;
}