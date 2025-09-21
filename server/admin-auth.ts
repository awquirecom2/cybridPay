import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import type { Express } from "express";
import { storage } from "./storage";
import { adminLoginSchema } from "@shared/schema";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const [salt, key] = hashedPassword.split(':');
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
  return timingSafeEqual(keyBuffer, derivedKey);
}

export function generateAdminCredentials(): { username: string; password: string } {
  // Generate secure admin credentials
  const adjectives = ['admin', 'super', 'chief', 'lead', 'senior', 'principal'];
  const nouns = ['user', 'admin', 'manager', 'operator', 'controller'];
  const numbers = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  const username = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${numbers}`;
  
  // Generate secure password
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return { username, password };
}

export function setupAdminAuth(app: Express): void {
  // Note: Session configuration is handled in merchant-auth.ts to avoid duplication
  // Both admin and merchant authentication share the same session store
  
  // Configure admin local strategy
  passport.use('admin-local', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
  }, async (username, password, done) => {
    try {
      const admin = await storage.getAdminByUsername(username);
      if (!admin) {
        return done(null, false, { message: 'Invalid username or password' });
      }

      // Check if admin is active
      if (admin.status !== 'active') {
        return done(null, false, { message: 'Admin account is suspended' });
      }

      const passwordValid = await verifyPassword(password, admin.password);
      if (!passwordValid) {
        return done(null, false, { message: 'Invalid username or password' });
      }

      // Update last login timestamp
      await storage.updateAdminLastLogin(admin.id);

      return done(null, admin as any);
    } catch (error) {
      return done(error);
    }
  }));

  // Utility function to sanitize admin data (remove password)
  const sanitizeAdmin = (admin: any) => {
    if (!admin) return null;
    const { password, ...sanitized } = admin;
    return sanitized;
  };

  // Admin authentication routes
  app.post("/api/admin/login", (req, res, next) => {
    passport.authenticate("admin-local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ error: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }
      
      req.logIn(user, (err: any) => {
        if (err) {
          return res.status(500).json({ error: "Login failed" });
        }
        return res.status(200).json({
          success: true,
          admin: sanitizeAdmin(user)
        });
      });
    })(req, res, next);
  });

  app.post("/api/admin/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie('cryptopay.sid');
        res.status(200).json({ success: true });
      });
    });
  });

  app.get("/api/admin/profile", (req, res) => {
    if (!req.isAuthenticated() || !req.user || !('role' in req.user)) {
      return res.status(401).json({ error: "Not authenticated as admin" });
    }
    res.json(sanitizeAdmin(req.user));
  });

  // Middleware to protect admin routes
  app.use("/api/admin", async (req, res, next) => {
    // Allow bootstrap route (must be first check)
    if (req.originalUrl.startsWith("/api/admin/bootstrap") && req.method === "POST") {
      return next();
    }

    // Allow login/logout/profile routes to pass through
    if (req.path === "/login" || req.path === "/logout" || req.path === "/profile") {
      return next();
    }

    // Check if user is authenticated and is an admin
    if (!req.isAuthenticated() || !req.user || !('role' in req.user)) {
      return res.status(401).json({ error: "Admin authentication required" });
    }

    // Check if admin is active
    const admin = req.user as any;
    if (admin.status !== 'active') {
      return res.status(403).json({ error: "Admin account is suspended" });
    }

    next();
  });
}