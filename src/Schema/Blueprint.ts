import { Connection } from '../Connections/Connection'
import { SchemaGrammar } from './Grammars/SchemaGrammar'
import { SchemaBuilder } from './SchemaBuilder'
import { ColumnDefinition, ColumnBuilder } from './ColumnDefinition'
import { tap, ucfirst, lcfirst } from '../Utils'

export class Blueprint {
	protected table: string
	protected prefix: string
	protected columns: ColumnDefinition[] = []
	protected commands: ColumnBuilder[] = []
	engine?: string
	charset?: string
	collation?: any
	temporaryState: boolean = false

	constructor(table: string, callback?: (blueprint: Blueprint) => void, prefix = '') {
		this.table = table
		this.prefix = prefix

		if (callback) {
			callback(this)
		}
	}

	build(connection: Connection, grammar: SchemaGrammar) {
		this.toSql(connection, grammar).forEach((statement: string) => {
			connection.statement(statement)
		})
	}

	toSql(connection: Connection, grammar: SchemaGrammar): string[] {
		this.addImpliedCommands(grammar)

		const statements: string[] = []

		// Each type of command has a corresponding compiler function on the schema
		// grammar which is used to build the necessary SQL statements to build
		// the blueprint element, so we'll just call that compilers function.
		this.ensureCommandsAreValid(connection)

		this.commands
			.map(builder => builder.build())
			.forEach(command => {
				const method = 'compile' + ucfirst(command.name)
				if ((grammar as any)[method]) {
					const sql = (grammar as any)[method](this, command, connection)

					if (sql) {
						statements.push(sql)
					}
				}
			})

		return statements
	}

	protected ensureCommandsAreValid(connection: Connection) {
		// Todo SQLiteConnection
	}

	protected addImpliedCommands(grammar: SchemaGrammar): void {
		if (this.getAddedColumns().length > 0 && !this.creating()) {
			this.commands.unshift(this.createCommand('add'))
		}

		if (this.getChangedColumns().length > 0 && !this.creating()) {
			this.commands.unshift(this.createCommand('change'))
		}

		this.addFluentIndexes()
		this.addFluentCommands(grammar)
	}

	protected addFluentIndexes() {
		const indexes = ['primary', 'unique', 'index', 'spatialIndex']

		Loop1: for (const keyColumn in this.columns) {
			if (this.columns.hasOwnProperty(keyColumn)) {
				const column: any = this.columns[keyColumn]

				Loop2: for (const keyIndex in indexes) {
					if (indexes.hasOwnProperty(keyIndex)) {
						const index: string = indexes[keyIndex]

						// If the index has been specified on the given column, but is simply equal
						// to "true" (boolean), no name has been specified for this index so the
						// index method can be called without a name and it will generate one.
						if ((column as any)[index] === true) {
							;(this as any)[index](column.name)

							continue Loop2
						}

						// If the index has been specified on the given column, and it has a string
						// value, we'll go ahead and call the index method and pass the name for
						// the index since the developer specified the explicit name for this.
						else if (typeof (column as any)[index] !== 'undefined') {
							;(this as any)[index](column.name, column[index])

							continue Loop2
						}
					}
				}
			}
		}
	}

	addFluentCommands(grammar: SchemaGrammar) {
		this.columns.forEach((column: ColumnDefinition) => {
			grammar.getFluentCommands().forEach((commandName: string) => {
				const attributeName: string = lcfirst(commandName)

				if (!(column as any)[attributeName]) {
					return
				}

				this.addCommand(commandName, { value: (column as any)[attributeName], column })
			})
		})
	}

	protected creating(): boolean {
		return this.commands.some((command: any) => {
			return command.name === 'create'
		})
	}

	protected addCommand(name: string, parameters: any[] | {} = []) {
		return tap(this.createCommand(name, parameters), command => {
			this.commands.push(command)
		})
	}

	protected createCommand(name: string, parameters?: {}) {
		return new ColumnBuilder({ name, ...parameters })
	}

	protected dropIndexCommand(command: string, type: string, index?: string | string[]) {
		let columns: string[] = []

		if (index instanceof Array) {
			index = this.createIndexName(type, (columns = index))
		}

		return this.indexCommand(command, columns, index)
	}

	getCommands() {
		return this.commands.map(builder => builder.build())
	}

	temporary() {
		this.temporaryState = true
	}

	create() {
		return this.addCommand('create')
	}

	drop() {
		return this.addCommand('drop')
	}

	dropIfExists() {
		return this.addCommand('dropIfExists')
	}

	dropColumn(...columns: string[]) {
		return this.addCommand('dropColumn', columns)
	}

	renameColumn(from: string, to: string) {
		return this.addCommand('renameColumn', { from, to })
	}

