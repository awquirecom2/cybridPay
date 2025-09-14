import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { Merchant } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends Merchant {}
  }
}

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

export function generateMerchantCredentials() {
  const username = `merchant_${randomBytes(4).toString('hex')}`;
  const password = randomBytes(8).toString('base64').replace(/[+/=]/g, '').substring(0, 12);
  return { username, password };
}

export function setupMerchantAuth(app: Express) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
    name: 'cryptopay.sid', // Custom session name to avoid default
    resave: false,
    saveUninitialized: false,
    rolling: true, // Extend session on activity
    store: storage.sessionStore,
    cookie: {
      secure: isProduction, // HTTPS only in production
      httpOnly: true, // Prevent XSS attacks
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Merchant-specific Passport strategy
  passport.use("merchant-local", 
    new LocalStrategy(async (username, password, done) => {
      const merchant = await storage.getMerchantByUsername(username);
      if (!merchant || !(await comparePasswords(password, merchant.password))) {
        return done(null, false, { message: "Invalid credentials" });
      }
      if (merchant.status !== "approved") {
        return done(null, false, { message: "Account not approved" });
      }
      return done(null, merchant);
    }),
  );

  // Enhanced serialization to handle both admin and merchant users
  passport.serializeUser((user: any, done) => {
    // Determine user type based on presence of 'role' field (admins have role, merchants don't)
    const userType = 'role' in user ? 'admin' : 'merchant';
    done(null, { id: user.id, type: userType });
  });
  
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
          return done(null, user);
        }
        console.log('No user found for legacy session ID');
        return done(null, false);
      }
      
      // Handle new object format { id, type }
      if (obj && obj.type === 'admin') {
        const admin = await storage.getAdmin(obj.id);
        done(null, admin as any);
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

  // Utility function to sanitize merchant data (remove password)
  const sanitizeMerchant = (merchant: any) => {
    if (!merchant) return null;
    const { password, ...sanitized } = merchant;
    return sanitized;
  };

  // Merchant authentication routes
  app.post("/api/merchant/login", passport.authenticate("merchant-local"), (req, res) => {
    res.status(200).json({
      success: true,
      merchant: sanitizeMerchant(req.user)
    });
  });

  app.post("/api/merchant/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ success: true });
    });
  });

  app.get("/api/merchant/profile", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(sanitizeMerchant(req.user));
  });

  // Middleware to protect merchant routes
  app.use("/api/merchant", (req, res, next) => {
    if (req.path === "/login" || req.path === "/logout") {
      return next();
    }
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    next();
  });
}