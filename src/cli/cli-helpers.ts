import Resolution from "../Resolution";
import * as fs from 'fs';

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
	return value.split(',').map((v:string) => v.toUpperCase());
}

export function signedInfuraLink(key: string): string {
	return `https://mainnet.infura.io/v3/${key}`;
}

export function getEtheriumUrl(): string {
	//try to get them from config files
	const configObject = getConfig();
	if (!configObject) {
		if (process.env.UNSTOPPABLE_RESOLUTION_INFURA_PROJECTID) return signedInfuraLink(process.env.UNSTOPPABLE_RESOLUTION_INFURA_PROJECTID);
		if (process.env.UNSTOPPABLE_RESOLUTION_URL) return signedInfuraLink(process.env.UNSTOPPABLE_RESOLUTION_URL);
	} else {
		if (configObject.type === 'infura') return signedInfuraLink(configObject.value);
		if (configObject.type === "url") return "url";
	}
	throw new Error('Couldn\'t find any configurate\n\tUse -C to configurate the library');
}

export function buildResolutionPackage() {
	return new Resolution({
		blockchain: {
			ens: getEtheriumUrl(),
			cns: getEtheriumUrl()
		}
	});
}

export function parseConfig(value:string, dummyPrevious) {
	const words = value.split(':')
	return {type: words[0], value: words[1]};
}

export function storeConfig(type: "infura" | "url", value: string) {
	fs.writeFile('.resolution', `${type}=${value}`, () => console.log(`${type}=${value} record stored`));
}

export function getConfig() {
	try {
		const config = fs.readFileSync(`.resolution`).toString().split('=');
		if (config[0] === "infura" || config[0] === "url")
			return {type: config[0], value:config[1]}
	}catch(err) {
		throw new Error('Resolution library is not configured. Please use resolution -C and configure it either with infura project id or node url for lookup. Resolution -h for more details')
	}
}