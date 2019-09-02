import { sha256 as sha } from 'hash.js'

export default (
	message: any,
	{
		hexPrefix = true,
		inputEnc = undefined,
		outputEnc = 'hex',
	}: { hexPrefix?: boolean; inputEnc?: 'hex' | undefined; outputEnc?: 'hex' } = {},
) =>
	(hexPrefix ? '0x' : '') +
	sha()
		.update(message, inputEnc)
		.digest(outputEnc)
