import { CommandModule } from 'yargs'
import mysql from 'mysql'

export class InstallCommand implements CommandModule<{}, {}> {
	command = 'install'
	describe = 'Create migration table'

	async handler() {
		// Todo
		console.log('Install migrations')

		const conn = mysql.createConnection({
			host: 'localhost',
			user: 'root',
			password: '',
			database: 'kodo',
		})

		conn.connect()

		conn
			.query('SELECT * FROM users', (err, data) => {
				console.log(err, data)
			})
			.on('end', () => {
				conn.end()
				process.exit(0)
			})
	}
}
