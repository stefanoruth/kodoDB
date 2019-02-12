export class ColumnDefinition {
	name?: string
	type?: string
	index?: string
	after?: string
	always?: boolean
	autoIncrement?: boolean
	change?: boolean
	charset?: string
	collation?: string
	comment?: string
	default?: any
	first?: boolean
	generatedAs?: string
	nullable?: boolean
	primary?: boolean
	spatialIndex?: boolean
	storedAs?: string
	unique?: boolean
	unsigned?: boolean
	useCurrent?: boolean
	virtualAs?: string
	length?: number
	total?: number
	places?: number
	allowed?: string
	precision?: number
	srid?: number

	constructor(attributes = {}) {
		for (const key in attributes) {
			if (attributes.hasOwnProperty(key)) {
				;(this as any)[key] = (attributes as any)[key]
			}
		}
	}

	set(key: string, value: any = true) {
		if (!this.hasOwnProperty(key)) {
			throw new Error(`${this.constructor.name} is missing key: ${key}`)
		}

		;(this as any)[key] = value

		return this
	}
}

export class ColumnBuilder {
	name?: string
	protected column: ColumnDefinition

	constructor(attributes = {}) {
		this.column = new ColumnDefinition(attributes)
	}

	getAttributes() {
		return this.column
	}

	build() {
		return this.getAttributes()
	}

	protected setAttribute(key: string, value: any = true) {
		if (key === 'name') {
			this.name = key
		}

		;(this.column as any)[key] = value

		return this
	}

	// # Dynamic Methods

	// Place the column "after" another column(MySQL)
	after(column: string) {
		return this.setAttribute('after', column)
	}

	// Used as a modifier for generatedAs()(PostgreSQL)
	always() {
		return this.setAttribute('always')
	}

	// Set INTEGER columns as auto - increment(primary key)
	autoIncrement() {
		return this.setAttribute('autoIncrement')
	}

	// Change the column
	change() {
		return this.setAttribute('change')
	}

	// Specify a character set for the column(MySQL)
	charset(charset: string) {
		return this.setAttribute('charset', charset)
	}

	// Specify a collation for the column(MySQL / SQL Server)
	collation(collation: string) {
		return this.setAttribute('collation', collation)
	}

	// Add a comment to the column(MySQL)
	comment(comment: string) {
		return this.setAttribute('comment', comment)
	}

	// Specify a "default" value for the column
	default(value: any) {
		return this.setAttribute('default', value)
	}

	// Place the column "first" in the table(MySQL)
	first() {
		return this.setAttribute('first')
	}

	// Create a SQL compliant identity column(PostgreSQL)
	generatedAs(expression: string) {
		return this.setAttribute('generatedAs', expression)
	}

	// Add an index
	index(indexName?: string) {
		return this.setAttribute('index', indexName)
	}

	// Allow NULL values to be inserted into the column
	nullable(value: boolean = true) {
		return this.setAttribute('nullable', value)
	}

	// Add a primary index
	primary() {
		return this.setAttribute('primary')
	}

	// Add a spatial index
	spatialIndex() {
		return this.setAttribute('spatialIndex')
	}

	// Create a stored generated column(MySQL)
	storedAs(expression: string) {
		return this.setAttribute('storedAs', expression)
	}

	// Add a unique index
	unique() {
		return this.setAttribute('unique')
	}

	// Set the INTEGER column as UNSIGNED (MySQL)
	unsigned() {
		return this.setAttribute('unsigned')
	}

	// Set the TIMESTAMP column to use CURRENT_TIMESTAMP as default value
	useCurrent() {
		return this.setAttribute('useCurrent')
	}

	// Create a virtual generated column(MySQL)
	virtualAs(expression: string) {
		return this.setAttribute('virtualAs', expression)
	}
}
