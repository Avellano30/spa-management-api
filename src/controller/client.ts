import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt, { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import { createUser, deleteUserById, getUserByEmail, getUserById, getUserByUsername, getUsers, updateUserById } from '../schema/client';


const random = () => crypto.randomBytes(128).toString('base64');

const authentication = (salt: string, password: string) => {
    return crypto.createHmac('sha256', [salt, password].join('/')).update(`${process.env.PASSWORD_SECRET}`).digest('hex');;
}

export const clientSignIn = async (req: Request, res: Response) => {
    const oAuth2Client = new OAuth2Client(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        'postmessage',
    );

    const { code, email, password } = req.body;

    if (code) {
        // Handle OAuth 2.0 login
        try {
            const { tokens } = await oAuth2Client.getToken(code);
            const decoded = jwt.decode(String(tokens.id_token)) as JwtPayload;
            const gmail = decoded?.email;
            const user = await getUserByEmail(gmail);

            if (!user) {
                return res.sendStatus(403);
            }

            return res.status(200).json({ tokens, firstName: user.firstname, lastName: user.lastname, email: user.email });
        } catch (error) {
            console.error('Error exchanging code for tokens:', error);
            return res.status(400).json({
                error: 'invalid_request',
                error_description: 'Could not determine client ID from request.'
            });
        }
    } else if (email && password) {
        // Handle manual login
        try {
            const user = await getUserByEmail(email).select('+authentication.salt +authentication.password');

            if (!user) {
                return res.sendStatus(400);
            }

            if (user.authentication && user.authentication.salt) {
                const expectedHash = authentication(user.authentication.salt, password);

                if (user.authentication.password !== expectedHash) {
                    return res.sendStatus(403);
                }

                // Generate a JWT session token
                const sessionToken = jwt.sign({ userId: user._id }, `${process.env.SECRET_KEY}`, { expiresIn: '3h' });
                user.authentication.sessionToken = sessionToken;

                await user.save();

                return res.status(200).json({ token: sessionToken, firstName: user.firstname, lastName: user.lastname, email: user.email });
            }
        } catch (err) {
            console.error(err);
            return res.sendStatus(400);
        }
    } else {
        // If neither OAuth 2.0 nor manual login credentials are provided
        return res.sendStatus(400);
    }
};

export const clientSignUp = async (req: Request, res: Response) => {
    try {
        const { firstname, lastname, username, email, password, phone } = req.body;

        if (!email || !password || !username || !phone) {
            return res.status(400).json({ error: "Missing required fields." });
        }

        const existingUser = await getUserByUsername(username);
        const existingEmail = await getUserByEmail(email);

        if (existingUser || existingEmail) {
            return res.status(400).json({ error: "User already exists." });
        }

        const security = req.headers['authorization'];

        if (security !== process.env.SECURITY) {
            return res.sendStatus(403);
        }

        const salt = random();
        const user = await createUser({
            firstname,
            lastname,
            email,
            username,
            phone,
            authentication: {
                salt,
                password: authentication(salt, password),
            },
        });

        if (user.authentication && user.authentication.salt) {
            const expectedHash = authentication(user.authentication.salt, password);

            if (user.authentication.password !== expectedHash) {
                return res.sendStatus(403);
            }

            // Generate a JWT session token
            const sessionToken = jwt.sign({ userId: user._id }, `${process.env.SECRET_KEY}`, { expiresIn: '3h' });
            user.authentication.sessionToken = sessionToken;

            return res.status(200).json({ token: sessionToken, firstname: user.firstname, lastname: user.lastname, email: user.email });
        }
    } catch (err) {
        console.error(err);
        return res.sendStatus(400);
    }
}

export const getClients = async (req: Request, res: Response) => {
  try {
    const clients = await getUsers();
    return res.status(200).json(clients);
  } catch (err) {
    console.error(err);
    return res.sendStatus(400);
  }
};

export const updateClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({ message: "Client ID is required." });
    }

    const existingClient = await getUserById(id);
    if (!existingClient) {
      return res.status(404).json({ message: "Client not found." });
    }

    const updatedClient = await updateUserById(id, updates);

    return res.status(200).json({
      message: "Client updated successfully.",
      client: updatedClient,
    });
  } catch (error) {
    console.error("Error updating client:", error);
    return res.status(500).json({ message: "Server error." });
  }
};


export const deleteClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deleteUserById(id);
    return res.status(200).json({ message: "Client deleted." });
  } catch (err) {
    console.error(err);
    return res.sendStatus(400);
  }
};