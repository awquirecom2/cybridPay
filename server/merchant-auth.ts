import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { requireMerchant, requireMerchantAuthenticated } from "./auth-core";

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
  // Note: Session configuration and passport serialization/deserialization
  // are now handled by auth-core.ts to avoid duplication and conflicts

  // Merchant-specific Passport strategy
  passport.use("merchant-local", 
    new LocalStrategy(async (username, password, done) => {
      const merchant = await storage.getMerchantByUsername(username);
      if (!merchant || !(await comparePasswords(password, merchant.password))) {
        return done(null, false, { message: "Invalid credentials" });
      }
      // Allow pending merchants to log in for onboarding purposes
      // Only block rejected or deactivated merchants
      if (merchant.status === 'rejected' || merchant.status === 'deactivated') {
        return done(null, false, { message: "Account access denied" });
      }
      return done(null, merchant);
    }),
  );

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
      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie('cryptopay.sid');
        res.status(200).json({ success: true });
      });
    });
  });

  app.get("/api/merchant/profile", requireMerchantAuthenticated, (req, res) => {
    res.json(sanitizeMerchant(req.user));
  });

  // Merchant routes protected by requireMerchant middleware are handled individually
  // No global middleware needed here as each route now has specific protection
}