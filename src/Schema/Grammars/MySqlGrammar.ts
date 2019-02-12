import { SchemaGrammar } from './SchemaGrammar'
import { Blueprint } from '../Blueprint'
import { Command } from '../Command'
import { Connection } from '../../Connections/Connection'
import { ColumnDefinition } from '../ColumnDefinition'

export class MySqlSchemaGrammar extends SchemaGrammar {
	/**
	 * The possible column modifiers.
	 */
	protected modifiers = [
		'Unsigned',
		'VirtualAs',
		'StoredAs',
		'Charset',
		'Collate',
		'Nullable',
		'Default',
		'Increment',
		'Comment',
		'After',
		'First',
		'Srid',
	]

	/**
	 * The possible column serials.
	 */
	protected serials = ['bigInteger', 'integer', 'mediumInteger', 'smallInteger', 'tinyInteger']

	/**
	 * Compile the query to determine the list of tables.
	 */
	compileTableExists(): string {
		return 'select * from information_schema.tables where table_schema = ? and table_name = ?'
	}

	/**
	 * Compile the query to determine the list of columns.
	 */
	compileColumnListing(): string {
		return 'select column_name as `column_name` from information_schema.columns where table_schema = ? and table_name = ?'
	}

	/**
	 * Compile a create table command.
	 */
	compileCreate(blueprint: Blueprint, command: Command, connection: Connection): string {
		let sql: string = this.compileCreateTable(blueprint, command, connection)

		// Once we have the primary SQL, we can add the encoding option to the SQL for
		// the table.  Then, we can check if a storage engine has been supplied for
		// the table. If so, we will add the engine declaration to the SQL query.
		sql = this.compileCreateEncoding(sql, connection, blueprint)

		// Finally, we will append the engine configuration onto this SQL statement as
		// the final thing we do before returning this finished SQL. Once this gets
		// added the query will be ready to execute against the real connections.
		return this.compileCreateEngine(sql, connection, blueprint)
	}

	/**
	 * Create the main create table clause.
	 */
	protected compileCreateTable(blueprint: Blueprint, command: Command, connection: Connection): string {
		return `${blueprint.temporary ? 'create temporary' : 'create'} table ${this.wrapTable(
			blueprint
		)} (${this.getColumns(blueprint).join(', ')})`
	}

	/**
	 * Append the character set specifications to a command.
	 */
	protected compileCreateEncoding(sql: string, connection: Connection, blueprint: Blueprint): string {
		// First we will set the character set if one has been set on either the create
		// blueprint itself or on the root configuration for the connection that the
		// table is being created on. We will add these to the create table query.
		const charset = connection.getConfig('charset')

		if (blueprint.charset) {
			sql += ' default character set ' + blueprint.charset
		} else if (charset) {
			sql += ' default character set ' + charset
		}

		// Next we will add the collation to the create table statement if one has been
		// added to either this create table blueprint or the configuration for this
		// connection that the query is targeting. We'll add it to this SQL query.
		const collation = connection.getConfig('collation')

		if (blueprint.collation) {
			sql += ` collate '${blueprint.collation}'`
		} else if (collation) {
			sql += ` collate '${collation}'`
		}

		return sql
	}

	/**
	 * Append the engine specifications to a command.
	 */
	protected compileCreateEngine(sql: string, connection: Connection, blueprint: Blueprint): string {
		if (blueprint.engine) {
			return sql + ' engine = ' + blueprint.engine
		}

		const engine = connection.getConfig('engine')

		if (engine) {
			return sql + ' engine = ' + engine
		}

		return sql
	}

	/**
	 * Compile an add column command.
	 */
	compileAdd(blueprint: Blueprint, command: Command): string {
		const columns = this.prefixArray('add', this.getColumns(blueprint))

		return `alter table ${this.wrapTable(blueprint)} ${columns.join(', ')}`
	}

	/**
	 * Compile a primary key command.
	 */
	compilePrimary(blueprint: Blueprint, command: Command): string {
		command.name(null)

		return this.compileKey(blueprint, command, 'primary key')
	}

	/**
	 * Compile a unique key command.
	 */
	compileUnique(blueprint: Blueprint, command: Command): string {
		return this.compileKey(blueprint, command, 'unique')
	}

	/**
	 * Compile a plain index key command.
	 */
	compileIndex(blueprint: Blueprint, command: Command) {
		return this.compileKey(blueprint, command, 'index')
	}

	/**
	 * Compile a spatial index key command.
	 */
	compileSpatialIndex(blueprint: Blueprint, command: Command) {
		return this.compileKey(blueprint, command, 'spatial index')
	}

