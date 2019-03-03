import { Capsule, config, setConfig, Configuration } from 'kododb'

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

const query = Capsule.table('users', '  ')

query
	.where('email', '=', 'stefano')
	.whereIn('status', ['active', 'inactive'])
	.where('active', true)

console.log(buildQuery(query.toSql(), query.getBindings()))

// export const default = {}