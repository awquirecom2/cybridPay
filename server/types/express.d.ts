// Express type declarations for authentication
import { Admin, Merchant } from "@shared/schema";

declare global {
  namespace Express {
    // Permissive interface that can handle both Admin and Merchant users
    interface User {
      id: string;
      username: string;
      email: string;
      status: string;
      [key: string]: any; // Allow any additional properties
    }
  }
}