import { QueryBuilder } from '../QueryBuilder'
import { Expression } from '../Expression';
import { BaseGrammar } from '../../BaseGrammar';

export class QueryGrammar extends BaseGrammar {
	protected operators = []

	protected selectComponents = [
		'aggregate',
		'columns',
		'from',
		'joins',
		'wheres',
		'groups',
		'havings',
		'orders',
		'limit',
		'offset',
		'unions',
		'lock',
	]

	compileSelect(builder: QueryBuilder): string {
		//
	}

	protected compileComponents(query: QueryBuilder): [] {
		//
	}

	protected compileAggregate(query: QueryBuilder, aggregate: any[]): string {
		//
	}

	protected compileColumns(query: QueryBuilder, columns: any[]): string | void {
		//
	}

	protected compileFrom(query: QueryBuilder, table: string): string {
		//
	}

	protected compileJoins(query: QueryBuilder, joins: any[]): string {
		//
	}

	protected compileWheres(query: QueryBuilder): string {
		//
	}

	protected compileWheresToArray(query: QueryBuilder): [] {
		//
	}

	protected concatenateWhereClauses(query: QueryBuilder, sql: string): string {
		//
	}

	protected whereRaw(query: QueryBuilder, where: any[]): string {
		//
	}

	protected whereBasic(query: QueryBuilder, where: any[]): string {
		//
	}

	protected whereIn(query: QueryBuilder, where: any[]): string {
		//
	}

	protected whereNotIn(query: QueryBuilder, where: any[]): string {
		//
	}

	protected whereNotInRaw(query: QueryBuilder, where: any[]): string {
		//
	}

	protected whereInSub(query: QueryBuilder, where: any[]): string {
		//
	}

	protected whereNotInSub(query: QueryBuilder, where: any[]): string {
		//
	}

	protected whereInRaw(query: QueryBuilder, where: any[]): string {
		//
	}

	protected whereNull(query: QueryBuilder, where: any[]): string {
        return this.wrap(where.column).' is null';
    }

    wrap(value: string | Expression, prefixAlias: boolean = false): string {
        if (this.isExpression(value)) {
            return this.getValue(value)
        }

        if (value.toString().indexOf(' as ') !== -1) {
            return this.wrapAliasedValue(value, prefixAlias)

        }

        if (this.isJsonSelector(value)) {
            return this.wrapJsonSelector(value)
        }

        return this.wrapSegments(value.toString().split(.))
    }
}
