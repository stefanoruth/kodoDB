import { QueryBuilder } from '../src/Query/QueryBuilder'
import { MySqlQueryGrammar } from '../src/Query/Grammars/MySqlQueryGrammer'
import { Connection } from '../src/Connections/Connection'
import { QueryProcessor } from '../src/Query/Processors/QueryProcessor'
import { MySqlProcessor } from '../src/Query/Processors/MysqlProcessor'
import { Mock } from 'ts-mockery'
import { QueryGrammar } from '../src/Query/Grammars/QueryGrammar'
import { Expression } from '../src/Query/Expression'

let builder: QueryBuilder

function getMySqlBuilder(args: { select?: any; processSelect?: any } = {}) {
	const { select, processSelect } = { ...{ select: jest.fn(), processSelect: jest.fn() }, ...args }
	const grammar = new MySqlQueryGrammar()
	const processor = Mock.of<QueryProcessor>({ processSelect })
	const connection = Mock.of<Connection>({ select })

	return Mock.from<QueryBuilder>(new QueryBuilder(connection, grammar, processor))
}

function getMySqlBuilderWithProcessor(args: { select?: any; processSelect?: any } = {}) {
	const { select, processSelect } = { ...{ select: jest.fn(), processSelect: jest.fn() }, ...args }
	const grammar = new MySqlQueryGrammar()
	const processor = Mock.of<MySqlProcessor>({ processSelect })
	const connection = Mock.of<Connection>({ select })

	return Mock.from<QueryBuilder>(new QueryBuilder(connection, grammar, processor))
}

