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
        let adminUser = await storage.getAdmin(obj);
        if (adminUser) {
          console.log('Found admin user in legacy session');
          return done(null, adminUser as any);
        }
        let merchantUser = await storage.getMerchant(obj);
        if (merchantUser) {
          console.log('Found merchant user in legacy session');
          return done(null, merchantUser as any);
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

// Helper function to get authoritative session type
function getSessionType(req: any): string | undefined {
  return req.session?.passport?.user?.type;
}

// Utility functions for display logic only (not security)  
export function isAdmin(user: any): user is any {
  return user && 'role' in user;
}

export function isMerchant(user: any): user is any {
  return user && !('role' in user) && 'name' in user;
}

// Portal protection middleware using authoritative session type
export function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated() || !req.user || getSessionType(req) !== 'admin') {
    return res.status(401).json({ error: "Admin authentication required" });
  }
  
  if (req.user.status !== 'active') {
    return res.status(403).json({ error: "Admin account is suspended" });
  }
  
  next();
}

// Light middleware for onboarding - allows pending merchants
export function requireMerchantAuthenticated(req: any, res: any, next: any) {
  if (!req.isAuthenticated() || !req.user || getSessionType(req) !== 'merchant') {
    return res.status(401).json({ error: "Merchant authentication required" });
  }
  
  // Block only rejected/deactivated merchants, allow pending for onboarding
  if (req.user.status === 'rejected' || req.user.status === 'deactivated') {
    return res.status(403).json({ error: "Merchant account access denied" });
  }
  
  next();
}

// Strict middleware for post-approval features - requires approved status
export function requireMerchant(req: any, res: any, next: any) {
  if (!req.isAuthenticated() || !req.user || getSessionType(req) !== 'merchant') {
    return res.status(401).json({ error: "Merchant authentication required" });
  }
  
  if (req.user.status !== 'approved') {
    return res.status(403).json({ error: "Merchant account not approved" });
  }
  
  next();
}

// KYC verification middleware for onramp/offramp features
export function requireMerchantKycVerified(req: any, res: any, next: any) {
  if (!req.isAuthenticated() || !req.user || getSessionType(req) !== 'merchant') {
    return res.status(401).json({ error: "Merchant authentication required" });
  }
  
  // Check KYC completion: kybStatus must be 'verified' or 'approved' and cybridCustomerGuid must be present
  if (!['verified', 'approved'].includes(req.user.kybStatus) || !req.user.cybridCustomerGuid) {
    return res.status(403).json({ 
      error: "KYC verification required to access this feature",
      code: "KYC_REQUIRED",
      message: "Please complete your KYB (Know Your Business) verification to access onramp and offramp features."
    });
  }
  
  next();
}