import { Express } from "express";
import session from "express-session";
import passport from "passport";
import { storage } from "./storage";

/**
 * Centralized authentication core for both admin and merchant authentication
 * This module handles session configuration and passport serialization/deserialization
 */

export function initAuthCore(app: Express): void {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Centralized session configuration
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
    name: 'cryptopay.sid',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: storage.sessionStore,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: isProduction ? 'strict' : 'lax',
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Unified serialization for both admin and merchant users
  passport.serializeUser((user: any, done) => {
    // Determine user type based on presence of 'role' field (admins have role, merchants don't)
    const userType = 'role' in user ? 'admin' : 'merchant';
    done(null, { id: user.id, type: userType });
  });
  
  // Unified deserialization for both admin and merchant users
  passport.deserializeUser(async (obj: any, done) => {
    try {
      // Handle legacy string IDs (backward compatibility)
      if (typeof obj === 'string') {
        console.log('Legacy session detected, attempting dual lookup for ID:', obj);
        // Try admin first, then merchant
        let user = await storage.getAdmin(obj);
        if (user) {
          console.log('Found admin user in legacy session');
          return done(null, user as any);
        }
        user = await storage.getMerchant(obj);
        if (user) {
          console.log('Found merchant user in legacy session');
          return done(null, user as any);
        }
        console.log('No user found for legacy session ID');
        return done(null, false);
      }
      
      // Handle new object format { id, type }
      if (obj && obj.type === 'admin') {
        const admin = await storage.getAdmin(obj.id);
        done(null, admin);
      } else if (obj && obj.type === 'merchant') {
        const merchant = await storage.getMerchant(obj.id);
        done(null, merchant);
      } else {
        done(null, false);
      }
    } catch (error) {
      done(error);
    }
  });
}

// Utility functions for checking user types
export function isAdmin(user: any): user is any {
  return user && 'role' in user;
}

export function isMerchant(user: any): user is any {
  return user && !('role' in user) && 'name' in user;
}

// Portal protection middleware
export function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated() || !req.user || !isAdmin(req.user)) {
    return res.status(401).json({ error: "Admin authentication required" });
  }
  
  if (req.user.status !== 'active') {
    return res.status(403).json({ error: "Admin account is suspended" });
  }
  
  next();
}

export function requireMerchant(req: any, res: any, next: any) {
  if (!req.isAuthenticated() || !req.user || !isMerchant(req.user)) {
    return res.status(401).json({ error: "Merchant authentication required" });
  }
  
  if (req.user.status !== 'approved') {
    return res.status(403).json({ error: "Merchant account not approved" });
  }
  
  next();
}