describe('MySqlQueryBuilder', () => {
	test('BasicSelect', () => {
		builder = getMySqlBuilderWithProcessor()

		builder
			.select('*')
			.from('users')
			.get()
		expect(builder.getConnection().select).toHaveBeenCalledWith('SELECT * FROM `users`', [])
	})

	test('MySqlWrappingProtectsQuotationMarks', () => {
		builder = getMySqlBuilder()
		builder.select('*').from('some`table')
		expect(builder.toSql()).toBe('SELECT * FROM `some``table`')
	})

	test('DateBasedWheresAcceptsTwoArguments', () => {
		builder = getMySqlBuilder()
		builder
			.select('*')
			.from('users')
			.whereDate('created_at', 1)
		expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE DATE(`created_at`) = ?')

		builder = getMySqlBuilder()
		builder
			.select('*')
			.from('users')
			.whereDay('created_at', 1)
		expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE DAY(`created_at`) = ?')

		builder = getMySqlBuilder()
		builder
			.select('*')
			.from('users')
			.whereMonth('created_at', 1)
		expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE MONTH(`created_at`) = ?')

		builder = getMySqlBuilder()
		builder
			.select('*')
			.from('users')
			.whereYear('created_at', 1)
		expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE YEAR(`created_at`) = ?')
	})

	test('DateBasedOrWheresAcceptsTwoArguments', () => {
		builder = getMySqlBuilder()
		builder
			.select('*')
			.from('users')
			.where('id', 1)
			.orWhereDate('created_at', 1)
		expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE `id` = ? OR DATE(`created_at`) = ?')

		builder = getMySqlBuilder()
		builder
			.select('*')
			.from('users')
			.where('id', 1)
			.orWhereDay('created_at', 1)
		expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE `id` = ? OR DAY(`created_at`) = ?')

		builder = getMySqlBuilder()
		builder
			.select('*')
			.from('users')
			.where('id', 1)
			.orWhereMonth('created_at', 1)
		expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE `id` = ? OR MONTH(`created_at`) = ?')

		builder = getMySqlBuilder()
		builder
			.select('*')
			.from('users')
			.where('id', 1)
			.orWhereYear('created_at', 1)
		expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE `id` = ? OR YEAR(`created_at`) = ?')
	})

	test('WhereDateMySql', () => {
		builder = getMySqlBuilder()
		builder
			.select('*')
			.from('users')
			.whereDate('created_at', '=', '2015-12-21')
		expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE DATE(`created_at`) = ?')
		expect(builder.getBindings()).toEqual(['2015-12-21'])

		builder = getMySqlBuilder()
		builder
			.select('*')
			.from('users')
			.whereDate('created_at', '=', new Expression('NOW()'))
		expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE DATE(`created_at`) = NOW()')
	})

	test('WhereDayMySql', () => {
		builder = getMySqlBuilder()
		builder
			.select('*')
			.from('users')
			.whereDay('created_at', '=', 1)
		expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE DAY(`created_at`) = ?')
		expect(builder.getBindings()).toEqual([1])
	})
	test('OrWhereDayMySql', () => {
		builder = getMySqlBuilder()
		builder
			.select('*')
			.from('users')
			.whereDay('created_at', '=', 1)
			.orWhereDay('created_at', '=', 2)
		expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE DAY(`created_at`) = ? OR DAY(`created_at`) = ?')
		expect(builder.getBindings()).toEqual([1, 2])
	})

	test('WhereMonthMySql', () => {
		builder = getMySqlBuilder()
		builder
			.select('*')
			.from('users')
			.whereMonth('created_at', '=', 5)
		expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE MONTH(`created_at`) = ?')
		expect(builder.getBindings()).toEqual([5])
	})

	test('OrWhereMonthMySql', () => {
		builder = getMySqlBuilder()
		builder
			.select('*')
			.from('users')
			.whereMonth('created_at', '=', 5)
			.orWhereMonth('created_at', '=', 6)
		expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE MONTH(`created_at`) = ? OR MONTH(`created_at`) = ?')
		expect(builder.getBindings()).toEqual([5, 6])
	})

	test('WhereYearMySql', () => {
		builder = getMySqlBuilder()
		builder
			.select('*')
			.from('users')
			.whereYear('created_at', '=', 2014)
		expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE YEAR(`created_at`) = ?')
		expect(builder.getBindings()).toEqual([2014])
	})

	test('OrWhereYearMySql', () => {
		builder = getMySqlBuilder()
		builder
			.select('*')
			.from('users')
			.whereYear('created_at', '=', 2014)
			.orWhereYear('created_at', '=', 2015)
		expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE YEAR(`created_at`) = ? OR YEAR(`created_at`) = ?')
		expect(builder.getBindings()).toEqual([2014, 2015])
	})

	test('WhereTimeMySql', () => {
		builder = getMySqlBuilder()
		builder
			.select('*')
			.from('users')
			.whereTime('created_at', '>=', '22:00')
		expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE TIME(`created_at`) >= ?')
		expect(builder.getBindings()).toEqual(['22:00'])
	})

	test('WhereTimeOperatorOptionalMySql', () => {
		builder = getMySqlBuilder()
		builder
			.select('*')
			.from('users')
			.whereTime('created_at', '22:00')
		expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE TIME(`created_at`) = ?')
		expect(builder.getBindings()).toEqual(['22:00'])
	})

	test('Unions', () => {
		builder = getMySqlBuilder()
		builder
			.select('*')
			.from('users')
			.where('id', '=', 1)
		builder.union(
			getMySqlBuilder()
				.select('*')
				.from('users')
				.where('id', '=', 2)
		)
		expect(builder.toSql()).toBe('(SELECT * FROM `users` WHERE `id` = ?) UNION (SELECT * FROM `users` WHERE `id` = ?)')
		expect(builder.getBindings()).toEqual([1, 2])

		builder = getMySqlBuilder()
		const expectedSql =
			'(SELECT `a` FROM `t1` WHERE `a` = ? AND `b` = ?) UNION (SELECT `a` FROM `t2` WHERE `a` = ? AND `b` = ?) ORDER BY `a` ASC LIMIT 10'
		const union = getMySqlBuilder()
			.select('a')
			.from('t2')
			.where('a', 11)
			.where('b', 2)
		builder
			.select('a')
			.from('t1')
			.where('a', 10)
			.where('b', 1)
			.union(union)
			.orderBy('a')
			.limit(10)
		expect(builder.toSql()).toBe(expectedSql)
		expect(builder.getBindings()).toEqual([10, 1, 11, 2])
	})

	test('MySqlUnionOrderBys', () => {
		builder = getMySqlBuilder()
		builder
			.select('*')
			.from('users')
			.where('id', '=', 1)
		builder.union(
			getMySqlBuilder()
				.select('*')
				.from('users')
				.where('id', '=', 2)
		)
		builder.orderBy('id', 'DESC')
		expect(builder.toSql()).toBe(
			'(SELECT * FROM `users` WHERE `id` = ?) UNION (SELECT * FROM `users` WHERE `id` = ?) ORDER BY `id` DESC'
		)
		expect(builder.getBindings()).toEqual([1, 2])
	})

	test('MySqlUnionLimitsAndOffsets', () => {
		builder = getMySqlBuilder()
		builder.select('*').from('users')
		builder.union(
			getMySqlBuilder()
				.select('*')
				.from('dogs')
		)
		builder.skip(5).take(10)
		expect(builder.toSql()).toBe('(SELECT * FROM `users`) UNION (SELECT * FROM `dogs`) LIMIT 10 OFFSET 5')
	})

	// test('UnionAggregate', () => {
	// 	let expected =
	// 		'SELECT count(*) as aggregate from ((SELECT * FROM `posts`) UNION (SELECT * FROM `videos`)) as `temp_table`'
	// 	builder = getMySqlBuilder()
	// 	builder
	// 		.getConnection()
	// 		.shouldReceive('SELECT')
	// 		.once()
	// 		.with(expected, [], true)
	// 	builder
	// 		.getProcessor()
	// 		.shouldReceive('processSelect')
	// 		.once()
	// 	builder
	// 		.from('posts')
	// 		.union(getMySqlBuilder().from('videos'))
	// 		.count()
	// 	expected =
	// 		'SELECT count(*) as aggregate from ((select `id` from `posts`) UNION (select `id` from `videos`)) as `temp_table`'
	// 	builder = getMySqlBuilder()
	// 	builder
	// 		.getConnection()
	// 		.shouldReceive('SELECT')
	// 		.once()
	// 		.with(expected, [], true)
	// 	builder
	// 		.getProcessor()
	// 		.shouldReceive('processSelect')
	// 		.once()
	// 	builder
	// 		.from('posts')
	// 		.select('id')
	// 		.union(
	// 			getMySqlBuilder()
	// 				.from('videos')
	// 				.select('id')
	// 		)
	// 		.count()
	// 	expected =
	// 		'SELECT count(*) as aggregate from ((SELECT * FROM "posts") UNION (SELECT * FROM "videos")) as "temp_table"'
	// })

	// test('UpdateMethod', () => {

	//     builder = getMySqlBuilder();
	//     builder.getConnection().shouldReceive('update').once().with('update `users` set `email` = ?, `name` = ? where `id` = ? ORDER BY `foo` desc LIMIT 5', ['foo', 'bar', 1]).andReturn(1);
	//     result = builder.from('users').where('id', '=', 1).orderBy('foo', 'DESC').limit(5).upDATE(['email' => 'foo', 'name' => 'bar']);
	//     assertEquals(1, result);
	// }

	// )
	// test('UpdateMethodWithJoinsOnMySql', () => {
	//     builder = getMySqlBuilder();
	//     builder.getConnection().shouldReceive('update').once().with('update `users` inner join `orders` on `users`.`id` = `orders`.`user_id` set `email` = ?, `name` = ? where `users`.`id` = ?', ['foo', 'bar', 1]).andReturn(1);
	//     result = builder.from('users').join('orders', 'users.id', '=', 'orders.user_id').where('users.id', '=', 1).upDATE(['email' => 'foo', 'name' => 'bar']);
	//     assertEquals(1, result);
	//     builder = getMySqlBuilder();
	//     builder.getConnection().shouldReceive('update').once().with('update `users` inner join `orders` on `users`.`id` = `orders`.`user_id` AND `users`.`id` = ? set `email` = ?, `name` = ?', [1, 'foo', 'bar']).andReturn(1);
	//     result = builder.from('users').join('orders', function (join) {
	//         join.on('users.id', '=', 'orders.user_id')
	//             .where('users.id', '=', 1);
	//     }).upDATE(['email' => 'foo', 'name' => 'bar']);
	//     assertEquals(1, result);
	// }

	// )
	// test('DeleteMethod', () => {

	//     builder = getMySqlBuilder();
	//     builder.getConnection().shouldReceive('delete').once().with('delete from `users` WHERE `email` = ? ORDER BY `id` asc LIMIT 1', ['foo']).andReturn(1);
	//     result = builder.from('users').where('email', '=', 'foo').orderBy('id').take(1).delete();
	//     assertEquals(1, result);

	// }

	// )
	// test('DeleteWithJoinMethod', () => {

	//     builder = getMySqlBuilder();
	//     builder.getConnection().shouldReceive('delete').once().with('delete `users` from `users` inner join `contacts` on `users`.`id` = `contacts`.`id` WHERE `email` = ?', ['foo']).andReturn(1);
	//     result = builder.from('users').join('contacts', 'users.id', '=', 'contacts.id').where('email', '=', 'foo').orderBy('id').limit(1).delete();
	//     assertEquals(1, result);
	//     builder = getMySqlBuilder();
	//     builder.getConnection().shouldReceive('delete').once().with('delete `a` from `users` as `a` inner join `users` as `b` on `a`.`id` = `b`.`user_id` WHERE `email` = ?', ['foo']).andReturn(1);
	//     result = builder.from('users AS a').join('users AS b', 'a.id', '=', 'b.user_id').where('email', '=', 'foo').orderBy('id').limit(1).delete();
	//     assertEquals(1, result);
	//     builder = getMySqlBuilder();
	//     builder.getConnection().shouldReceive('delete').once().with('delete `users` from `users` inner join `contacts` on `users`.`id` = `contacts`.`id` WHERE `users`.`id` = ?', [1]).andReturn(1);
	//     result = builder.from('users').join('contacts', 'users.id', '=', 'contacts.id').orderBy('id').take(1).delete(1);
	//     assertEquals(1, result);

	// }

	// )

	test('MySqlWrapping', () => {
		builder = getMySqlBuilder()
		builder.select('*').from('users')
		expect(builder.toSql()).toBe('SELECT * FROM `users`')
	})

	// test('MySqlUpdateWithJsonPreparesBindingsCorrectly', () => {
	//     grammar = new MySqlGrammar;
	//     processor = m:: mock(Processor:: class);
	//     connection = m:: mock(ConnectionInterface:: class);
	//     connection.shouldReceive('update')
	//         .once()
	//         .with(
	//             'update `users` set `options` = json_set(`options`, \'."enable"\', false), `updated_at` = ? where `id` = ?',
	//             ['2015-05-26 22:02:06', 0]
	//         );
	//     builder = new Builder(connection, grammar, processor);
	//     builder.from('users').where('id', '=', 0).upDATE(['options.enable' => false, 'updated_at' => '2015-05-26 22:02:06']);
	//     connection.shouldReceive('update')
	//         .once()
	//         .with(
	//             'update `users` set `options` = json_set(`options`, \'."size"\', ?), `updated_at` = ? where `id` = ?',
	//             [45, '2015-05-26 22:02:06', 0]
	//         );
	//     builder = new Builder(connection, grammar, processor);
	//     builder.from('users').where('id', '=', 0).upDATE(['options.size' => 45, 'updated_at' => '2015-05-26 22:02:06']);
	//     builder = getMySqlBuilder();
	//     builder.getConnection().shouldReceive('update').once().with('update `users` set `options` = json_set(`options`, \'."size"\', ?)', [null]);
	//     builder.from('users').upDATE(['options.size' => null]);
	//     builder = getMySqlBuilder();
	//     builder.getConnection().shouldReceive('update').once().with('update `users` set `options` = json_set(`options`, \'."size"\', 45)', []);
	//     builder.from('users').upDATE(['options.size' => new Raw('45')]);
	// }

	// )

	test('MySqlWrappingJsonWithString', () => {
		builder = getMySqlBuilder()
		builder
			.select('*')
			.from('users')
			.where('items.sku', '=', 'foo-bar')
		expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE json_unquote(json_extract(`items`, \'."sku"\')) = ?')
		expect(builder.getRawBindings().where).toBe(1)
		expect(builder.toSql()).toBe('foo-bar')
	})

	// test('MySqlWrappingJsonWithInteger', () => {
	// 	builder = getMySqlBuilder()
	// 	builder
	// 		.select('*')
	// 		.from('users')
	// 		.where('items.price', '=', 1)
	// 	expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE json_unquote(json_extract(`items`, \'."price"\')) = ?')
	// })

	// test('MySqlWrappingJsonWithDouble', () => {
	// 	builder = getMySqlBuilder()
	// 	builder
	// 		.select('*')
	// 		.from('users')
	// 		.where('items.price', '=', 1.5)
	// 	expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE json_unquote(json_extract(`items`, \'."price"\')) = ?')
	// })

	// test('MySqlWrappingJsonWithBoolean', () => {
	//     builder = getMySqlBuilder();
	//     builder.select('*').from('users').where('items.available', '=', true);
	//     expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE json_extract(`items`, \'."available"\') = true')
	//     builder = getMySqlBuilder();
	//     builder.select('*').from('users').where(new Raw("items.'.available'"), '=', true);
	//     assertEquals("SELECT * FROM `users` WHERE items.'.available' = true", builder.toSql());
	// }
	// )
	// test('MySqlWrappingJsonWithBooleanAndIntegerThatLooksLikeOne', () => {
	//     builder = getMySqlBuilder();
	//     builder.select('*').from('users').where('items.available', '=', true).where('items.active', '=', false).where('items.number_available', '=', 0);
	//     expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE json_extract(`items`, \'."available"\') = true AND json_extract(`items`, \'."active"\') = false AND json_unquote(json_extract(`items`, \'."number_available"\')) = ?')
	// }
	// )
	// test('MySqlWrappingJson', () => {
	//     builder = getMySqlBuilder();
	//     builder.select('*').from('users').whereRaw('items.\'."price"\' = 1');
	//     expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE items.\'."price"\' = 1')
	//     builder = getMySqlBuilder();
	//     builder.select('items.price').from('users').where('users.items.price', '=', 1).orderBy('items.price');
	//     expect(builder.toSql()).toBe('SELECT json_unquote(json_extract(`items`, \'."price"\')) from `users` WHERE json_unquote(json_extract(`users`.`items`, \'."price"\')) = ? ORDER BY json_unquote(json_extract(`items`, \'."price"\')) ASC')
	//     builder = getMySqlBuilder();
	//     builder.select('*').from('users').where('items.price.in_usd', '=', 1);
	//     expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE json_unquote(json_extract(`items`, \'."price"."in_usd"\')) = ?')
	//     builder = getMySqlBuilder();
	//     builder.select('*').from('users').where('items.price.in_usd', '=', 1).where('items.age', '=', 2);
	//     expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE json_unquote(json_extract(`items`, \'."price"."in_usd"\')) = ? AND json_unquote(json_extract(`items`, \'."age"\')) = ?')
	// }

	// )
	// test('MySqlSoundsLikeOperator', () => {
	//     builder = getMySqlBuilder();
	//     builder.select('*').from('users').where('name', 'sounds like', 'John Doe');
	//     expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE `name` sounds like ?')
	//     expect(builder.getBindings()).toEqual(['John Doe'])
	// }

	// )
	// test('MySqlLock', () => {
	//     builder = getMySqlBuilder();
	//     builder.select('*').from('foo').where('bar', '=', 'baz').lock();
	//     expect(builder.toSql()).toBe('SELECT * FROM `foo` WHERE `bar` = ? for update')
	//     expect(builder.getBindings()).toEqual(['baz'])
	//     builder = getMySqlBuilder();
	//     builder.select('*').from('foo').where('bar', '=', 'baz').lock(false);
	//     expect(builder.toSql()).toBe('SELECT * FROM `foo` WHERE `bar` = ? lock in share mode')
	//     expect(builder.getBindings()).toEqual(['baz'])
	//     builder = getMySqlBuilder();
	//     builder.select('*').from('foo').where('bar', '=', 'baz').lock('lock in share mode');
	//     expect(builder.toSql()).toBe('SELECT * FROM `foo` WHERE `bar` = ? lock in share mode')
	//     expect(builder.getBindings()).toEqual(['baz'])
	// }

	// )
	// test('SelectWithLockUsesWritePdo', () => {
	//     builder = getMySqlBuilderWithProcessor();
	//     builder.getConnection().shouldReceive('SELECT').once()
	//         .with(m:: any(), m:: any(), false);
	//     builder.select('*').from('foo').where('bar', '=', 'baz').lock().get();
	//     builder = getMySqlBuilderWithProcessor();
	//     builder.getConnection().shouldReceive('SELECT').once()
	//         .with(m:: any(), m:: any(), false);
	//     builder.select('*').from('foo').where('bar', '=', 'baz').lock(false).get();
	// }

	// )
	// test('WhereJsonContainsMySql', () => {
	//     builder = getMySqlBuilder();
	//     builder.select('*').from('users').whereJsonContains('options', ['en']);
	//     expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE json_contains(`options`, ?)')
	//     expect(builder.getBindings()).toEqual(['["en"]'])
	//     builder = getMySqlBuilder();
	//     builder.select('*').from('users').whereJsonContains('users.options.languages', ['en']);
	//     expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE json_contains(`users`.`options`, ?, \'."languages"\')')
	//     expect(builder.getBindings()).toEqual(['["en"]'])
	//     builder = getMySqlBuilder();
	//     builder.select('*').from('users').where('id', '=', 1).orWhereJsonContains('options.languages', new Raw("'[\"en\"]'"));
	//     expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE `id` = ? OR json_contains(`options`, \'["en"]\', \'."languages"\')')
	//     expect(builder.getBindings()).toEqual([1])
	// }

	// )
	// test('WhereJsonDoesntContainMySql', () => {
	//     builder = getMySqlBuilder();
	//     builder.select('*').from('users').whereJsonDoesntContain('options.languages', ['en']);
	//     expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE not json_contains(`options`, ?, \'."languages"\')')
	//     expect(builder.getBindings()).toEqual(['["en"]'])
	//     builder = getMySqlBuilder();
	//     builder.select('*').from('users').where('id', '=', 1).orWhereJsonDoesntContain('options.languages', new Raw("'[\"en\"]'"));
	//     expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE `id` = ? OR not json_contains(`options`, \'["en"]\', \'."languages"\')')
	//     expect(builder.getBindings()).toEqual([1])
	// }

	// )
	// test('WhereJsonLengthMySql', () => {
	//     builder = getMySqlBuilder();
	//     builder.select('*').from('users').whereJsonLength('options', 0);
	//     expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE json_length(`options`) = ?')
	//     expect(builder.getBindings()).toEqual([0])
	//     builder = getMySqlBuilder();
	//     builder.select('*').from('users').whereJsonLength('users.options.languages', '>', 0);
	//     expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE json_length(`users`.`options`, \'."languages"\') > ?')
	//     expect(builder.getBindings()).toEqual([0])
	//     builder = getMySqlBuilder();
	//     builder.select('*').from('users').where('id', '=', 1).orWhereJsonLength('options.languages', new Raw('0'));
	//     expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE `id` = ? OR json_length(`options`, \'."languages"\') = 0')
	//     expect(builder.getBindings()).toEqual([1])
	//     builder = getMySqlBuilder();
	//     builder.select('*').from('users').where('id', '=', 1).orWhereJsonLength('options.languages', '>', new Raw('0'));
	//     expect(builder.toSql()).toBe('SELECT * FROM `users` WHERE `id` = ? OR json_length(`options`, \'."languages"\') > 0')
	//     expect(builder.getBindings()).toEqual([1])
	// })
})