	/**
	 * Compile an index creation command.
	 */
	protected compileKey(blueprint: Blueprint, command: any, type: string): string {
		console.log(command)
		return `alter table ${this.wrapTable(blueprint)} add ${type} ${this.wrap(command.index)}${
			command.algorithm ? ` using {command.algorithm}` : ''
		}(${this.columnize(command.columns)})`
	}

	/**
	 * Compile a drop table command.
	 */
	compileDrop(blueprint: Blueprint, command: Command) {
		return 'drop table ' + this.wrapTable(blueprint)
	}

	/**
	 * Compile a drop table (if exists) command.
	 */
	compileDropIfExists(blueprint: Blueprint, command: Command) {
		return 'drop table if exists ' + this.wrapTable(blueprint)
	}

	/**
	 * Compile a drop column command.
	 */
	compileDropColumn(blueprint: Blueprint, command: Command) {
		const columns = this.prefixArray('drop', this.wrapArray(command.columns))

		return `alter table ${this.wrapTable(blueprint)} ${columns.join(', ')}`
	}

	/**
	 * Compile a drop primary key command.
	 */
	compileDropPrimary(blueprint: Blueprint, command: Command) {
		return `alter table ${this.wrapTable(blueprint)} drop primary key`
	}

	/**
	 * Compile a drop unique key command.
	 */
	compileDropUnique(blueprint: Blueprint, command: Command) {
		return `alter table ${this.wrapTable(blueprint)} drop index ${this.wrap(command.index)}`
	}

	/**
	 * Compile a drop index command.
	 */
	compileDropIndex(blueprint: Blueprint, command: Command) {
		return `alter table ${this.wrapTable(blueprint)} drop index ${this.wrap(command.index)}`
	}

	/**
	 * Compile a drop spatial index command.
	 */
	compileDropSpatialIndex(blueprint: Blueprint, command: Command) {
		return this.compileDropIndex(blueprint, command)
	}

	/**
	 * Compile a drop foreign key command.
	 */
	compileDropForeign(blueprint: Blueprint, command: Command) {
		return `alter table ${this.wrapTable(blueprint)} drop foreign key ${this.wrap(command.index)}`
	}

	/**
	 * Compile a rename table command.
	 */
	compileRename(blueprint: Blueprint, command: Command) {
		return `rename table ${this.wrapTable(blueprint)} to ${this.wrapTable(command.to)}`
	}

	/**
	 * Compile a rename index command.
	 */
	compileRenameIndex(blueprint: Blueprint, command: Command) {
		return `alter table ${this.wrapTable(blueprint)} rename index ${this.wrap(command.from)} to ${this.wrap(
			command.to
		)}`
	}

	/**
	 * Compile the SQL needed to drop all tables.
	 */
	compileDropAllTables(tables: string[]): string {
		return 'drop table ' + this.wrapArray(tables).join(',')
	}

	/**
	 * Compile the SQL needed to drop all views.
	 */
	compileDropAllViews(views: string[]): string {
		return 'drop view ' + this.wrapArray(views).join(',')
	}

	/**
	 * Compile the SQL needed to retrieve all table names.
	 */
	compileGetAllTables() {
		return 'SHOW FULL TABLES WHERE table_type = \'BASE TABLE\''
	}

	/**
	 * Compile the SQL needed to retrieve all view names.
	 */
	compileGetAllViews() {
		return 'SHOW FULL TABLES WHERE table_type = \'VIEW\''
	}

	/**
	 * Compile the command to enable foreign key constraints.
	 */
	compileEnableForeignKeyConstraints() {
		return 'SET FOREIGN_KEY_CHECKS=1;'
	}

	/**
	 * Compile the command to disable foreign key constraints.
	 */
	compileDisableForeignKeyConstraints() {
		return 'SET FOREIGN_KEY_CHECKS=0;'
	}

	/**
	 * Create the column definition for a char type.
	 */
	protected typeChar(column: ColumnDefinition) {
		return `char(${column.length})`
	}

	/**
	 * Create the column definition for a string type.
	 */
	protected typeString(column: ColumnDefinition) {
		return `varchar(${column.length})`
	}

	/**
	 * Create the column definition for a text type.
	 */
	protected typeText(column: ColumnDefinition) {
		return 'text'
	}

	/**
	 * Create the column definition for a medium text type.
	 */
	protected typeMediumText(column: ColumnDefinition) {
		return 'mediumtext'
	}

	/**
	 * Create the column definition for a long text type.
	 */
	protected typeLongText(column: ColumnDefinition) {
		return 'longtext'
	}

