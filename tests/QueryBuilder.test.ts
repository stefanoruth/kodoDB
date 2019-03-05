import { QueryBuilder } from '../src/Query/QueryBuilder'
import { QueryGrammar } from '../src/Query/Grammars/QueryGrammar'
import { QueryProcessor } from '../src/Query/Processors/QueryProcessor'
import { Mock } from 'ts-mockery'
import { Connection } from '../src/Connections/Connection'

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

describe('QueryBuilder', () => {
	test('basicSelect', () => {
		const builder = getBuilder()
		builder.select('*').from('users')
		expect(builder.toSql()).toBe('SELECT * FROM "users"')
	})

	test('basicSelectWithGetColumns', () => {
		const builder = getBuilder()

		// expect(builder.getProcessor().processSelect).toBeCalled()
		// expect(builder.getConnection().select).toBeCalledTimes(1)

		//         $builder-> getProcessor() -> shouldReceive('processSelect');
		// $builder -> getConnection() -> shouldReceive('select') -> once() -> andReturnUsing(function ($sql) {
		//     $this -> assertEquals('select * from "users"', $sql);
		// });
		// $builder -> getConnection() -> shouldReceive('select') -> once() -> andReturnUsing(function ($sql) {
		//     $this -> assertEquals('select "foo", "bar" from "users"', $sql);
		// });
		// $builder -> getConnection() -> shouldReceive('select') -> once() -> andReturnUsing(function ($sql) {
		//     $this -> assertEquals('select "baz" from "users"', $sql);
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
		const builder = getBuilder()
		builder.select('*').from('some"table')
		expect(builder.toSql()).toBe('SELECT * FROM "some""table"')
	})

	test('aliasWrappingAsWholeConstant', () => {
		const builder = getBuilder()
		builder.select('x.y as foo.bar').from('baz')
		expect(builder.toSql()).toBe('SELECT "x"."y" as "foo.bar" FROM "baz"')
	})

	test('aliasWrappingWithSpacesInDatabaseName', () => {
		const builder = getBuilder()
		builder.select('w x.y.z as foo.bar').from('baz')
		expect(builder.toSql()).toBe('SELECT "w x"."y"."z" as "foo.bar" FROM "baz"')
	})

	test('addingSelects', () => {
		const builder = getBuilder()
		builder
			.select('foo')
			.addSelect('bar')
			.addSelect(['baz', 'boom'])
			.from('users')
		expect(builder.toSql()).toBe('SELECT "foo", "bar", "baz", "boom" FROM "users"')
	})

	test('basicSelectWithPrefix', () => {
		const builder = getBuilder()
		builder.getGrammar().setTablePrefix('prefix_')
		builder.select('*').from('users')
		expect(builder.toSql()).toBe('SELECT * FROM "prefix_users"')
	})

	test('basicSelectDistinct', () => {
		const builder = getBuilder()
		builder
			.distinct()
			.select('foo', 'bar')
			.from('users')
		expect(builder.toSql()).toBe('SELECT DISTINCT "foo", "bar" FROM "users"')
	})

	test('basicAlias', () => {
		const builder = getBuilder()
		builder.select('foo as bar').from('users')
		expect(builder.toSql()).toBe('SELECT "foo" as "bar" FROM "users"')
	})

	test('aliasWithPrefix', () => {
		const builder = getBuilder()
		builder.getGrammar().setTablePrefix('prefix_')
		builder.select('*').from('users as people')
		expect(builder.toSql()).toBe('SELECT * FROM "prefix_users" as "prefix_people"')
	})

	test('joinAliasesWithPrefix', () => {
		const builder = getBuilder()
		builder.getGrammar().setTablePrefix('prefix_')
		builder
			.select('*')
			.from('services')
			.join('translations AS t', 't.item_id', '=', 'services.id')
		expect(builder.toSql()).toBe(
			'SELECT * FROM "prefix_services" INNER JOIN "prefix_translations" as "prefix_t" on "prefix_t"."item_id" = "prefix_services"."id"'
		)
	})

	test('basicTableWrapping', () => {
		const builder = getBuilder()
		builder.select('*').from('public.users')
		expect(builder.toSql()).toBe('SELECT * FROM "public"."users"')
	})

	test('whenCallback', () => {
		let builder
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
		let builder
		const callback = (query: any, condition: any) => {
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
		// $callback = function ($query, $condition) {
		//     $this -> assertEquals($condition, 'truthy');
		//     $query -> where('id', '=', 1);
		// };
		// $default = function ($query, $condition) {
		//     $this -> assertEquals($condition, 0);
		//     $query -> where('id', '=', 2);
		// };
		// $builder = $this -> getBuilder();
		// $builder -> select('*') -> from('users') -> when('truthy', $callback, $default) -> where('email', 'foo');
		// $this -> assertEquals('select * from "users" where "id" = ? and "email" = ?', $builder -> toSql());
		// $this -> assertEquals([0 => 1, 1 => 'foo'], $builder -> getBindings());
		// $builder = $this -> getBuilder();
		// $builder -> select('*') -> from('users') -> when(0, $callback, $default) -> where('email', 'foo');
		// $this -> assertEquals('select * from "users" where "id" = ? and "email" = ?', $builder -> toSql());
		// $this -> assertEquals([0 => 2, 1 => 'foo'], $builder -> getBindings());
	})
})
