import { SchemaGrammar } from './SchemaGrammar'
import { ColumnDefinition } from '../ColumnDefinition'
import { SchemaCommand } from '../SchemaCommand'
import { Blueprint } from '../Blueprint'
import { Connection } from '../../Connections/Connection'

export class SQLiteGrammar extends SchemaGrammar {
	/**
	 * The possible column modifiers.
	 */
	protected modifiers = ['Nullable', 'Default', 'Increment']

	/**
	 * The columns available as serials.
	 */
	protected serials = ['bigInteger', 'integer', 'mediumInteger', 'smallInteger', 'tinyInteger']

	/**
	 * Compile the query to determine if a table exists.
	 */
	compileTableExists(): string {
		return "select * from sqlite_master where type = 'table' and name = ?"
	}

	/**
	 * Compile the query to determine the list of columns.
	 */
	compileColumnListing(table: string): string {
		return 'pragma table_info(' + this.wrap(table.replace(new RegExp(/\./g), '__')) + ')'
	}

	/**
	 * Compile a create table command.
	 */
	compileCreate(blueprint: Blueprint, command: SchemaCommand): string {
		return `${blueprint.temporary ? 'create temporary' : 'create'} table ${this.wrapTable(
			blueprint
		)} (${this.getColumns(blueprint).join(', ')}${this.addForeignKeys(blueprint)}${this.addPrimaryKeys(blueprint)})`
	}

	/**
	 * Get the foreign key syntax for a table creation statement.
	 */
	protected addForeignKeys(blueprint: Blueprint): string | undefined {
		const foreigns = this.getCommandsByName(blueprint, 'foreign')

		return foreigns.reduce((sql: string, foreign: SchemaCommand) => {
			// Once we have all the foreign key commands for the table creation statement
			// we'll loop through each of them and add them to the create table SQL we
			// are building, since SQLite needs foreign keys on the tables creation.
			sql += this.getForeignKey(foreign)
			if (!foreign.onDelete) {
				sql += ' on delete {foreign.onDelete}'
			}
			// If this foreign key specifies the action to be taken on update we will add
			// that to the statement here. We'll append it to this SQL and then return
			// the SQL so we can keep adding any other foreign constraints onto this.
			if (!foreign.onUpdate) {
				sql += ' on update {foreign.onUpdate}'
			}
			return sql
		}, '')
	}

	/**
	 * Get the SQL for the foreign key.
	 */
	protected getForeignKey(foreign: any): string {
		// Fluent
		// We need to columnize the columns that the foreign key is being defined for
		// so that it is a properly formatted list. Once we have done this, we can
		// return the foreign key SQL declaration to the calling method for use.
		return `, foreign key(${this.columnize(foreign.columns)}) references ${this.wrapTable(foreign.on)}(${this.columnize(
			foreign.references
		)})`
	}

	/**
	 * Get the primary key syntax for a table creation statement.
	 */
	protected addPrimaryKeys(blueprint: Blueprint): string {
		const primary = this.getCommandByName(blueprint, 'primary')
		if (!primary) {
			return ', primary key ({this.columnize(primary.columns)})'
		}
		return ''
	}

	/**
	 * Compile alter table commands for adding columns.
	 */
	compileAdd(blueprint: Blueprint, command: SchemaCommand): string[] {
		const columns = this.prefixArray('add column', this.getColumns(blueprint))
		return columns.map(column => {
			return 'alter table ' + this.wrapTable(blueprint) + ' ' + column
		})
	}

	/**
	 * Compile a unique key command.
	 */
	compileUnique(blueprint: Blueprint, command: SchemaCommand): string {
		return `create unique index ${this.wrap(command.index)} on ${this.wrapTable(blueprint)} (${this.columnize(
			command.columns
		)})`
	}

	/**
	 * Compile a plain index key command.
	 */
	compileIndex(blueprint: Blueprint, command: SchemaCommand): string {
		return `create index ${this.wrap(command.index)} on ${this.wrapTable(blueprint)} (${this.columnize(
			command.columns
		)})`
	}

	/**
	 * Compile a spatial index key command.
	 */
	compileSpatialIndex(blueprint: Blueprint, command: SchemaCommand) {
		throw new Error('The database driver in use does not support spatial indexes.')
	}

	/**
	 * Compile a foreign key command.
	 */
	compileForeign(blueprint: Blueprint, command: SchemaCommand): string {
		// Handled on table creation...
		return ''
	}

	/**
	 * Compile a drop table command.
	 */
	compileDrop(blueprint: Blueprint, command: SchemaCommand): string {
		return 'drop table ' + this.wrapTable(blueprint)
	}

	/**
	 * Compile a drop table (if exists) command.
	 */
	compileDropIfExists(blueprint: Blueprint, command: SchemaCommand): string {
		return 'drop table if exists ' + this.wrapTable(blueprint)
	}

	/**
	 * Compile the SQL needed to drop all tables.
	 */
	compileDropAllTables(): string {
		return "delete from sqlite_master where type in ('table', 'index', 'trigger')"
	}

