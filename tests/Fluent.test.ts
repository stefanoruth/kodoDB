import { Fluent } from '../src/Utils/Fluent'

describe('Fluent', () => {
	test.only('AttributesAreSetByConstructor', () => {
		const fluent = Fluent()

		fluent.foo = true

		expect(fluent.foo).toBe(true)

		fluent.bar = 'foobar'

		expect(fluent.bar).toBe('foobar')

		console.log(fluent.attributes)

		expect(fluent.foo).toBe(true)
		expect(fluent.getAttribute('foo')).toBe(true)

		fluent.nullable()

		expect(fluent.nullable).toBe(true)

		// console.log(fluent)

		// expect(fluent.getAttributes()).toBe(obj)
		// expect(fluent.name).toBe(obj.name)

		// $refl = new ReflectionObject($fluent);
		// $attributes = $refl -> getProperty('attributes');
		// $attributes -> setAccessible(true);
		// $this -> assertEquals($array, $attributes -> getValue($fluent));
		// $this -> assertEquals($array, $fluent -> getAttributes());
	})
})
