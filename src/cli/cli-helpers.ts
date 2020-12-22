import Resolution from '../Resolution';
import { ResolutionErrorCode } from '..';

export async function tryInfo(
  method: () => any,
  response: Record<string, string>,
  name: string,
): Promise<boolean> {
  const field = name;
  try {
    response[field] = await method();
    return true;
  } catch (err) {
    if (Object.values(ResolutionErrorCode).includes(err.code)) {
      response[field] = err.code;
    } else {
      response[field] = err.message
    }
    return false;
  }
}

export function commaSeparatedList(value: string): string[] {
  return value.split(',').map((v: string) => v.toUpperCase());
}

export function buildResolutionPackage(ethereumUrl?: string): Resolution {
  if (ethereumUrl) {
    try {
      const url = (new URL(ethereumUrl)).toString();
      return new Resolution({
        blockchain: {
          ens: url,
          cns: url,
        },
      });
    } catch (e) {
      if (e instanceof TypeError) {
        console.warn(`--ethereum-url option is not valid URL`);
      } else {
        console.error(e);
      }
    }
  }

  console.warn('This RPC is limited to 2,000 calls per 5 minutes. If that is exceeded, then the source IP address is blocked');
  console.warn('To configure a different provider set --ethereum-url option with valid ethereum provider url');
  return new Resolution();
}

