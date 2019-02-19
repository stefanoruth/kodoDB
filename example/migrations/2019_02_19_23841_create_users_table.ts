import { Migration, Schema, Blueprint } from 'kodoDB'

export class CreateUsersTable extends Migration {
    /**
     * Run the migrations.
     */
    run() {
        Schema.create('users', (table: Blueprint) {
            table.increments('id')
            table.timestamps();
        });
    }
}
