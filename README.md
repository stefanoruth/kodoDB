# kodoDB

## Example

UserModel.ts

```typescript
import { Model, SoftDeletes } from 'kodo-db'
import { Role } from './Role'

export class User extends Model implements SoftDeletes {
	attributes = ['id', 'name', 'email', 'password', 'avatar', 'meta', 'email_verified_at']

	dates = [
		'email_verified_at', // Date Object
	]

	casts = {
		meta: 'json', // Format fields as object and saves as json in db column
	}

	roles() {
		return this.belongsToMany(Role)
	}
}
```

Usage.ts

```typescript
import { User } from './UserModel.ts'

User.where('email', 'user@example.com')->firstOrFail()
User.all()
User.where('created_at', '>', '2019-01-24 00:00:00')->get()
User.with('roles.permission')->find(1)

const user = new User()

user.name = 'John Doe'
user.email = 'johndoe@example.com'

user.save()
user.delete()
```
