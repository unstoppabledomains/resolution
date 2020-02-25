import Resolution from "../Resolution";

export async function tryInfo(method, response, name: string): Promise<boolean> {
	const field = name;
	try {
		const resolvedPromise = await method();
		response[field] = resolvedPromise;
		return true;
	} catch (err) {
		response[field] = err.code;
		return false;
	}
}

export function commaSeparatedList(value, dummyPrevious) {
	return value.split(',');
}

export function signedInfuraLink(key: string): string {
	return `https://mainnet.infura.io/v3/${key}`;
}

export function getEtheriumUrl(): string {
	if (process.env.INFURA) return signedInfuraLink(process.env.INFURA);
	if (process.env.RESOLUTION_URL) return signedInfuraLink(process.env.RESOLUTION_URL);
	throw new Error('neither INFURA nor RESOLUTION_URL enviroment variables are se');
}

export function buildResolutionPackage() {
	return new Resolution({
		blockchain: {
			ens: getEtheriumUrl(),
			cns: getEtheriumUrl()
		}
	});
}