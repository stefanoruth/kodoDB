import { SchemaGrammar } from './SchemaGrammar'
import { Blueprint } from '../Blueprint'
import { Connection } from '../../Connections/Connection'

export class ChangeColumn {
	static compile(grammar: SchemaGrammar, blueprint: Blueprint, command: any, connection: Connection): string[] {
		return []
	}
}
