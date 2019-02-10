import { SchemaGrammar } from './SchemaGrammar'
import { Blueprint } from '../Blueprint'

export class MySqlSchemaGrammar extends SchemaGrammar {
	// Compile an add column command.
	compileAdd(blueprint: Blueprint, command: any): string {
		const columns = this.prefixArray('add', this.getColumns(blueprint))

		return `alter table ${this.wrapTable(blueprint)} ${columns.join(', ')}`
	}

	// Compile an index creation command.
	protected compileKey(blueprint: Blueprint, command: any, type: string): string {
		return `alter table ${this.wrapTable(blueprint)} add ${type} ${this.wrap(command.index)}${
			command.algorithm ? ` using ${command.algorithm}` : ''
		}(${this.columnize(command.columns)})`
	}
}