	dropPrimary(index?: string | string[]) {
		return this.dropIndexCommand('dropPrimary', 'primary', index)
	}

	dropUnique(index: string | string[]) {
		return this.dropIndexCommand('dropUnique', 'unique', index)
	}

	dropIndex(index: string | string[]) {
		return this.dropIndexCommand('dropIndex', 'index', index)
	}

	dropSpatialIndex(index: string | string[]) {
		return this.dropIndexCommand('dropSpatialIndex', 'spatialIndex', index)
	}

	dropForeign(index: string | string[]) {
		return this.dropIndexCommand('dropForeign', 'foreign', index)
	}

	renameIndex(from: string, to: string) {
		return this.addCommand('renameIndex', { from, to })
	}

	dropTimestamps() {
		this.dropColumn('created_at', 'updated_at')
	}

	dropTimestampsTz() {
		this.dropTimestamps()
	}

	dropSoftDeletes(column: string = 'deleted_at') {
		this.dropColumn(column)
	}

	dropSoftDeletesTz(column: string = 'deleted_at') {
		this.dropSoftDeletes(column)
	}

	dropRememberToken() {
		this.dropColumn('remember_token')
	}

	dropMorphs(name: string, indexName?: string) {
		this.dropIndex(indexName ? indexName : this.createIndexName('index', [`{name}_type`, `{name}_id`]))
		this.dropColumn(`{name}_type`, `{name}_id`)
	}

	rename(to: string) {
		return this.addCommand('rename', { to })
	}

	primary(columns: string, name?: string, algorithm?: string) {
		return this.indexCommand('primary', columns, name, algorithm)
	}

	unique(columns: string | string[], name?: string, algorithm?: string) {
		return this.indexCommand('unique', columns, name, algorithm)
	}

	index(columns: string | string[], name?: string, algorithm?: string) {
		return this.indexCommand('index', columns, name, algorithm)
	}

	spatialIndex(columns: string, name?: string) {
		return this.indexCommand('spatialIndex', columns, name)
	}

	foreign(columns: string, name?: string) {
		return this.indexCommand('foreign', columns, name)
	}

	increments(column: string) {
		return this.unsignedInteger(column, true)
	}

	tinyIncrements(column: string) {
		return this.unsignedTinyInteger(column, true)
	}

	smallIncrements(column: string) {
		return this.unsignedSmallInteger(column, true)
	}

	mediumIncrements(column: string) {
		return this.unsignedMediumInteger(column, true)
	}

	bigIncrements(column: string) {
		return this.unsignedBigInteger(column, true)
	}

	char(column: string, length?: number) {
		length = length || SchemaBuilder.defaultStringLength
		return this.addColumn('char', column, { length })
	}

	string(column: string, length?: number) {
		length = length || SchemaBuilder.defaultStringLength
		return this.addColumn('string', column, { length })
	}

	text(column: string) {
		return this.addColumn('text', column)
	}

	mediumText(column: string) {
		return this.addColumn('mediumText', column)
	}

	longText(column: string) {
		return this.addColumn('longText', column)
	}

	integer(column: string, autoIncrement = false, unsigned = false) {
		return this.addColumn('integer', column, { autoIncrement, unsigned })
	}

	tinyInteger(column: string, autoIncrement = false, unsigned = false) {
		return this.addColumn('tinyInteger', column, { autoIncrement, unsigned })
	}

	smallInteger(column: string, autoIncrement = false, unsigned = false) {
		return this.addColumn('smallInteger', column, { autoIncrement, unsigned })
	}

	mediumInteger(column: string, autoIncrement = false, unsigned = false) {
		return this.addColumn('mediumInteger', column, { autoIncrement, unsigned })
	}

	bigInteger(column: string, autoIncrement = false, unsigned = false) {
		return this.addColumn('bigInteger', column, { autoIncrement, unsigned })
	}

	unsignedInteger(column: string, autoIncrement = false) {
		return this.integer(column, autoIncrement, true)
	}

	unsignedTinyInteger(column: string, autoIncrement = false) {
		return this.tinyInteger(column, autoIncrement, true)
	}

	unsignedSmallInteger(column: string, autoIncrement = false) {
		return this.smallInteger(column, autoIncrement, true)
	}

	unsignedMediumInteger(column: string, autoIncrement = false) {
		return this.mediumInteger(column, autoIncrement, true)
	}

	unsignedBigInteger(column: string, autoIncrement = false) {
		return this.bigInteger(column, autoIncrement, true)
	}

	float(column: string, total = 8, places = 2) {
		return this.addColumn('float', column, { total, places })
	}

	double(column: string, total = null, places = null) {
		return this.addColumn('double', column, { total, places })
	}

	decimal(column: string, total = 8, places = 2) {
		return this.addColumn('decimal', column, { total, places })
	}

