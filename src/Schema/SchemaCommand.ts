export class SchemaCommand {
	name: string = ''
	index: string = ''
	columns: string[] = []
	from: string = ''
	to: string = ''
	length?: number
	onDelete?: boolean
	onUpdate?: boolean
	references?: any
	algorithm?: any
	on?: any

	constructor(attributes = {}) {
		for (const key in attributes) {
			if (attributes.hasOwnProperty(key)) {
				;(this as any)[key] = (attributes as any)[key]
			}
		}
	}
}
