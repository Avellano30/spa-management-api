import mongoose, { Schema, Document } from "mongoose";

export interface IAdmin extends Document {
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  authentication: {
    password?: string;
    salt?: string;
    sessionToken?: string;
  };
}

const AdminSchema = new Schema<IAdmin>({
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  authentication: {
    password: { type: String, select: false },
    salt: { type: String, select: false },
    sessionToken: { type: String, select: false },
  },
}, { collection: "admin" });

export const AdminModel = mongoose.model<IAdmin>("Admin", AdminSchema);

export const getUsers = () => AdminModel.find();
export const getUserById = (userId: string) => AdminModel.findById(userId);
export const getUserByEmail = (email: string) => AdminModel.findOne({email});
export const getUserByUsername = (username: string) => AdminModel.findOne({username});
export const getUserBySessionToken = (sessionToken: string) => AdminModel.findOne({'authentication.sessionToken': sessionToken,});

export const createUser = (values: Record<string, any>) => new AdminModel(values).save().then((user) => user.toObject());
export const deleteUserById = (userId: string) => AdminModel.findOneAndDelete({ _id: userId});
export const updateUserById = (userId: string, values: Record<string, any>) => AdminModel.findByIdAndUpdate(userId, values);