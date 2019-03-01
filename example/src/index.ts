import { Capsule } from 'kododb'

new Capsule().setAsGlobal()

console.log(Capsule.table('users').get())
