import { CommandModule } from 'yargs'

export class SeedCommand implements CommandModule<{}, {}> {
	command = 'seed'
	describe = 'Database Seeder'

	async handler() {
		// Todo
		console.log('Seeding database')
	}
}
