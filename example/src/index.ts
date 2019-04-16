import { Capsule, config, setConfig, Configuration } from 'kododb'
import { User } from './models/User'

new Capsule().setAsGlobal().addConnection({
	driver: 'mysql',
	host: 'localhost',
	database: 'kodo',
	username: 'root',
})

const buildQuery = (query: string, values: any[]): string => {
	values.forEach(binding => {
		let value

		if (typeof binding === 'string') {
			value = `"${binding}"`
		} else if (typeof binding === 'number' || typeof binding === 'bigint') {
			value = `${binding}`
		} else if (typeof binding === 'boolean') {
			value = `${binding ? 1 : 0}`
		} else {
			value = '""'
		}

		query = query.replace('?', value)
	})

	return query
}

const q = Capsule.table('users', 'default')

q.where('email', '=', 'stefano')
	.whereIn('status', ['active', 'inactive'])
	.where('active', true)

// console.log(buildQuery(q.toSql(), q.getBindings()))

const u1 = new User({ id: 1 })
console.log(u1)
