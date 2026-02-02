import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, userPublicSchema } from "@shared/schema";
import { api } from "@shared/routes";
import { z } from "zod";
import { sendEmail } from "./email";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

function sanitizeUser(user: User) {
  return userPublicSchema.parse(user);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function setupAuth(app: Express) {
  const isProd = app.get("env") === "production";
  const useSecureCookies = isProd && process.env.COOKIE_SECURE !== "false";
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "r3pl1t_s3cr3t_k3y",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      sameSite: useSecureCookies ? "none" : "lax",
      secure: useSecureCookies,
    },
  };

  if (isProd) {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user =
        (await storage.getUserByUsername(username)) ??
        (await storage.getUserByEmail(username));
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      }
      return done(null, user);
    }),
  );

  passport.serializeUser((user, done) => done(null, (user as User).id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const existingUser = await storage.getUserByUsername(input.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const existingEmail = await storage.getUserByEmail(input.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await hashPassword(input.password);
      const user = await storage.createUser({
        ...input,
        password: hashedPassword,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(sanitizeUser(user));
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      next(err);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(sanitizeUser(req.user as User));
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(sanitizeUser(req.user as User));
  });

  app.post(api.auth.forgotPassword.path, async (req, res) => {
    try {
      const input = api.auth.forgotPassword.input.parse(req.body);
      const user = await storage.getUserByEmail(input.email);

      if (user) {
        const token = randomBytes(32).toString("hex");
        const tokenHash = hashToken(token);
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
        await storage.createPasswordReset(user.id, tokenHash, expiresAt);

        const baseUrl = process.env.APP_BASE_URL || "http://localhost:5000";
        const resetLink = `${baseUrl}/reset-password/${token}`;

        await sendEmail({
          to: user.email,
        subject: "Reset your SpendWisely passcode",
          text: `Use the link below to reset your passcode. This link expires in 1 hour.\n\n${resetLink}`,
        });
      }

      res.status(200).json({ message: "If that email exists, a reset link has been sent." });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.post(api.auth.resetPassword.path, async (req, res) => {
    try {
      const input = api.auth.resetPassword.input.parse(req.body);
      const tokenHash = hashToken(input.token);
      const reset = await storage.getPasswordResetByToken(tokenHash);

      if (!reset || reset.expiresAt < new Date()) {
        return res.status(400).json({ message: "Reset token is invalid or expired." });
      }

      const hashedPassword = await hashPassword(input.password);
      await storage.updateUserPassword(reset.userId, hashedPassword);
      await storage.markPasswordResetUsed(reset.id);

      res.status(200).json({ message: "Passcode updated." });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });
}