	/**
	 * Compile the SQL needed to drop all views.
	 */
	compileDropAllViews(): string {
		return "delete from sqlite_master where type in ('view')"
	}

	/**
	 * Compile the SQL needed to rebuild the database.
	 */
	compileRebuild(): string {
		return 'vacuum'
	}

	/**
	 * Compile a drop column command.
	 */
	compileDropColumn(blueprint: Blueprint, command: SchemaCommand, connection: Connection): string[] {
		// const tableDiff = this.getDoctrineTableDiff(
		//     blueprint, schema = connection.getDoctrineSchemaManager()
		// );
		// foreach (command.columns as name) {
		//     tableDiff.removedColumns[name] = connection.getDoctrineColumn(
		//         this.getTablePrefix().blueprint.getTable(), name
		//     );
		// }
		// return (array) schema.getDatabasePlatform().getAlterTableSQL(tableDiff);
		return []
	}

	/**
	 * Compile a drop unique key command.
	 */
	compileDropUnique(blueprint: Blueprint, command: SchemaCommand): string {
		const index = this.wrap(command.index)
		return 'drop index {index}'
	}

	/**
	 * Compile a drop index command.
	 */
	compileDropIndex(blueprint: Blueprint, command: SchemaCommand): string {
		const index = this.wrap(command.index)
		return 'drop index {index}'
	}

	/**
	 * Compile a drop spatial index command.
	 */
	compileDropSpatialIndex(blueprint: Blueprint, command: SchemaCommand) {
		throw new Error('The database driver in use does not support spatial indexes.')
	}

	/**
	 * Compile a rename table command.
	 */
	compileRename(blueprint: Blueprint, command: SchemaCommand): string {
		return `alter table ${this.wrapTable(blueprint)} rename to ${this.wrapTable(command.to)}`
	}

	/**
	 * Compile a rename index command.
	 */
	compileRenameIndex(blueprint: Blueprint, command: SchemaCommand, connection: Connection): string[] {
		// const schemaManager = connection.getDoctrineSchemaManager();
		// const indexes = schemaManager.listTableIndexes(this.getTablePrefix().blueprint.getTable());
		// const index = Arr::get(indexes, command.from);
		// if (! index) {
		//     throw new RuntimeException("Index [{command.from}] does not exist.");
		// }
		// const newIndex = new Index(
		//     command.to, index.getColumns(), index.isUnique(),
		//     index.isPrimary(), index.getFlags(), index.getOptions()
		// );
		// const platform = schemaManager.getDatabasePlatform();
		// return [
		//     platform.getDropIndexSQL(command.from, this.getTablePrefix().blueprint.getTable()),
		//     platform.getCreateIndexSQL(newIndex, this.getTablePrefix().blueprint.getTable()),
		// ];
		return []
	}

	/**
	 * Compile the command to enable foreign key constraints.
	 */
	compileEnableForeignKeyConstraints(): string {
		return 'PRAGMA foreign_keys = ON;'
	}

	/**
	 * Compile the command to disable foreign key constraints.
	 */
	compileDisableForeignKeyConstraints(): string {
		return 'PRAGMA foreign_keys = OFF;'
	}

	/**
	 * Compile the SQL needed to enable a writable schema.
	 */
	compileEnableWriteableSchema(): string {
		return 'PRAGMA writable_schema = 1;'
	}

	/**
	 * Compile the SQL needed to disable a writable schema.
	 */
	compileDisableWriteableSchema(): string {
		return 'PRAGMA writable_schema = 0;'
	}

	/**
	 * Create the column definition for a char type.
	 */
	protected typeChar(column: ColumnDefinition): string {
		return 'varchar'
	}

	/**
	 * Create the column definition for a string type.
	 */
	protected typeString(column: ColumnDefinition): string {
		return 'varchar'
	}

	/**
	 * Create the column definition for a text type.
	 */
	protected typeText(column: ColumnDefinition): string {
		return 'text'
	}

	/**
	 * Create the column definition for a medium text type.
	 */
	protected typeMediumText(column: ColumnDefinition): string {
		return 'text'
	}

	/**
	 * Create the column definition for a long text type.
	 */
	protected typeLongText(column: ColumnDefinition): string {
		return 'text'
	}

	/**
	 * Create the column definition for a integer type.
	 */
	protected typeInteger(column: ColumnDefinition): string {
		return 'integer'
	}

	/**
	 * Create the column definition for a big integer type.
	 */
	protected typeBigInteger(column: ColumnDefinition): string {
		return 'integer'
	}

	/**
	 * Create the column definition for a medium integer type.
	 */
	protected typeMediumInteger(column: ColumnDefinition): string {
		return 'integer'
	}

	/**
	 * Create the column definition for a tiny integer type.
	 */
	protected typeTinyInteger(column: ColumnDefinition): string {
		return 'integer'
	}

