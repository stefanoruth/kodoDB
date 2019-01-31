import { Fluent, buildFluent, ArrayProxy } from '../src/Utils/Fluent'

describe('Fluent', () => {
	test.only('AttributesAreSetByConstructor', () => {
		const obj = {
			name: 'Foobar',
			age: 25,
		}

		// const fluent = new Fluent(obj)
		const fluent = buildFluent(obj)

		console.log(fluent.demo)

		expect(fluent.getAttributes()).toBe(true)

		const arrayProxy = new ArrayProxy(['da'])

		arrayProxy.customFunction()

		arrayProxy.push('der')

		expect(arrayProxy).toBe(true)

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
