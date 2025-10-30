import mongoose, { Schema } from "mongoose";

const COLLECTION_NAME = 'admin';

const UserSchema = new Schema({
    firstname: { type: String, required: true },
    lastname: { type: String, required: true},
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    authentication: {
        password: { type: String, required: false, select: false },
        salt: { type: String, select: false },
        sessionToken: { type: String, select: false },
    }
}, { collection: COLLECTION_NAME });

export const AdminModel = mongoose.model("Admin", UserSchema, COLLECTION_NAME);

export const getUsers = () => AdminModel.find();
export const getUserById = (userId: string) => AdminModel.findById(userId);
export const getUserByEmail = (email: string) => AdminModel.findOne({email});
export const getUserByUsername = (username: string) => AdminModel.findOne({username});
export const getUserBySessionToken = (sessionToken: string) => AdminModel.findOne({'authentication.sessionToken': sessionToken,});

export const createUser = (values: Record<string, any>) => new AdminModel(values).save().then((user) => user.toObject());
export const deleteUserById = (userId: string) => AdminModel.findOneAndDelete({ _id: userId});
export const updateUserById = (userId: string, values: Record<string, any>) => AdminModel.findByIdAndUpdate(userId, values);