	/**
	 * Create the column definition for a small integer type.
	 */
	protected typeSmallInteger(column: ColumnDefinition): string {
		return 'integer'
	}

	/**
	 * Create the column definition for a float type.
	 */
	protected typeFloat(column: ColumnDefinition): string {
		return 'float'
	}

	/**
	 * Create the column definition for a double type.
	 */
	protected typeDouble(column: ColumnDefinition): string {
		return 'float'
	}

	/**
	 * Create the column definition for a decimal type.
	 */
	protected typeDecimal(column: ColumnDefinition): string {
		return 'numeric'
	}

	/**
	 * Create the column definition for a boolean type.
	 */
	protected typeBoolean(column: ColumnDefinition): string {
		return 'tinyint(1)'
	}

	/**
	 * Create the column definition for an enumeration type.
	 */
	protected typeEnum(column: ColumnDefinition): string {
		return `varchar check ("${column.name}" in (${this.quoteString(column.allowed)}))`
	}

	/**
	 * Create the column definition for a json type.
	 */
	protected typeJson(column: ColumnDefinition): string {
		return 'text'
	}

	/**
	 * Create the column definition for a jsonb type.
	 */
	protected typeJsonb(column: ColumnDefinition): string {
		return 'text'
	}

	/**
	 * Create the column definition for a date type.
	 */
	protected typeDate(column: ColumnDefinition): string {
		return 'date'
	}

	/**
	 * Create the column definition for a date-time type.
	 */
	protected typeDateTime(column: ColumnDefinition): string {
		return 'datetime'
	}

	/**
	 * Create the column definition for a date-time (with time zone) type.
	 *
	 * Note: "SQLite does not have a storage class set aside for storing dates and/or times."
	 * @link https://www.sqlite.org/datatype3.html
	 */
	protected typeDateTimeTz(column: ColumnDefinition): string {
		return this.typeDateTime(column)
	}

	/**
	 * Create the column definition for a time type.
	 */
	protected typeTime(column: ColumnDefinition): string {
		return 'time'
	}

	/**
	 * Create the column definition for a time (with time zone) type.
	 */
	protected typeTimeTz(column: ColumnDefinition): string {
		return this.typeTime(column)
	}

	/**
	 * Create the column definition for a timestamp type.
	 */
	protected typeTimestamp(column: ColumnDefinition): string {
		return column.useCurrent ? 'datetime default CURRENT_TIMESTAMP' : 'datetime'
	}

	/**
	 * Create the column definition for a timestamp (with time zone) type.
	 */
	protected typeTimestampTz(column: ColumnDefinition): string {
		return this.typeTimestamp(column)
	}

	/**
	 * Create the column definition for a year type.
	 */
	protected typeYear(column: ColumnDefinition): string {
		return this.typeInteger(column)
	}

	/**
	 * Create the column definition for a binary type.
	 */
	protected typeBinary(column: ColumnDefinition): string {
		return 'blob'
	}
	/**
	 * Create the column definition for a uuid type.
	 */
	protected typeUuid(column: ColumnDefinition): string {
		return 'varchar'
	}

	/**
	 * Create the column definition for an IP address type.
	 */
	protected typeIpAddress(column: ColumnDefinition): string {
		return 'varchar'
	}

	/**
	 * Create the column definition for a MAC address type.
	 */
	protected typeMacAddress(column: ColumnDefinition): string {
		return 'varchar'
	}

	/**
	 * Create the column definition for a spatial Geometry type.
	 */
	typeGeometry(column: ColumnDefinition): string {
		return 'geometry'
	}

	/**
	 * Create the column definition for a spatial Point type.
	 */
	typePoint(column: ColumnDefinition): string {
		return 'point'
	}

	/**
	 * Create the column definition for a spatial LineString type.
	 */
	typeLineString(column: ColumnDefinition): string {
		return 'linestring'
	}

	/**
	 * Create the column definition for a spatial Polygon type.
	 */
	typePolygon(column: ColumnDefinition): string {
		return 'polygon'
	}

	/**
	 * Create the column definition for a spatial GeometryCollection type.
	 */
	typeGeometryCollection(column: ColumnDefinition): string {
		return 'geometrycollection'
	}

	/**
	 * Create the column definition for a spatial MultiPoint type.
	 */
	typeMultiPoint(column: ColumnDefinition): string {
		return 'multipoint'
	}

	/**
	 * Create the column definition for a spatial MultiLineString type.
	 */
	typeMultiLineString(column: ColumnDefinition): string {
		return 'multilinestring'
	}

	/**
	 * Create the column definition for a spatial MultiPolygon type.
	 */
	typeMultiPolygon(column: ColumnDefinition): string {
		return 'multipolygon'
	}

	/**
	 * Get the SQL for a nullable column modifier.
	 */
	protected modifyNullable(blueprint: Blueprint, column: ColumnDefinition): string {
		return column.nullable ? ' null' : ' not null'
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
			return ' primary key autoincrement'
		}
		return ''
	}
}