	/**
	 * Create the column definition for a big integer type.
	 */
	protected typeBigInteger(column: ColumnDefinition) {
		return 'bigint'
	}

	/**
	 * Create the column definition for an integer type.
	 */
	protected typeInteger(column: ColumnDefinition) {
		return 'int'
	}

	/**
	 * Create the column definition for a medium integer type.
	 */
	protected typeMediumInteger(column: ColumnDefinition) {
		return 'mediumint'
	}

	/**
	 * Create the column definition for a tiny integer type.
	 */
	protected typeTinyInteger(column: ColumnDefinition) {
		return 'tinyint'
	}

	/**
	 * Create the column definition for a small integer type.
	 */
	protected typeSmallInteger(column: ColumnDefinition) {
		return 'smallint'
	}

	/**
	 * Create the column definition for a float type.
	 */
	protected typeFloat(column: ColumnDefinition) {
		return this.typeDouble(column)
	}

	/**
	 * Create the column definition for a double type.
	 */
	protected typeDouble(column: ColumnDefinition) {
		if (column.total && column.places) {
			return `double(${column.total}, ${column.places})`
		}
		return 'double'
	}

	/**
	 * Create the column definition for a decimal type.
	 */
	protected typeDecimal(column: ColumnDefinition) {
		return `double(${column.total}, ${column.places})`
	}

	/**
	 * Create the column definition for a boolean type.
	 */
	protected typeBoolean(column: ColumnDefinition) {
		return 'tinyint(1)'
	}

	/**
	 * Create the column definition for an enumeration type.
	 */
	protected typeEnum(column: ColumnDefinition) {
		return `enum(${this.quoteString(column.allowed)})`
	}

	/**
	 * Create the column definition for a json type.
	 */
	protected typeJson(column: ColumnDefinition) {
		return 'json'
	}

	/**
	 * Create the column definition for a jsonb type.
	 */
	protected typeJsonb(column: ColumnDefinition) {
		return 'json'
	}

	/**
	 * Create the column definition for a date type.
	 */
	protected typeDate(column: ColumnDefinition) {
		return 'date'
	}

	/**
	 * Create the column definition for a date-time type.
	 */
	protected typeDateTime(column: ColumnDefinition) {
		return column.precision ? `datetime(${column.precision})` : 'datetime'
	}

	/**
	 * Create the column definition for a date-time (with time zone) type.
	 */
	protected typeDateTimeTz(column: ColumnDefinition) {
		return this.typeDateTime(column)
	}

	/**
	 * Create the column definition for a time type.
	 */
	protected typeTime(column: ColumnDefinition) {
		return column.precision ? `time(${column.precision})` : 'time'
	}

	/**
	 * Create the column definition for a time (with time zone) type.
	 */
	protected typeTimeTz(column: ColumnDefinition) {
		return this.typeTime(column)
	}

	/**
	 * Create the column definition for a timestamp type.
	 */
	protected typeTimestamp(column: ColumnDefinition) {
		const columnType = column.precision ? `timestamp(${column.precision})` : 'timestamp'
		return column.useCurrent ? `${columnType} default CURRENT_TIMESTAMP` : columnType
	}

	/**
	 * Create the column definition for a timestamp (with time zone) type.
	 */
	protected typeTimestampTz(column: ColumnDefinition) {
		return this.typeTimestamp(column)
	}

	/**
	 * Create the column definition for a year type.
	 */
	protected typeYear(column: ColumnDefinition) {
		return 'year'
	}

	/**
	 * Create the column definition for a binary type.
	 */
	protected typeBinary(column: ColumnDefinition) {
		return 'blob'
	}

	/**
	 * Create the column definition for a uuid type.
	 */
	protected typeUuid(column: ColumnDefinition) {
		return 'char(36)'
	}

	/**
	 * Create the column definition for an IP address type.
	 */
	protected typeIpAddress(column: ColumnDefinition) {
		return 'varchar(45)'
	}

	/**
	 * Create the column definition for a MAC address type.
	 */
	protected typeMacAddress(column: ColumnDefinition) {
		return 'varchar(17)'
	}

	/**
	 * Create the column definition for a spatial Geometry type.
	 */
	typeGeometry(column: ColumnDefinition) {
		return 'geometry'
	}

	/**
	 * Create the column definition for a spatial Point type.
	 */
	typePoint(column: ColumnDefinition) {
		return 'point'
	}

	/**
	 * Create the column definition for a spatial LineString type.
	 */
	typeLineString(column: ColumnDefinition) {
		return 'linestring'
	}

