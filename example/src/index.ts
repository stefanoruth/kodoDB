import { Capsule, config, setConfig, Configuration } from 'kododb'

new Capsule().setAsGlobal().addConnection({
	driver: 'mysql',
	host: 'localhost',
	database: 'kodo',
	username: 'root',
})

// console.log(config)

console.log(
	Capsule.table('users', 'default')
		.where('email', '=', 'stefano')
		.toSql()
)
