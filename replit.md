# Overview

This is a cryptocurrency payment platform called "Ruupay" that enables merchants to receive crypto payments and convert them to fiat currency. The platform provides two main portals: an Administration Portal for platform management and a Merchant Portal for business onboarding and payment processing. The system integrates with Transak for fiat-to-crypto conversion and Cybrid for custodial wallet services, creating a comprehensive fintech solution for cryptocurrency payment processing.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development tooling
- **Styling**: Tailwind CSS with shadcn/ui component library using "new-york" style variant
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for client-side routing with role-based route protection
- **UI Components**: Radix UI primitives with custom theming supporting dark/light modes
- **Forms**: React Hook Form with Zod validation via @hookform/resolvers

## Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ESM modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Management**: Connect-pg-simple for PostgreSQL-backed sessions
- **Build System**: ESBuild for production bundling, TSX for development

## Database Design
- **ORM**: Drizzle with Neon serverless PostgreSQL connection
- **Schema**: Shared schema definition in TypeScript with Zod validation
- **Migrations**: Drizzle Kit for schema migrations
- **Connection**: WebSocket-enabled connection pool for serverless compatibility

## Authentication & Authorization
- **Role-based Access**: Three user roles (admin, merchant, customer) with route-level protection
- **Session Storage**: Server-side sessions stored in PostgreSQL
- **Route Guards**: Client-side role checking based on URL patterns (/admin, /merchant)

## UI/UX Design System
- **Design Reference**: Modern fintech platforms (Stripe, Coinbase, Plaid) with Material Design influences
- **Color Palette**: Professional dark/light theme with cryptocurrency-focused accent colors
- **Typography**: Inter font family with SF Mono for technical data
- **Component Library**: Comprehensive set including forms, data tables, charts, and specialized crypto components

## Key Business Features
- **Self-Service Merchant Registration**: Configurable signup links with automatic Cybrid customer creation (individual/business types)
- **KYB Onboarding**: Multi-step business verification with document upload
- **Payment Processing**: Crypto receive and fiat offramp capabilities
- **Merchant Management**: Admin tools for merchant approval and monitoring
- **Fee Configuration**: Flexible fee structure with global and per-merchant rates
- **Webhook Management**: Event handling for payment and status updates
- **Account Management**: Custodial wallet integration with balance tracking

# External Dependencies

## Third-party Services
- **Transak**: Fiat-to-crypto payment gateway for customer purchases
- **Cybrid**: Cryptocurrency custodial services and trading accounts
- **Stripe**: Payment processing infrastructure (React components included)
- **Neon Database**: Serverless PostgreSQL hosting

## Development Tools
- **Replit**: Development environment with integrated database provisioning
- **Vite**: Frontend build tool with React plugin and runtime error overlay
- **Drizzle Kit**: Database schema management and migration tools

## UI Libraries
- **Radix UI**: Accessible component primitives for complex interactions
- **Recharts**: Data visualization library for analytics dashboards
- **Lucide React**: Icon library for consistent iconography
- **Class Variance Authority**: Utility for component variant management

## Validation & Forms
- **Zod**: Runtime type validation for forms and API data
- **React Hook Form**: Form management with validation integration
- **Date-fns**: Date manipulation and formatting utilities

## Styling & Theming
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS**: CSS processing with autoprefixer
- **CSS Variables**: Dynamic theming system for dark/light mode support