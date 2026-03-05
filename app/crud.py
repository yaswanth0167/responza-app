def create_user(user: User):
    hashed_password = hash_password(user.password)
    user_dict = user.dict()
    user_dict["password_hash"] = hashed_password
    del user_dict["password"]   # remove plain password

    result = users_collection.insert_one(user_dict)
    return {"message": "User created successfully", "id": str(result.inserted_id)}