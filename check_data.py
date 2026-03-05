from app.db import users_collection

users = list(users_collection.find({}))
print(f"Total users: {len(users)}")
for user in users:
    print(f"ID: {user['_id']}, Email: {user.get('email')}, Name: {user.get('first_name')} {user.get('last_name')}")