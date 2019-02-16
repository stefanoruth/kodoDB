import { CommandModule } from 'yargs'

export class MigrateCommand implements CommandModule<{}, {}> {
	command = 'migrate'
	describe = 'Migrate the database'

	async handler() {
		// Todo
		console.log('Migrate')
	}
}
