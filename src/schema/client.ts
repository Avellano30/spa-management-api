import mongoose, { Schema, Document } from "mongoose";

export interface IClient extends Document {
	firstname: string;
	lastname: string;
	username: string;
	email: string;
	phone?: string;
	status: "active" | "inactive" | "banned";
	authentication: {
		password?: string;
		salt?: string;
		sessionToken?: string;
	};
}

const ClientSchema = new Schema<IClient>(
	{
		firstname: { type: String, required: true },
		lastname: { type: String, required: true },
		username: { type: String, required: true, unique: true },
		email: { type: String, required: true, unique: true },
		phone: { type: String, required: false },
		status: { type: String, enum: ["active", "inactive", "banned"], default: "active" },
		authentication: {
			password: { type: String, select: false },
			salt: { type: String, select: false },
			sessionToken: { type: String, select: false },
		},
	},
	{ timestamps: true }
);

export const ClientModel = mongoose.model<IClient>("Client", ClientSchema);

// Query helpers
export const getUsers = () => ClientModel.find();
export const getUserById = (userId: string) => ClientModel.findById(userId);
export const getUserByEmail = (email: string) => ClientModel.findOne({ email });
export const getUserByUsername = (username: string) => ClientModel.findOne({ username });
export const getUserBySessionToken = (sessionToken: string) => ClientModel.findOne({ 'authentication.sessionToken': sessionToken, });

export const createUser = (values: Record<string, any>) => new ClientModel(values).save().then((user) => user.toObject());
export const deleteUserById = (userId: string) => ClientModel.findByIdAndDelete(userId);
export const updateUserById = (userId: string, values: Record<string, any>) => ClientModel.findByIdAndUpdate(userId, values);