	/**
	 * Create the column definition for a spatial Polygon type.
	 */
	typePolygon(column: ColumnDefinition) {
		return 'polygon'
	}

	/**
	 * Create the column definition for a spatial GeometryCollection type.
	 */
	typeGeometryCollection(column: ColumnDefinition) {
		return 'geometrycollection'
	}

	/**
	 * Create the column definition for a spatial MultiPoint type.
	 */
	typeMultiPoint(column: ColumnDefinition) {
		return 'multipoint'
	}

	/**
	 * Create the column definition for a spatial MultiLineString type.
	 */
	typeMultiLineString(column: ColumnDefinition) {
		return 'multilinestring'
	}

	/**
	 * Create the column definition for a spatial MultiPolygon type.
	 */
	typeMultiPolygon(column: ColumnDefinition) {
		return 'multipolygon'
	}

	/**
	 * Create the column definition for a generated, computed column type.
	 */
	protected typeComputed(column: ColumnDefinition) {
		throw new Error('This database driver requires a type, see the virtualAs / storedAs modifiers.')
	}

	/**
	 * Get the SQL for a generated virtual column modifier.
	 */
	protected modifyVirtualAs(blueprint: Blueprint, column: ColumnDefinition): string {
		if (column.virtualAs) {
			return ` as (${column.virtualAs})`
		}
		return ''
	}

	/**
	 * Get the SQL for a generated stored column modifier.
	 */
	protected modifyStoredAs(blueprint: Blueprint, column: ColumnDefinition): string {
		if (column.storedAs) {
			return ` as (${column.storedAs}) stored`
		}
		return ''
	}

	/**
	 * Get the SQL for an unsigned column modifier.
	 */
	protected modifyUnsigned(blueprint: Blueprint, column: ColumnDefinition): string {
		if (column.unsigned) {
			return ' unsigned'
		}
		return ''
	}

	/**
	 * Get the SQL for a character set column modifier.
	 */
	protected modifyCharset(blueprint: Blueprint, column: ColumnDefinition): string {
		if (column.charset) {
			return ' character set ' + column.charset
		}
		return ''
	}

	/**
	 * Get the SQL for a collation column modifier.
	 */
	protected modifyCollate(blueprint: Blueprint, column: ColumnDefinition): string {
		if (column.collation) {
			return ` collate '${column.collation}'`
		}
		return ''
	}

	/**
	 * Get the SQL for a nullable column modifier.
	 */
	protected modifyNullable(blueprint: Blueprint, column: ColumnDefinition): string {
		if (column.virtualAs === undefined && column.storedAs === undefined) {
			return column.nullable ? ' null' : ' not null'
		}
		return ''
	}

	/**
	 * Get the SQL for a default column modifier.
	 */
	protected modifyDefault(blueprint: Blueprint, column: ColumnDefinition): string {
		if (column.default) {
			return ' default ' + this.getDefaultValue(column.default)
		}
		return ''
	}

	/**
	 * Get the SQL for an auto-increment column modifier.
	 */
	protected modifyIncrement(blueprint: Blueprint, column: ColumnDefinition): string {
		if (column.type && this.serials.indexOf(column.type) > -1 && column.autoIncrement) {
			return ' auto_increment primary key'
		}
		return ''
	}

	/**
	 * Get the SQL for a "first" column modifier.
	 */
	protected modifyFirst(blueprint: Blueprint, column: ColumnDefinition): string {
		if (column.first) {
			return ' first'
		}
		return ''
	}

	/**
	 * Get the SQL for an "after" column modifier.
	 */
	protected modifyAfter(blueprint: Blueprint, column: ColumnDefinition): string {
		if (column.after) {
			return ' after ' + this.wrap(column.after)
		}
		return ''
	}

	/**
	 * Get the SQL for a "comment" column modifier.
	 */
	protected modifyComment(blueprint: Blueprint, column: ColumnDefinition): string {
		if (column.comment) {
			return ` comment '${column.comment.replace(/'/g, "\\'")}'`
		}
		return ''
	}

	/**
	 * Get the SQL for a SRID column modifier.
	 */
	protected modifySrid(blueprint: Blueprint, column: ColumnDefinition): string {
		if (column.srid && typeof column.srid === 'number' && column.srid > 0) {
			return ' srid ' + column.srid
		}
		return ''
	}

	/**
	 * Wrap a single string in keyword identifiers.
	 */
	protected wrapValue(value: string) {
		if (value !== '*') {
			return '`' + value.replace(new RegExp(/\`/g), '``') + '`'
		}
		return value
	}
}
