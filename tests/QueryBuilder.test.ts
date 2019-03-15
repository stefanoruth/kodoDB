import { QueryBuilder, JoinClause } from '../src/Query/QueryBuilder'
import { QueryGrammar } from '../src/Query/Grammars/QueryGrammar'
import { QueryProcessor } from '../src/Query/Processors/QueryProcessor'
import { Mock } from 'ts-mockery'
import { Connection } from '../src/Connections/Connection'
import { Expression } from '../src/Query/Expression'

function getBuilder() {
	const grammar = new QueryGrammar()
	const processor = Mock.of<QueryProcessor>({
		processSelect: jest.fn(),
	})
	const connection = Mock.of<Connection>({
		select: jest.fn(),
	})

	return Mock.from<QueryBuilder>(new QueryBuilder(connection, grammar, processor))
}

function assertEquals(result: any, response: any) {
	expect(response).toEqual(result)
}

let builder: QueryBuilder

beforeEach(() => {
	builder = getBuilder()
})

describe('QueryBuilder', () => {
	test('basicSelect', () => {
		builder.select('*').from('users')
		expect(builder.toSql()).toBe('SELECT * FROM "users"')
	})

	test('basicSelectWithGetColumns', () => {
		// expect(builder.getProcessor().processSelect).toBeCalled()
		// expect(builder.getConnection().select).toBeCalledTimes(1)

		//         builder-> getProcessor().shouldReceive('processSelect');
		// builder.getConnection().shouldReceive('select').once().andReturnUsing(function (sql) {
		//     assertEquals('select * from "users"', sql);
		// });
		// builder.getConnection().shouldReceive('select').once().andReturnUsing(function (sql) {
		//     assertEquals('select "foo", "bar" from "users"', sql);
		// });
		// builder.getConnection().shouldReceive('select').once().andReturnUsing(function (sql) {
		//     assertEquals('select "baz" from "users"', sql);
		// });
		builder.from('users').get()
		expect(builder.queryObj.columns).toEqual([])

		builder.from('users').get(['foo', 'bar'])
		expect(builder.queryObj.columns).toEqual([])

		builder.from('users').get('baz')
		expect(builder.queryObj.columns).toEqual([])

		expect(builder.toSql()).toBe('SELECT * FROM "users"')
		expect(builder.queryObj.columns).toEqual([])
	})

	test('basicTableWrappingProtectsQuotationMarks', () => {
		builder.select('*').from('some"table')
		expect(builder.toSql()).toBe('SELECT * FROM "some""table"')
	})

	test('aliasWrappingAsWholeConstant', () => {
		builder.select('x.y as foo.bar').from('baz')
		expect(builder.toSql()).toBe('SELECT "x"."y" AS "foo.bar" FROM "baz"')
	})

	test('aliasWrappingWithSpacesInDatabaseName', () => {
		builder.select('w x.y.z as foo.bar').from('baz')
		expect(builder.toSql()).toBe('SELECT "w x"."y"."z" AS "foo.bar" FROM "baz"')
	})

	test('addingSelects', () => {
		builder
			.select('foo')
			.addSelect('bar')
			.addSelect(['baz', 'boom'])
			.from('users')
		expect(builder.toSql()).toBe('SELECT "foo", "bar", "baz", "boom" FROM "users"')
	})

	test('basicSelectWithPrefix', () => {
		builder.getGrammar().setTablePrefix('prefix_')
		builder.select('*').from('users')
		expect(builder.toSql()).toBe('SELECT * FROM "prefix_users"')
	})

	test('basicSelectDistinct', () => {
		builder
			.distinct()
			.select('foo', 'bar')
			.from('users')
		expect(builder.toSql()).toBe('SELECT DISTINCT "foo", "bar" FROM "users"')
	})

	test('basicAlias', () => {
		builder.select('foo as bar').from('users')
		expect(builder.toSql()).toBe('SELECT "foo" AS "bar" FROM "users"')
	})

	test('aliasWithPrefix', () => {
		builder.getGrammar().setTablePrefix('prefix_')
		builder.select('*').from('users as people')
		expect(builder.toSql()).toBe('SELECT * FROM "prefix_users" AS "prefix_people"')
	})

	test('joinAliasesWithPrefix', () => {
		builder.getGrammar().setTablePrefix('prefix_')
		builder
			.select('*')
			.from('services')
			.join('translations AS t', 't.item_id', '=', 'services.id')

		expect(builder.toSql()).toBe(
			'SELECT * FROM "prefix_services" INNER JOIN "prefix_translations" AS "prefix_t" ON "prefix_t"."item_id" = "prefix_services"."id"'
		)
	})

	test('basicTableWrapping', () => {
		builder.select('*').from('public.users')
		expect(builder.toSql()).toBe('SELECT * FROM "public"."users"')
	})

	test('whenCallback', () => {
		const callback = (query: any, condition: boolean) => {
			expect(condition).toBeTruthy()
			query.where('id', '=', 1)
		}

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.when(true, callback)
			.where('email', 'foo')
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" = ? AND "email" = ?')

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.when(false, callback)
			.where('email', 'foo')
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "email" = ?')
	})

	test('whenCallbackWithReturn', () => {
		const callback = (query: QueryBuilder, condition: any) => {
			expect(condition).toBeTruthy()
			return query.where('id', '=', 1)
		}

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.when(true, callback)
			.where('email', 'foo')
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" = ? AND "email" = ?')

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.when(false, callback)
			.where('email', 'foo')
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "email" = ?')
	})

	test('whenCallbackWithDefault', () => {
		const callback = (query: QueryBuilder, condition: any) => {
			expect(condition).toBeTruthy()
			query.where('id', '=', 1)
		}
		const defaultValue = (query: QueryBuilder, condition: any) => {
			expect(condition).toBeFalsy()
			query.where('id', '=', 2)
		}

		builder = getBuilder()
			.select('*')
			.from('users')
			.when('truthy', callback, defaultValue)
			.where('email', 'foo')
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" = ? AND "email" = ?')
		expect(builder.getBindings()).toEqual([1, 'foo'])

		builder = getBuilder()
			.select('*')
			.from('users')
			.when(0, callback, defaultValue)
			.where('email', 'foo')
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" = ? AND "email" = ?')
		expect(builder.getBindings()).toEqual([2, 'foo'])
	})

	test('unlessCallback', () => {
		const callback = (query: QueryBuilder, condition: any) => {
			expect(condition).toBeFalsy()
			query.where('id', '=', 1)
		}

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.unless(false, callback)
			.where('email', 'foo')
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" = ? AND "email" = ?')

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.unless(true, callback)
			.where('email', 'foo')
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "email" = ?')
	})

	test('unlessCallbackWithReturn', () => {
		const callback = (query: QueryBuilder, condition: any) => {
			expect(condition).toBeFalsy()
			return query.where('id', '=', 1)
		}

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.unless(false, callback)
			.where('email', 'foo')
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" = ? AND "email" = ?')

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.unless(true, callback)
			.where('email', 'foo')
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "email" = ?')
	})

	test('unlessCallbackWithDefault', () => {
		const callback = (query: QueryBuilder, condition: any) => {
			expect(condition).toBeFalsy()
			query.where('id', '=', 1)
		}
		const defaultValue = (query: QueryBuilder, condition: any) => {
			expect(condition).toBeTruthy()
			query.where('id', '=', 2)
		}

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.unless(0, callback, defaultValue)
			.where('email', 'foo')
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" = ? AND "email" = ?')
		expect(builder.getBindings()).toEqual([1, 'foo'])

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.unless('truthy', callback, defaultValue)
			.where('email', 'foo')
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" = ? AND "email" = ?')
		expect(builder.getBindings()).toEqual([2, 'foo'])
	})

	test('tapCallback', () => {
		const callback = (query: QueryBuilder) => {
			return query.where('id', '=', 1)
		}

		builder
			.select('*')
			.from('users')
			.tap(callback)
			.where('email', 'foo')
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" = ? AND "email" = ?')
	})

	test('basicWheres', () => {
		builder
			.select('*')
			.from('users')
			.where('id', '=', 1)
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" = ?')
		expect(builder.getBindings()).toEqual([1])
	})

	test('dateBasedWheresExpressionIsNotBound', () => {
		builder
			.select('*')
			.from('users')
			.whereDate('created_at', new Expression('NOW()'))
			.where('admin', true)
		expect(builder.getBindings()).toEqual([true])
	})

	test('whereBetweens', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.whereBetween('id', [1, 2])
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" BETWEEN ? AND ?')
		expect(builder.getBindings()).toEqual([1, 2])

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.whereNotBetween('id', [1, 2])
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" NOT BETWEEN ? AND ?')
		expect(builder.getBindings()).toEqual([1, 2])

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.whereBetween('id', [new Expression(1), new Expression(2)])
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" BETWEEN 1 AND 2')
		expect(builder.getBindings()).toEqual([])
	})

	test('BasicOrWheres', () => {
		builder
			.select('*')
			.from('users')
			.where('id', '=', 1)
			.orWhere('email', '=', 'foo')
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" = ? OR "email" = ?')
		expect(builder.getBindings()).toEqual([1, 'foo'])
	})

	test('RawWheres', () => {
		builder
			.select('*')
			.from('users')
			.whereRaw('id = ? or email = ?', [1, 'foo'])
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE id = ? or email = ?')
		expect(builder.getBindings()).toEqual([1, 'foo'])
	})

	test('RawOrWheres', () => {
		builder
			.select('*')
			.from('users')
			.where('id', '=', 1)
			.orWhereRaw('email = ?', ['foo'])
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" = ? OR email = ?')
		expect(builder.getBindings()).toEqual([1, 'foo'])
	})

	test('BasicWhereIns', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.whereIn('id', [1, 2, 3])
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" IN (?, ?, ?)')
		expect(builder.getBindings()).toEqual([1, 2, 3])

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.where('id', '=', 1)
			.orWhereIn('id', [1, 2, 3])
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" = ? OR "id" IN (?, ?, ?)')
		expect(builder.getBindings()).toEqual([1, 1, 2, 3])
	})

	test('BasicWhereNotIns', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.whereNotIn('id', [1, 2, 3])

		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" NOT IN (?, ?, ?)')
		expect(builder.getBindings()).toEqual([1, 2, 3])

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.where('id', '=', 1)
			.orWhereNotIn('id', [1, 2, 3])

		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" = ? OR "id" NOT IN (?, ?, ?)')
		expect(builder.getBindings()).toEqual([1, 1, 2, 3])
	})

	test('RawWhereIns', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.whereIn('id', [new Expression(1)])
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" IN (1)')

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.where('id', '=', 1)
			.orWhereIn('id', [new Expression(1)])
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" = ? OR "id" IN (1)')
		expect(builder.getBindings()).toEqual([1])
	})

	test('EmptyWhereIns', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.whereIn('id', [])
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE 0 = 1')
		expect(builder.getBindings()).toEqual([])

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.where('id', '=', 1)
			.orWhereIn('id', [])
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" = ? OR 0 = 1')
		expect(builder.getBindings()).toEqual([1])
	})

	test('EmptyWhereNotIns', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.whereNotIn('id', [])
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE 1 = 1')
		expect(builder.getBindings()).toEqual([])

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.where('id', '=', 1)
			.orWhereNotIn('id', [])
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" = ? OR 1 = 1')
		expect(builder.getBindings()).toEqual([1])
	})

	test('WhereIntegerInRaw', () => {
		builder
			.select('*')
			.from('users')
			.whereIntegerInRaw('id', ['1a', 2])
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" IN (1, 2)')
		expect(builder.getBindings()).toEqual([])
	})

	test('WhereIntegerNotInRaw', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.whereIntegerNotInRaw('id', ['1a', 2])
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" NOT IN (1, 2)')
		expect(builder.getBindings()).toEqual([])
	})

	test('EmptyWhereIntegerInRaw', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.whereIntegerInRaw('id', [])
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE 0 = 1')
		expect(builder.getBindings()).toEqual([])
	})

	test('EmptyWhereIntegerNotInRaw', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.whereIntegerNotInRaw('id', [])
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE 1 = 1')
		expect(builder.getBindings()).toEqual([])
	})

	test('BasicWhereColumn', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.whereColumn('first_name', 'last_name')
			.orWhereColumn('first_name', 'middle_name')
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" WHERE "first_name" = "last_name" OR "first_name" = "middle_name"'
		)
		expect(builder.getBindings()).toEqual([])

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.whereColumn('updated_at', '>', 'created_at')
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "updated_at" > "created_at"')
		expect(builder.getBindings()).toEqual([])
	})

	test('ArrayWhereColumn', () => {
		const conditions = [['first_name', 'last_name'], ['updated_at', '>', 'created_at']]
		builder
			.select('*')
			.from('users')
			.whereColumn(conditions)
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" WHERE ("first_name" = "last_name" AND "updated_at" > "created_at")'
		)
		expect(builder.getBindings()).toEqual([])
	})

	test('unions', () => {
		builder
			.select('*')
			.from('users')
			.where('id', '=', 1)
		builder.union(
			getBuilder()
				.select('*')
				.from('users')
				.where('id', '=', 2)
		)
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" = ? UNION SELECT * FROM "users" WHERE "id" = ?')
		expect(builder.getBindings()).toEqual([1, 2])
	})

	test('unionAlls', () => {
		builder
			.select('*')
			.from('users')
			.where('id', '=', 1)
		builder.unionAll(
			getBuilder()
				.select('*')
				.from('users')
				.where('id', '=', 2)
		)
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" = ? UNION ALL SELECT * FROM "users" WHERE "id" = ?')
		expect(builder.getBindings()).toEqual([1, 2])
	})

	test('MultipleUnions', () => {
		builder
			.select('*')
			.from('users')
			.where('id', '=', 1)
		builder.union(
			getBuilder()
				.select('*')
				.from('users')
				.where('id', '=', 2)
		)
		builder.union(
			getBuilder()
				.select('*')
				.from('users')
				.where('id', '=', 3)
		)
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" WHERE "id" = ? UNION SELECT * FROM "users" WHERE "id" = ? UNION SELECT * FROM "users" WHERE "id" = ?'
		)
		expect(builder.getBindings()).toEqual([1, 2, 3])
	})

	test('MultipleUnionAlls', () => {
		builder
			.select('*')
			.from('users')
			.where('id', '=', 1)
		builder.unionAll(
			getBuilder()
				.select('*')
				.from('users')
				.where('id', '=', 2)
		)
		builder.unionAll(
			getBuilder()
				.select('*')
				.from('users')
				.where('id', '=', 3)
		)

		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" WHERE "id" = ? UNION ALL SELECT * FROM "users" WHERE "id" = ? UNION ALL SELECT * FROM "users" WHERE "id" = ?'
		)
		expect(builder.getBindings()).toEqual([1, 2, 3])
	})

	test('UnionOrderBys', () => {
		builder
			.select('*')
			.from('users')
			.where('id', '=', 1)
		builder.union(
			getBuilder()
				.select('*')
				.from('users')
				.where('id', '=', 2)
		)
		builder.orderBy('id', 'desc')
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" WHERE "id" = ? UNION SELECT * FROM "users" WHERE "id" = ? ORDER BY "id" DESC'
		)
		expect(builder.getBindings()).toEqual([1, 2])
	})

	test('UnionLimitsAndOffsets', () => {
		builder.select('*').from('users')
		builder.union(
			getBuilder()
				.select('*')
				.from('dogs')
		)
		builder.skip(5).take(10)
		expect(builder.toSql()).toBe('SELECT * FROM "users" UNION SELECT * FROM "dogs" LIMIT 10 OFFSET 5')
	})

	test('UnionWithJoin', () => {
		builder.select('*').from('users')
		builder.union(
			getBuilder()
				.select('*')
				.from('dogs')
				.join('breeds', (join: any) => {
					join.on('dogs.breed_id', '=', 'breeds.id').where('breeds.is_native', '=', 1)
				})
		)
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" UNION SELECT * FROM "dogs" INNER JOIN "breeds" ON "dogs"."breed_id" = "breeds"."id" AND "breeds"."is_native" = ?'
		)
		expect(builder.getBindings()).toEqual([1])
	})

	test('SubSelectWhereIns', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.whereIn('id', (q: QueryBuilder) => {
				q.select('id')
					.from('users')
					.where('age', '>', 25)
					.take(3)
			})
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" WHERE "id" IN (SELECT "id" FROM "users" WHERE "age" > ? LIMIT 3)'
		)
		expect(builder.getBindings()).toEqual([25])

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.whereNotIn('id', (q: QueryBuilder) => {
				q.select('id')
					.from('users')
					.where('age', '>', 25)
					.take(3)
			})
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" WHERE "id" NOT IN (SELECT "id" FROM "users" WHERE "age" > ? LIMIT 3)'
		)
		expect(builder.getBindings()).toEqual([25])
	})

	test('BasicWhereNulls', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.whereNull('id')
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" IS NULL')
		expect(builder.getBindings()).toEqual([])
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.where('id', '=', 1)
			.orWhereNull('id')
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" = ? OR "id" IS NULL')
		expect(builder.getBindings()).toEqual([1])
	})

	test('BasicWhereNotNulls', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.whereNotNull('id')
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" IS NOT NULL')
		expect(builder.getBindings()).toEqual([])
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.where('id', '>', 1)
			.orWhereNotNull('id')
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" > ? OR "id" IS NOT NULL')
		expect(builder.getBindings()).toEqual([1])
	})

	test('GroupBys', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.groupBy('email')
		expect(builder.toSql()).toBe('SELECT * FROM "users" GROUP BY "email"')

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.groupBy('id', 'email')
		expect(builder.toSql()).toBe('SELECT * FROM "users" GROUP BY "id", "email"')

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.groupBy(['id', 'email'])
		expect(builder.toSql()).toBe('SELECT * FROM "users" GROUP BY "id", "email"')

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.groupBy(new Expression('DATE(created_at)'))
		expect(builder.toSql()).toBe('SELECT * FROM "users" GROUP BY DATE(created_at)')
	})

	test('OrderBys', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.orderBy('email')
			.orderBy('age', 'desc')
		expect(builder.toSql()).toBe('SELECT * FROM "users" ORDER BY "email" ASC, "age" DESC')
		builder.queryObj.orders = []
		expect(builder.toSql()).toBe('SELECT * FROM "users"')

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.orderBy('email')
			.orderByRaw('"age" ? desc', ['foo'])
		expect(builder.toSql()).toBe('SELECT * FROM "users" ORDER BY "email" ASC, "age" ? desc')
		expect(builder.getBindings()).toEqual(['foo'])

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.orderByDesc('name')
		expect(builder.toSql()).toBe('SELECT * FROM "users" ORDER BY "name" DESC')
	})

	test('Havings', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.having('email', '>', 1)
		expect(builder.toSql()).toBe('SELECT * FROM "users" HAVING "email" > ?')

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.orHaving('email', '=', 'test@example.com')
			.orHaving('email', '=', 'test@example.com')
		expect(builder.toSql()).toBe('SELECT * FROM "users" HAVING "email" = ? OR "email" = ?')

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.groupBy('email')
			.having('email', '>', 1)
		expect(builder.toSql()).toBe('SELECT * FROM "users" GROUP BY "email" HAVING "email" > ?')

		builder = getBuilder()
		builder
			.select('email as foo_email')
			.from('users')
			.having('foo_email', '>', 1)
		expect(builder.toSql()).toBe('SELECT "email" AS "foo_email" FROM "users" HAVING "foo_email" > ?')

		builder = getBuilder()
		builder
			.select(['category', new Expression('count(*) as "total"')])
			.from('item')
			.where('department', '=', 'popular')
			.groupBy('category')
			.having('total', '>', new Expression('3'))
		// expect(builder.toSql()).toBe(
		// 	'SELECT "category", count(*) as "total" FROM "item" WHERE "department" = ? GROUP BY "category" HAVING "total" > 3'
		// )

		builder = getBuilder()
		builder
			.select(['category', new Expression('count(*) as "total"')])
			.from('item')
			.where('department', '=', 'popular')
			.groupBy('category')
			.having('total', '>', 3)
		expect(builder.toSql()).toBe(
			'SELECT "category", count(*) as "total" FROM "item" WHERE "department" = ? GROUP BY "category" HAVING "total" > ?'
		)

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.havingBetween('last_login_date', ['2018-11-16', '2018-12-16'])
		expect(builder.toSql()).toBe('SELECT * FROM "users" HAVING "last_login_date" BETWEEN ? AND ?')
	})

	test('HavingShortcut', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.having('email', 1)
			.orHaving('email', 2)
		expect(builder.toSql()).toBe('SELECT * FROM "users" HAVING "email" = ? OR "email" = ?')
	})

	test('RawHavings', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.havingRaw('user_foo < user_bar')
		expect(builder.toSql()).toBe('SELECT * FROM "users" HAVING user_foo < user_bar')

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.having('baz', '=', 1)
			.orHavingRaw('user_foo < user_bar')
		expect(builder.toSql()).toBe('SELECT * FROM "users" HAVING "baz" = ? OR user_foo < user_bar')

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.havingBetween('last_login_date', ['2018-11-16', '2018-12-16'])
			.orHavingRaw('user_foo < user_bar')
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" HAVING "last_login_date" BETWEEN ? AND ? OR user_foo < user_bar'
		)
	})

	test('LimitsAndOffsets', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.offset(5)
			.limit(10)
		expect(builder.toSql()).toBe('SELECT * FROM "users" LIMIT 10 OFFSET 5')

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.skip(5)
			.take(10)
		expect(builder.toSql()).toBe('SELECT * FROM "users" LIMIT 10 OFFSET 5')

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.skip(0)
			.take(0)
		expect(builder.toSql()).toBe('SELECT * FROM "users" LIMIT 0 OFFSET 0')

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.skip(-5)
			.take(-10)
		expect(builder.toSql()).toBe('SELECT * FROM "users" OFFSET 0')
	})

	test('ForPage', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.forPage(2, 15)
		expect(builder.toSql()).toBe('SELECT * FROM "users" LIMIT 15 OFFSET 15')

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.forPage(0, 15)
		expect(builder.toSql()).toBe('SELECT * FROM "users" LIMIT 15 OFFSET 0')

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.forPage(-2, 15)
		expect(builder.toSql()).toBe('SELECT * FROM "users" LIMIT 15 OFFSET 0')

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.forPage(2, 0)
		expect(builder.toSql()).toBe('SELECT * FROM "users" LIMIT 0 OFFSET 0')

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.forPage(0, 0)
		expect(builder.toSql()).toBe('SELECT * FROM "users" LIMIT 0 OFFSET 0')

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.forPage(-2, 0)
		expect(builder.toSql()).toBe('SELECT * FROM "users" LIMIT 0 OFFSET 0')
	})

	test('WhereShortcut', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.where('id', 1)
			.orWhere('name', 'foo')
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "id" = ? OR "name" = ?')
		expect(builder.getBindings()).toEqual([1, 'foo'])
	})

	// test('WhereWithArrayConditions', () => {
	//     builder = getBuilder();
	//     builder.select('*').from('users').where([['foo', 1], ['bar', 2]]);
	//     expect(builder.toSql()).toBe('select * from "users" where ("foo" = ? and "bar" = ?)')
	//     expect(builder.getBindings()).toEqual([1, 2])

	//     builder = getBuilder();
	//     builder.select('*').from('users').where(['foo' => 1, 'bar' => 2]);
	//     expect(builder.toSql()).toBe('select * from "users" where ("foo" = ? and "bar" = ?)')
	//     expect(builder.getBindings()).toEqual([1, 2])

	//     builder = getBuilder();
	//     builder.select('*').from('users').where([['foo', 1], ['bar', '<', 2]]);
	//     expect(builder.toSql()).toBe('select * from "users" where ("foo" = ? and "bar" < ?)')
	//     expect(builder.getBindings()).toEqual([1, 2])
	// })

	test('NestedWheres', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.where('email', '=', 'foo')
			.orWhere(q => {
				q.where('name', '=', 'bar').where('age', '=', 25)
			})
		expect(builder.toSql()).toBe('SELECT * FROM "users" WHERE "email" = ? OR ("name" = ? AND "age" = ?)')
		expect(builder.getBindings()).toEqual(['foo', 'bar', 25])
	})

	test('NestedWhereBindings', () => {
		builder = getBuilder()
		builder.where('email', '=', 'foo').where(q => {
			q.selectRaw('?', ['ignore']).where('name', '=', 'bar')
		})
		expect(builder.getBindings()).toEqual(['foo', 'bar'])
	})

	test('FullSubSelects', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.where('email', '=', 'foo')
			.orWhere('id', '=', (q: any) => {
				q.select(new Expression('max(id)'))
					.from('users')
					.where('email', '=', 'bar')
			})
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" WHERE "email" = ? OR "id" = (SELECT max(id) FROM "users" WHERE "email" = ?)'
		)
		expect(builder.getBindings()).toEqual(['foo', 'bar'])
	})

	test('WhereExists', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('orders')
			.whereExists(q => {
				q.select('*')
					.from('products')
					.where('products.id', '=', new Expression('"orders"."id"'))
			})
		expect(builder.toSql()).toBe(
			'SELECT * FROM "orders" WHERE EXISTS (SELECT * FROM "products" WHERE "products"."id" = "orders"."id")'
		)

		builder = getBuilder()
		builder
			.select('*')
			.from('orders')
			.whereNotExists(q => {
				q.select('*')
					.from('products')
					.where('products.id', '=', new Expression('"orders"."id"'))
			})
		expect(builder.toSql()).toBe(
			'SELECT * FROM "orders" WHERE NOT EXISTS (SELECT * FROM "products" WHERE "products"."id" = "orders"."id")'
		)

		builder = getBuilder()
		builder
			.select('*')
			.from('orders')
			.where('id', '=', 1)
			.orWhereExists(q => {
				q.select('*')
					.from('products')
					.where('products.id', '=', new Expression('"orders"."id"'))
			})
		expect(builder.toSql()).toBe(
			'SELECT * FROM "orders" WHERE "id" = ? OR EXISTS (SELECT * FROM "products" WHERE "products"."id" = "orders"."id")'
		)

		builder = getBuilder()
		builder
			.select('*')
			.from('orders')
			.where('id', '=', 1)
			.orWhereNotExists(q => {
				q.select('*')
					.from('products')
					.where('products.id', '=', new Expression('"orders"."id"'))
			})
		expect(builder.toSql()).toBe(
			'SELECT * FROM "orders" WHERE "id" = ? OR NOT EXISTS (SELECT * FROM "products" WHERE "products"."id" = "orders"."id")'
		)
	})

	test('BasicJoins', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.join('contacts', 'users.id', 'contacts.id')
		expect(builder.toSql()).toBe('SELECT * FROM "users" INNER JOIN "contacts" ON "users"."id" = "contacts"."id"')

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.join('contacts', 'users.id', '=', 'contacts.id')
			.leftJoin('photos', 'users.id', '=', 'photos.id')
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" INNER JOIN "contacts" ON "users"."id" = "contacts"."id" LEFT JOIN "photos" ON "users"."id" = "photos"."id"'
		)

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.leftJoinWhere('photos', 'users.id', '=', 'bar')
			.joinWhere('photos', 'users.id', '=', 'foo')
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" LEFT JOIN "photos" ON "users"."id" = ? INNER JOIN "photos" ON "users"."id" = ?'
		)
		expect(builder.getBindings()).toEqual(['bar', 'foo'])
	})

	test('CrossJoins', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('sizes')
			.crossJoin('colors')
		expect(builder.toSql()).toBe('SELECT * FROM "sizes" CROSS JOIN "colors"')

		builder = getBuilder()
		builder
			.select('*')
			.from('tableB')
			.join('tableA', 'tableA.column1', '=', 'tableB.column2', 'cross')
		expect(builder.toSql()).toBe(
			'SELECT * FROM "tableB" CROSS JOIN "tableA" ON "tableA"."column1" = "tableB"."column2"'
		)

		builder = getBuilder()
		builder
			.select('*')
			.from('tableB')
			.crossJoin('tableA', 'tableA.column1', '=', 'tableB.column2')
		expect(builder.toSql()).toBe(
			'SELECT * FROM "tableB" CROSS JOIN "tableA" ON "tableA"."column1" = "tableB"."column2"'
		)
	})

	test('ComplexJoin', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.join('contacts', j => {
				j.on('users.id', '=', 'contacts.id').orOn('users.name', '=', 'contacts.name')
			})
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" INNER JOIN "contacts" ON "users"."id" = "contacts"."id" OR "users"."name" = "contacts"."name"'
		)

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.join('contacts', j => {
				j.where('users.id', '=', 'foo').orWhere('users.name', '=', 'bar')
			})
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" INNER JOIN "contacts" ON "users"."id" = ? OR "users"."name" = ?'
		)
		expect(builder.getBindings()).toEqual(['foo', 'bar'])
		// Run the assertions again
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" INNER JOIN "contacts" ON "users"."id" = ? OR "users"."name" = ?'
		)
		expect(builder.getBindings()).toEqual(['foo', 'bar'])
	})

	test('JoinWhereNull', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.join('contacts', j => {
				j.on('users.id', '=', 'contacts.id').whereNull('contacts.deleted_at')
			})
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" INNER JOIN "contacts" ON "users"."id" = "contacts"."id" AND "contacts"."deleted_at" IS NULL'
		)
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.join('contacts', j => {
				j.on('users.id', '=', 'contacts.id').orWhereNull('contacts.deleted_at')
			})
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" INNER JOIN "contacts" ON "users"."id" = "contacts"."id" OR "contacts"."deleted_at" IS NULL'
		)
	})

	test('JoinWhereNotNull', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.join('contacts', j => {
				j.on('users.id', '=', 'contacts.id').whereNotNull('contacts.deleted_at')
			})
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" INNER JOIN "contacts" ON "users"."id" = "contacts"."id" AND "contacts"."deleted_at" IS NOT NULL'
		)

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.join('contacts', j => {
				j.on('users.id', '=', 'contacts.id').orWhereNotNull('contacts.deleted_at')
			})
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" INNER JOIN "contacts" ON "users"."id" = "contacts"."id" OR "contacts"."deleted_at" IS NOT NULL'
		)
	})

	test('JoinWhereIn', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.join('contacts', j => {
				j.on('users.id', '=', 'contacts.id').whereIn('contacts.name', [48, 'baz', null])
			})
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" INNER JOIN "contacts" ON "users"."id" = "contacts"."id" AND "contacts"."name" IN (?, ?, ?)'
		)
		expect(builder.getBindings()).toEqual([48, 'baz', null])

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.join('contacts', j => {
				j.on('users.id', '=', 'contacts.id').orWhereIn('contacts.name', [48, 'baz', null])
			})
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" INNER JOIN "contacts" ON "users"."id" = "contacts"."id" OR "contacts"."name" IN (?, ?, ?)'
		)
		expect(builder.getBindings()).toEqual([48, 'baz', null])
	})

	test('JoinWhereInSubquery', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.join('contacts', j => {
				const q = getBuilder()
				q.select('name')
					.from('contacts')
					.where('name', 'baz')
				j.on('users.id', '=', 'contacts.id').whereIn('contacts.name', q)
			})
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" INNER JOIN "contacts" ON "users"."id" = "contacts"."id" AND "contacts"."name" IN (SELECT "name" FROM "contacts" WHERE "name" = ?)'
		)
		expect(builder.getBindings()).toEqual(['baz'])

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.join('contacts', j => {
				const q = getBuilder()
				q.select('name')
					.from('contacts')
					.where('name', 'baz')
				j.on('users.id', '=', 'contacts.id').orWhereIn('contacts.name', q)
			})
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" INNER JOIN "contacts" ON "users"."id" = "contacts"."id" OR "contacts"."name" IN (SELECT "name" FROM "contacts" WHERE "name" = ?)'
		)
		expect(builder.getBindings()).toEqual(['baz'])
	})

	test('JoinWhereNotIn', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.join('contacts', j => {
				j.on('users.id', '=', 'contacts.id').whereNotIn('contacts.name', [48, 'baz', null])
			})
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" INNER JOIN "contacts" ON "users"."id" = "contacts"."id" AND "contacts"."name" NOT IN (?, ?, ?)'
		)
		expect(builder.getBindings()).toEqual([48, 'baz', null])

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.join('contacts', j => {
				j.on('users.id', '=', 'contacts.id').orWhereNotIn('contacts.name', [48, 'baz', null])
			})
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" INNER JOIN "contacts" ON "users"."id" = "contacts"."id" OR "contacts"."name" NOT IN (?, ?, ?)'
		)
		expect(builder.getBindings()).toEqual([48, 'baz', null])
	})

	test('JoinsWithNestedConditions', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.leftJoin('contacts', j => {
				j.on('users.id', '=', 'contacts.id').where((j2: any) => {
					j2.where('contacts.country', '=', 'US').orWhere('contacts.is_partner', '=', 1)
				})
			})
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" LEFT JOIN "contacts" ON "users"."id" = "contacts"."id" AND ("contacts"."country" = ? OR "contacts"."is_partner" = ?)'
		)
		expect(builder.getBindings()).toEqual(['US', 1])

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.leftJoin('contacts', j => {
				j.on('users.id', '=', 'contacts.id')
					.where('contacts.is_active', '=', 1)
					.orOn(j2 => {
						j2.orWhere(j3 => {
							j3.where('contacts.country', '=', 'UK').orOn('contacts.type', '=', 'users.type')
						}).where(j3 => {
							j3.where('contacts.country', '=', 'US').orWhereNull('contacts.is_partner')
						})
					})
			})
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" LEFT JOIN "contacts" ON "users"."id" = "contacts"."id" AND "contacts"."is_active" = ? OR (("contacts"."country" = ? OR "contacts"."type" = "users"."type") AND ("contacts"."country" = ? OR "contacts"."is_partner" IS NULL))'
		)
		expect(builder.getBindings()).toEqual([1, 'UK', 'US'])
	})

	test('JoinsWithAdvancedConditions', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.leftJoin('contacts', j => {
				j.on('users.id', 'contacts.id').where((j2: any) => {
					j2.where('role', 'admin')
						.orWhereNull('contacts.disabled')
						.orWhereRaw('year(contacts.created_at) = 2016')
				})
			})
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" LEFT JOIN "contacts" ON "users"."id" = "contacts"."id" AND ("role" = ? OR "contacts"."disabled" IS NULL OR year(contacts.created_at) = 2016)'
		)
		expect(builder.getBindings()).toEqual(['admin'])
	})

	test('JoinsWithSubqueryCondition', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.leftJoin('contacts', j => {
				j.on('users.id', 'contacts.id').whereIn('contact_type_id', (q: any) => {
					q.select('id')
						.from('contact_types')
						.where('category_id', '1')
						.whereNull('deleted_at')
				})
			})
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" LEFT JOIN "contacts" ON "users"."id" = "contacts"."id" AND "contact_type_id" IN (SELECT "id" FROM "contact_types" WHERE "category_id" = ? AND "deleted_at" IS NULL)'
		)
		expect(builder.getBindings()).toEqual(['1'])

		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.leftJoin('contacts', j => {
				j.on('users.id', 'contacts.id').whereExists((q: any) => {
					q.selectRaw('1')
						.from('contact_types')
						.whereRaw('contact_types.id = contacts.contact_type_id')
						.where('category_id', '1')
						.whereNull('deleted_at')
				})
			})
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" LEFT JOIN "contacts" ON "users"."id" = "contacts"."id" AND EXISTS (SELECT 1 FROM "contact_types" WHERE contact_types.id = contacts.contact_type_id AND "category_id" = ? AND "deleted_at" IS NULL)'
		)
		expect(builder.getBindings()).toEqual(['1'])
	})

	test('JoinsWithAdvancedSubqueryCondition', () => {
		builder = getBuilder()
		builder
			.select('*')
			.from('users')
			.leftJoin('contacts', j => {
				j.on('users.id', 'contacts.id').whereExists(q => {
					q.selectRaw('1')
						.from('contact_types')
						.whereRaw('contact_types.id = contacts.contact_type_id')
						.where('category_id', '1')
						.whereNull('deleted_at')
						.whereIn('level_id', (q2: any) => {
							q2.select('id')
								.from('levels')
								.where('is_active', true)
						})
				})
			})
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" LEFT JOIN "contacts" ON "users"."id" = "contacts"."id" AND EXISTS (SELECT 1 FROM "contact_types" WHERE contact_types.id = contacts.contact_type_id AND "category_id" = ? AND "deleted_at" IS NULL AND "level_id" IN (SELECT "id" FROM "levels" WHERE "is_active" = ?))'
		)
		expect(builder.getBindings()).toEqual(['1', true])
	})

	test('JoinsWithNestedJoins', () => {
		builder = getBuilder()
		builder
			.select('users.id', 'contacts.id', 'contact_types.id')
			.from('users')
			.leftJoin('contacts', j => {
				j.on('users.id', 'contacts.id').join('contact_types', 'contacts.contact_type_id', '=', 'contact_types.id')
			})
		// expect(builder.toSql()).toBe(
		// 	'SELECT "users"."id", "contacts"."id", "contact_types"."id" FROM "users" LEFT JOIN ("contacts" INNER JOIN "contact_types" ON "contacts"."contact_type_id" = "contact_types"."id") ON "users"."id" = "contacts"."id"'
		// )
	})

	test('JoinsWithMultipleNestedJoins', () => {
		builder = getBuilder()
		builder
			.select('users.id', 'contacts.id', 'contact_types.id', 'countrys.id', 'planets.id')
			.from('users')
			.leftJoin('contacts', j => {
				j.on('users.id', 'contacts.id')
					.join('contact_types', 'contacts.contact_type_id', '=', 'contact_types.id')
					.leftJoin('countrys', j2 => {
						j2.on('contacts.country', '=', 'countrys.country').join('planets', j3 => {
							j3.on('countrys.planet_id', '=', 'planet.id')
								.where('planet.is_settled', '=', 1)
								.where('planet.population', '>=', 10000)
						})
					})
			})
		// expect(builder.toSql()).toBe(
		// 	'SELECT "users"."id", "contacts"."id", "contact_types"."id", "countrys"."id", "planets"."id" FROM "users" LEFT JOIN ("contacts" INNER JOIN "contact_types" ON "contacts"."contact_type_id" = "contact_types"."id" LEFT JOIN ("countrys" INNER JOIN "planets" ON "countrys"."planet_id" = "planet"."id" AND "planet"."is_settled" = ? AND "planet"."population" >= ?) ON "contacts"."country" = "countrys"."country") ON "users"."id" = "contacts"."id"'
		// )
		expect(builder.getBindings()).toEqual([1, 10000])
	})

	test('JoinsWithNestedJoinWithAdvancedSubqueryCondition', () => {
		builder = getBuilder()
		builder
			.select('users.id', 'contacts.id', 'contact_types.id')
			.from('users')
			.leftJoin('contacts', j => {
				j.on('users.id', 'contacts.id')
					.join('contact_types', 'contacts.contact_type_id', '=', 'contact_types.id')
					.whereExists((q: any) => {
						q.select('*')
							.from('countrys')
							.whereColumn('contacts.country', '=', 'countrys.country')
							.join('planets', (q2: any) => {
								q2.on('countrys.planet_id', '=', 'planet.id').where('planet.is_settled', '=', 1)
							})
							.where('planet.population', '>=', 10000)
					})
			})
		// expect(builder.toSql()).toBe(
		// 	'select "users"."id", "contacts"."id", "contact_types"."id" from "users" left join ("contacts" inner join "contact_types" on "contacts"."contact_type_id" = "contact_types"."id") on "users"."id" = "contacts"."id" and exists (select * from "countrys" inner join "planets" on "countrys"."planet_id" = "planet"."id" and "planet"."is_settled" = ? where "contacts"."country" = "countrys"."country" and "planet"."population" >= ?)'
		// )
		expect(builder.getBindings()).toEqual([1, 10000])
	})

	test('JoinSub', () => {
		builder = getBuilder()
		builder.from('users').joinSub('select * from "contacts"', 'sub', 'users.id', '=', 'sub.id')
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" INNER JOIN (SELECT * FROM "contacts") AS "sub" ON "users"."id" = "sub"."id"'
		)

		// builder = getBuilder()
		// builder.from('users').joinSub(

		// 	(q: any) => {
		// 		q.from('contacts')
		// 	},
		// 	'sub',
		// 	'users.id',
		// 	'=',
		// 	'sub.id'
		// )
		// expect(builder.toSql()).toBe(
		// 	'SELECT * FROM "users" INNER JOIN (SELECT * FROM "contacts") AS "sub" ON "users"."id" = "sub"."id"'
		// )

		builder = getBuilder()
		builder.from('users').joinSub(getBuilder().from('contacts'), 'sub', 'users.id', '=', 'sub.id')
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" INNER JOIN (SELECT * FROM "contacts") AS "sub" ON "users"."id" = "sub"."id"'
		)

		//     builder = getBuilder();
		//     sub1 = getBuilder().from('contacts').where('name', 'foo');
		//     sub2 = getBuilder().from('contacts').where('name', 'bar');
		//     builder.from('users')
		//         .joinSub(sub1, 'sub1', 'users.id', '=', 1, 'inner', true)
		//         .joinSub(sub2, 'sub2', 'users.id', '=', 'sub2.user_id');
		//     expected = 'select * from "users" ';
		//     expected.= 'inner join (select * from "contacts" where "name" = ?) as "sub1" on "users"."id" = ? ';
		//     expected.= 'inner join (select * from "contacts" where "name" = ?) as "sub2" on "users"."id" = "sub2"."user_id"';
		//     assertEquals(expected, builder.toSql());
		//     assertEquals(['foo', 1, 'bar'], builder.getRawBindings()['join']);
	})

	test('LeftJoinSub', () => {
		builder = getBuilder()
		builder.from('users').leftJoinSub(getBuilder().from('contacts'), 'sub', 'users.id', '=', 'sub.id')
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" LEFT JOIN (SELECT * FROM "contacts") AS "sub" ON "users"."id" = "sub"."id"'
		)
	})

	test('RightJoinSub', () => {
		builder = getBuilder()
		builder.from('users').rightJoinSub(getBuilder().from('contacts'), 'sub', 'users.id', '=', 'sub.id')
		expect(builder.toSql()).toBe(
			'SELECT * FROM "users" RIGHT JOIN (SELECT * FROM "contacts") AS "sub" ON "users"."id" = "sub"."id"'
		)
	})

	// test('RawExpressionsInSelect', () => {
	// 	builder = getBuilder()
	// 	builder.select(new Expression('substr(foo, 6)')).from('users')
	// 	expect(builder.toSql()).toBe('SELECT substr(foo, 6) FROM "users"')
	// })

	// test('ProvidingNullWithOperatorsBuildsCorrectly', () => {
	//     builder = getBuilder();
	//     builder.select('*').from('users').where('foo', null);
	//     expect(builder.toSql()).toBe('select * from "users" where "foo" is null')
	//     builder = getBuilder();
	//     builder.select('*').from('users').where('foo', '=', null);
	//     expect(builder.toSql()).toBe('select * from "users" where "foo" is null')
	//     builder = getBuilder();
	//     builder.select('*').from('users').where('foo', '!=', null);
	//     expect(builder.toSql()).toBe('select * from "users" where "foo" is not null')
	//     builder = getBuilder();
	//     builder.select('*').from('users').where('foo', '<>', null);
	//     expect(builder.toSql()).toBe('select * from "users" where "foo" is not null')
	// })

	// test('BindingOrder', () => {
	//     expectedSql = 'select * from "users" inner join "othertable" on "bar" = ? where "registered" = ? group by "city" having "population" > ? order by match ("foo") against(?)';
	//     expectedBindings = ['foo', 1, 3, 'bar'];
	//     builder = getBuilder();
	//     builder.select('*').from('users').join('othertable', (join: any) => {
	//         join.where('bar', '=', 'foo');
	//     }).where('registered', 1).groupBy('city').having('population', '>', 3).orderByRaw('match ("foo") against(?)', ['bar']);
	//     assertEquals(expectedSql, builder.toSql());
	//     assertEquals(expectedBindings, builder.getBindings());
	//     // order of statements reversed
	//     builder = getBuilder();
	//     builder.select('*').from('users').orderByRaw('match ("foo") against(?)', ['bar']).having('population', '>', 3).groupBy('city').where('registered', 1).join('othertable', (join: any) => {
	//         join.where('bar', '=', 'foo');
	//     });
	//     assertEquals(expectedSql, builder.toSql());
	//     assertEquals(expectedBindings, builder.getBindings());
	// })

	// test('AddBindingWithArrayMergesBindings', () => {
	//     builder = getBuilder();
	//     builder.addBinding(['foo', 'bar']);
	//     builder.addBinding(['baz']);
	//     expect(builder.getBindings()).toEqual(['foo', 'bar', 'baz'])
	// })

	// test('AddBindingWithArrayMergesBindingsInCorrectOrder', () => {
	//     builder = getBuilder();
	//     builder.addBinding(['bar', 'baz'], 'having');
	//     builder.addBinding(['foo'], 'where');
	//     expect(builder.getBindings()).toEqual(['foo', 'bar', 'baz'])
	// })

	// test('MergeBuilders', () => {
	//     builder = getBuilder();
	//     builder.addBinding(['foo', 'bar']);
	//     otherBuilder = getBuilder();
	//     otherBuilder.addBinding(['baz']);
	//     builder.mergeBindings(otherBuilder);
	//     expect(builder.getBindings()).toEqual(['foo', 'bar', 'baz'])
	// })

	// test('MergeBuildersBindingOrder', () => {
	//     builder = getBuilder();
	//     builder.addBinding('foo', 'where');
	//     builder.addBinding('baz', 'having');
	//     otherBuilder = getBuilder();
	//     otherBuilder.addBinding('bar', 'where');
	//     builder.mergeBindings(otherBuilder);
	//     expect(builder.getBindings()).toEqual(['foo', 'bar', 'baz'])
	// })

	// test('UppercaseLeadingBooleansAreRemoved', () => {
	//     builder = getBuilder();
	//     builder.select('*').from('users').where('name', '=', 'Taylor', 'AND');
	//     expect(builder.toSql()).toBe('select * from "users" where "name" = ?')
	// })

	// test('LowercaseLeadingBooleansAreRemoved', () => {
	//     builder = getBuilder();
	//     builder.select('*').from('users').where('name', '=', 'Taylor', 'and');
	//     expect(builder.toSql()).toBe('select * from "users" where "name" = ?')
	// })

	// test('CaseInsensitiveLeadingBooleansAreRemoved', () => {
	//     builder = getBuilder();
	//     builder.select('*').from('users').where('name', '=', 'Taylor', 'And');
	//     expect(builder.toSql()).toBe('select * from "users" where "name" = ?')
	// })

	// test('WhereRowValues', () => {
	//     builder = getBuilder();
	//     builder.select('*').from('orders').whereRowValues(['last_update', 'order_number'], '<', [1, 2]);
	//     expect(builder.toSql()).toBe('select * from "orders" where ("last_update", "order_number") < (?, ?)')
	//     builder = getBuilder();
	//     builder.select('*').from('orders').where('company_id', 1).orWhereRowValues(['last_update', 'order_number'], '<', [1, 2]);
	//     expect(builder.toSql()).toBe('select * from "orders" where "company_id" = ? or ("last_update", "order_number") < (?, ?)')
	//     builder = getBuilder();
	//     builder.select('*').from('orders').whereRowValues(['last_update', 'order_number'], '<', [1, new Expression('2')]);
	//     expect(builder.toSql()).toBe('select * from "orders" where ("last_update", "order_number") < (?, 2)')
	//     expect(builder.getBindings()).toEqual([1])
	// })

	// test('WhereRowValuesArityMismatch', () => {
	//     expectException(InvalidArgumentException:: class);
	//     expectExceptionMessage('The number of columns must match the number of values');
	//     builder = getBuilder();
	//     builder.select('*').from('orders').whereRowValues(['last_update'], '<', [1, 2]);
	// })

	// test('WhereJsonContainsSqlite', () => {
	//     expectException(RuntimeException:: class);
	//     builder = getSQLiteBuilder();
	//     builder.select('*').from('users').whereJsonContains('options->languages', ['en']).toSql();
	// })

	// test('FromSub', () => {
	//     builder = getBuilder();
	//     builder.fromSub((query: any) => {
	//         query.select(new Expression('max(last_seen_at) as last_seen_at')).from('user_sessions').where('foo', '=', '1');
	//     }, 'sessions').where('bar', '<', '10');
	//     expect(builder.toSql()).toBe('select * from (select max(last_seen_at) as last_seen_at from "user_sessions" where "foo" = ?) as "sessions" where "bar" < ?')
	//     expect(builder.getBindings()).toEqual(['1', '10'])
	// })

	// test('FromSubWithoutBindings', () => {
	//     builder = getBuilder();
	//     builder.fromSub((query: any) => {
	//         query.select(new Expression('max(last_seen_at) as last_seen_at')).from('user_sessions');
	//     }, 'sessions');
	//     expect(builder.toSql()).toBe('select * from (select max(last_seen_at) as last_seen_at from "user_sessions") as "sessions"')
	// })

	// test('FromRaw', () => {
	//     builder = getBuilder();
	//     builder.fromRaw(new Expression('(select max(last_seen_at) as last_seen_at from "user_sessions") as "sessions"'));
	//     expect(builder.toSql()).toBe('select * from (select max(last_seen_at) as last_seen_at from "user_sessions") as "sessions"')
	// })

	// test('FromRawOnSqlServer', () => {
	//     builder = getSqlServerBuilder();
	//     builder.fromRaw('dbo.[SomeNameWithRoundBrackets (test)]');
	//     expect(builder.toSql()).toBe('select * from dbo.[SomeNameWithRoundBrackets (test)]')
	// })

	// test('FromRawWithWhereOnTheMainQuery', () => {
	//     builder = getBuilder();
	//     builder.fromRaw(new Expression('(select max(last_seen_at) as last_seen_at from "sessions") as "last_seen_at"')).where('last_seen_at', '>', '1520652582');
	//     expect(builder.toSql()).toBe('select * from (select max(last_seen_at) as last_seen_at from "sessions") as "last_seen_at" where "last_seen_at" > ?')
	//     expect(builder.getBindings()).toEqual(['1520652582'])
	// })
})