	unsignedDecimal(column: string, total = 8, places = 2) {
		return this.addColumn('decimal', column, { total, places, unsigned: true })
	}

	boolean(column: string) {
		return this.addColumn('boolean', column)
	}

	enum(column: string, allowed: []) {
		return this.addColumn('enum', column, { allowed })
	}

	json(column: string) {
		return this.addColumn('json', column)
	}

	jsonb(column: string) {
		return this.addColumn('jsonb', column)
	}

	date(column: string) {
		return this.addColumn('date', column)
	}

	dateTime(column: string, precision = 0) {
		return this.addColumn('dateTime', column, { precision })
	}

	dateTimeTz(column: string, precision = 0) {
		return this.addColumn('dateTimeTz', column, { precision })
	}

	time(column: string, precision = 0) {
		return this.addColumn('time', column, { precision })
	}

	timeTz(column: string, precision = 0) {
		return this.addColumn('timeTz', column, { precision })
	}

	timestamp(column: string, precision = 0) {
		return this.addColumn('timestamp', column, { precision })
	}

	timestampTz(column: string, precision = 0) {
		return this.addColumn('timestampTz', column, { precision })
	}

	timestamps(precision = 0) {
		this.timestamp('created_at', precision).nullable()
		this.timestamp('updated_at', precision).nullable()
	}

	nullableTimestamps(precision = 0) {
		this.timestamps(precision)
	}

	timestampsTz(precision = 0) {
		this.timestampTz('created_at', precision).nullable()
		this.timestampTz('updated_at', precision).nullable()
	}

	softDeletes(column = 'deleted_at', precision = 0) {
		return this.timestamp(column, precision).nullable()
	}

	softDeletesTz(column = 'deleted_at', precision = 0) {
		return this.timestampTz(column, precision).nullable()
	}

	year(column: string) {
		return this.addColumn('year', column)
	}

	binary(column: string) {
		return this.addColumn('binary', column)
	}

	uuid(column: string) {
		return this.addColumn('uuid', column)
	}

	ipAddress(column: string) {
		return this.addColumn('ipAddress', column)
	}

	macAddress(column: string) {
		return this.addColumn('macAddress', column)
	}

	geometry(column: string) {
		return this.addColumn('geometry', column)
	}

	point(column: string, srid = null) {
		return this.addColumn('point', column, { srid })
	}

	lineString(column: string) {
		return this.addColumn('linestring', column)
	}

	polygon(column: string) {
		return this.addColumn('polygon', column)
	}

	geometryCollection(column: string) {
		return this.addColumn('geometrycollection', column)
	}

	multiPoint(column: string) {
		return this.addColumn('multipoint', column)
	}

	multiLineString(column: string) {
		return this.addColumn('multilinestring', column)
	}

	multiPolygon(column: string) {
		return this.addColumn('multipolygon', column)
	}

	morphs(name: string, indexName?: string) {
		this.string('{name}_type')
		this.unsignedBigInteger('{name}_id')
		this.index(['{name}_type', '{name}_id'], indexName)
	}

	nullableMorphs(name: string, indexName?: string) {
		this.string('{name}_type').nullable()
		this.unsignedBigInteger('{name}_id').nullable()
		this.index(['{name}_type', '{name}_id'], indexName)
	}

	rememberToken() {
		return this.string('remember_token', 100).nullable()
	}

	addColumn(type: string, name: string, parameters = {}) {
		const column = new ColumnBuilder({ type, name, ...parameters })

		this.columns.push(column.build())

		return column
	}

	protected indexCommand(type: string, columns: string | string[], index?: string | string[], algorithm?: string) {
		columns = columns instanceof Array ? columns : [columns]
		// If no name was specified for this index, we will create one using a basic
		// convention of the table name, followed by the columns, followed by an
		// index type, such as primary or index, which makes the index unique.
		index = index ? index : this.createIndexName(type, columns)

		return this.addCommand(type, { index, columns, algorithm })
	}

	protected createIndexName(type: string, columns: string[]): string {
		return `${this.prefix}${this.table}_${columns.join('_')}_${type}`.toLowerCase().replace(new RegExp(/[\-\.]/gi), '_')
	}

	removeColumn(name: string) {
		this.columns = this.columns.filter(column => {
			return column.name !== name
		})

		return this
	}

	getTable() {
		return this.table
	}

	getColumns(): ColumnDefinition[] {
		return this.columns
	}

	getAddedColumns(): ColumnDefinition[] {
		return this.columns.filter((column: ColumnDefinition) => {
			return !(column as any).change
		})
	}

	getChangedColumns(): ColumnDefinition[] {
		return this.columns.filter((column: ColumnDefinition) => {
			return (column as any).change
		})
	}
}
