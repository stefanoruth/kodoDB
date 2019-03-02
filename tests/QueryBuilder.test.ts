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
	return new QueryBuilder(connection, grammar, processor)
}

describe('QueryBuilder', () => {
	test('basicSelect', () => {
		const builder = getBuilder()
		builder.select('*').from('users')
		expect(builder.toSql()).toBe('SELECT * FROM "users"')
	})

	test('basicSelectWithGetColumns', () => {
		const builder = getBuilder()
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
})
