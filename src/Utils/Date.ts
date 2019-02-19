export function dateFormat(d: Date): string {
	const one = (t: number) => ('0' + t).slice(-2)
	const two = (t: number) => ('0' + (t + 1)).slice(-2)

	return `${d.getFullYear()}_${two(d.getMonth())}_${one(d.getDate())}_${one(d.getHours())}${one(d.getMinutes())}${one(
		d.getSeconds()
	)}`
}
