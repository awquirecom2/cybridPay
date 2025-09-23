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

  // Password reset endpoints (no authentication required)
  app.post("/api/admin/request-password-reset", async (req, res) => {
    try {
      const { identifier } = req.body; // Can be username or email
      
      if (!identifier) {
        return res.status(400).json({ error: "Username or email is required" });
      }

      // Find admin by username or email
      let admin = await storage.getAdminByUsername(identifier);
      if (!admin) {
        admin = await storage.getAdminByEmail(identifier);
      }

      // Always return success to prevent username/email enumeration
      if (!admin) {
        return res.status(200).json({ 
          success: true, 
          message: "If an admin account with that identifier exists, a password reset token has been generated."
        });
      }

      // Check if admin is active
      if (admin.status !== 'active') {
        return res.status(200).json({ 
          success: true, 
          message: "If an admin account with that identifier exists, a password reset token has been generated."
        });
      }

      // Generate secure reset token
      const crypto = await import('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store reset token
      await storage.updateAdminResetToken(admin.id, resetToken, resetTokenExpiry);

      // In production, you would send an email with the reset link
      // For now, we'll just return the token for testing
      console.log(`Password reset token for ${admin.username}: ${resetToken}`);
      console.log(`Reset URL: /admin/reset-password?token=${resetToken}`);

      res.status(200).json({ 
        success: true, 
        message: "Password reset token has been generated. Check the server logs for the reset link.",
        // In production, remove this - only for development
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
      });

    } catch (error) {
      console.error("Error requesting password reset:", error);
      res.status(500).json({ error: "Failed to process password reset request" });
    }
  });

  app.post("/api/admin/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      // Validate password strength
      if (newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters long" });
      }

      // Find admin by reset token (includes expiry check)
      const admin = await storage.getAdminByResetToken(token);
      if (!admin) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Check if admin is active
      if (admin.status !== 'active') {
        return res.status(403).json({ error: "Admin account is suspended" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password and clear reset token
      await storage.updateAdmin(admin.id, { password: hashedPassword });
      await storage.clearAdminResetToken(admin.id);

      console.log(`Password reset successful for admin: ${admin.username}`);

      res.status(200).json({ 
        success: true, 
        message: "Password has been reset successfully. You can now log in with your new password."
      });

    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Middleware to protect admin routes
  app.use("/api/admin", async (req, res, next) => {
    // Allow bootstrap route (must be first check)
    if (req.originalUrl.startsWith("/api/admin/bootstrap") && req.method === "POST") {
      return next();
    }

    // Allow login/logout/profile/password-reset routes to pass through
    if (req.path === "/login" || req.path === "/logout" || req.path === "/profile" || 
        req.path === "/request-password-reset" || req.path === "/reset-password") {
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