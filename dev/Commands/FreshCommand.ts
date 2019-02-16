import { CommandModule } from 'yargs'

export class FreshCommand implements CommandModule<{}, {}> {
	command = 'fresh'
	describe = 'Database Reset'

	async handler() {
		// Todo
		console.log('Resetting database')
	}
}
