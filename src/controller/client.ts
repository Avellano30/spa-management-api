import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt, { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import { createUser, deleteUserById, getUserByEmail, getUserById, getUserByUsername, getUsers, updateUserById } from '../schema/client';
import { EmailVerification } from "../templates/email/emailVerification";
import { transporter } from "../config/nodemailer";


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
            const verificationToken = crypto.randomBytes(32).toString("hex");
            const verificationExpires = new Date();
            verificationExpires.setHours(verificationExpires.getHours() + 24); // 24h expiration

            if (!user) {
                await createUser({
                    firstname: decoded.given_name,
                    lastname: decoded.family_name ? decoded.family_name : "",
                    phone: "",
                    username: decoded.sub,
                    email: decoded.email,
                    authentication: {
                        salt: null,
                        password: null,
                        sessionToken: tokens.id_token,
                    },
                    verified: false,
                    verificationToken,
                    verificationExpires,
                })

                // Send verification email
                const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(gmail)}`;

                await transporter.sendMail({
                    from: "eliaschan989@gmail.com",
                    to: gmail,
                    subject: "Verify Your Email",
                    html: EmailVerification({ name: decoded.given_name, link: verificationLink }),
                });

                return res.status(200).json({
                    redirect: "/email-verification?email=" + encodeURIComponent(gmail),
                    message: "New Account created. Please verify your email.",
                });
            }

            // Check verification
            if (!user.verified) {
                return res.status(403).json({
                    redirect: "/email-verification?email=" + encodeURIComponent(gmail),
                    message: "Email not verified. Please check your inbox to verify your email.",
                });
            }

            // Generate a JWT session token
            const sessionToken = jwt.sign({ userId: user._id }, `${process.env.SECRET_KEY}`, { expiresIn: '3h' });

            return res.status(200).json({ token: sessionToken, userId: user._id, firstName: user.firstname, lastName: user.lastname, email: user.email });
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
                    return res.sendStatus(401);
                }

                // Check verification
                if (!user.verified) {
                    return res.status(403).json({
                        redirect: "/email-verification?email=" + encodeURIComponent(email),
                        message: "Email not verified. Please check your inbox to verify your email.",
                    });
                }

                // Generate a JWT session token
                const sessionToken = jwt.sign({ userId: user._id }, `${process.env.SECRET_KEY}`, { expiresIn: '3h' });
                user.authentication.sessionToken = sessionToken;

                await user.save();

                return res.status(200).json({ token: sessionToken, userId: user._id, firstName: user.firstname, lastName: user.lastname, email: user.email });
            } else {
                return res.sendStatus(406);
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

        const security = req.headers["authorization"];
        if (security !== process.env.SECURITY) {
            return res.sendStatus(403);
        }

        const salt = random();
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const verificationExpires = new Date();
        verificationExpires.setHours(verificationExpires.getHours() + 24); // 24h expiration

        // Create user with verified=false
        await createUser({
            firstname,
            lastname,
            email,
            username,
            phone,
            authentication: {
                salt,
                password: authentication(salt, password),
            },
            verified: false,
            verificationToken,
            verificationExpires,
        });

        // Send verification email
        const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;

        await transporter.sendMail({
            from: "eliaschan989@gmail.com",
            to: email,
            subject: "Verify Your Email",
            html: EmailVerification({ name: firstname, link: verificationLink }),
        });

        return res.status(200).json({
            redirect: "/email-verification?email=" + encodeURIComponent(email),
            message: "New Account created. Please verify your email.",
        });
    } catch (err) {
        console.error(err);
        return res.sendStatus(400);
    }
};

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