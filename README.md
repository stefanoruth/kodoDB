# kodoDB

## Example

UserModel.ts
```typescript
import { Model, SoftDeletes } from 'kodo-db'

export class User extends Model implements SoftDeletes {
    attributes = [
      'id',
      'name',
      'email',
      'password',
      'avatar',
    ]
}
```

Usage.ts
```typescript
import { User } from './UserModel.ts'

User.where('email', 'user@example.com')->firstOrFail()
User.all()
User.where('created_at', '>', '2019-01-24 00:00:00')->get()

const user = new User()

user.name = 'John Doe'
user.email = 'johndoe@example.com'

user.save()
```
