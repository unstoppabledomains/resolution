import sha3 from './sha3'

export default (name = '', { parent = '0'.repeat(64), prefix = true } = {}) => {
	if (parent.match(/^0x/)) {
		parent = parent.substr(2)
	}
	const address = [parent]
		.concat(
			name
				.split('.')
				.reverse()
				.filter(label => label)
				.map(label => sha3(label, { hexPrefix: false })),
		)
		.reduce((a, labelHash) =>
			sha3(a + labelHash, { hexPrefix: false, inputEnc: 'hex' }),
		)
	return prefix ? '0x' + address : address;
}
