declare module 'namehash' {
	export default function namehash(name: string, { parent, prefix }?: { parent?: string | null, prefix?: boolean | undefined }): string;
}
