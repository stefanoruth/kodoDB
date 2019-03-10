import { QueryBuilder } from '../src/Query/QueryBuilder'
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
		expect(builder.columns).toEqual([])

		builder.from('users').get(['foo', 'bar'])
		expect(builder.columns).toEqual([])

		builder.from('users').get('baz')
		expect(builder.columns).toEqual([])

		expect(builder.toSql()).toBe('SELECT * FROM "users"')
		expect(builder.columns).toEqual([])
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
		// $builder = $this -> getBuilder();
		// $builder -> select('*') -> from('users') -> whereIn('id', function ($q) {
		//     $q -> select('id') -> from('users') -> where('age', '>', 25) -> take(3);
		// });
		// $this -> assertEquals('select * from "users" where "id" in (select "id" from "users" where "age" > ? limit 3)', $builder -> toSql());
		// $this -> assertEquals([25], $builder -> getBindings());
		// $builder = $this -> getBuilder();
		// $builder -> select('*') -> from('users') -> whereNotIn('id', function ($q) {
		//     $q -> select('id') -> from('users') -> where('age', '>', 25) -> take(3);
		// });
		// $this -> assertEquals('select * from "users" where "id" not in (select "id" from "users" where "age" > ? limit 3)', $builder -> toSql());
		// $this -> assertEquals([25], $builder -> getBindings());
	})
})
