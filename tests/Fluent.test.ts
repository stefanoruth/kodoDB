import { Fluent, buildFluent } from '../src/Utils/Fluent'

describe('Fluent', () => {
	test.only('AttributesAreSetByConstructor', () => {
		const obj = {
			name: 'Foobar',
			age: 25,
		}

		// const fluent = new Fluent(obj)
		const fluent = buildFluent(obj)

		// console.log(fluent)

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
