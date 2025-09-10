# Design Guidelines: Cryptocurrency Payment Platform

## Design Approach
**Selected Approach:** Design System + Industry Reference  
**Primary Reference:** Modern fintech platforms (Stripe, Coinbase, Plaid)  
**Design System:** Custom system with Material Design influences  
**Justification:** Financial platforms require trust, security, and clarity while maintaining modern aesthetics for user confidence.

## Core Design Elements

### Color Palette
**Primary Colors:**
- Dark mode: 220 15% 12% (deep blue-gray background)
- Light mode: 220 20% 98% (off-white background)
- Brand primary: 240 100% 60% (vibrant blue)
- Brand secondary: 220 25% 25% (dark slate)

**Accent Colors:**
- Success: 142 70% 45% (crypto green)
- Warning: 38 100% 50% (amber)
- Error: 0 65% 55% (red)
- Info: 200 100% 70% (light blue)

**Semantic Colors:**
- Text primary (dark): 220 15% 95%
- Text secondary (dark): 220 10% 70%
- Border: 220 20% 20%

### Typography
**Font Stack:** Inter (Google Fonts) + SF Mono (monospace)
- **Headings:** Inter 600-700 weight
- **Body:** Inter 400-500 weight
- **Code/Addresses:** SF Mono 400 weight
- **Scale:** text-xs to text-4xl following Tailwind defaults

### Layout System
**Spacing Units:** Consistent use of Tailwind units 2, 4, 6, 8, 12, 16
- **Container padding:** p-4 (mobile), p-6 (tablet), p-8 (desktop)
- **Section spacing:** mb-8, mb-12, mb-16
- **Component spacing:** gap-4, gap-6

### Component Library

**Navigation:**
- Top navigation with logo, user menu, and role indicators
- Sidebar navigation for admin/merchant portals
- Breadcrumb navigation for deep pages
- Tab navigation for multi-step flows

**Forms:**
- KYB forms with clear validation states
- File upload areas with drag-and-drop
- Multi-step form progress indicators
- Currency selectors with crypto icons

**Data Displays:**
- Merchant dashboard tables with sorting/filtering
- Transaction history with status indicators
- Balance cards with crypto/fiat amounts
- API key management with copy functions

**Feedback Elements:**
- Toast notifications for actions
- Loading states for blockchain operations
- Status badges (pending, approved, rejected)
- Error boundaries with retry options

## Visual Treatment

**Professional Crypto Aesthetic:**
- Clean, minimal design emphasizing trust and security
- Subtle gradients: 240 100% 60% to 260 100% 55% for hero sections
- Consistent use of crypto iconography (Heroicons + custom crypto symbols)
- Dark mode as primary experience with light mode option

**Interactive Elements:**
- Hover states with subtle scale (hover:scale-105)
- Focus rings for accessibility
- Smooth transitions (transition-all duration-200)
- Disabled states clearly differentiated

**Layout Characteristics:**
- Card-based design with subtle shadows
- Generous whitespace for scanning
- Consistent border radius (rounded-lg, rounded-xl)
- Responsive grid layouts (grid-cols-1 md:grid-cols-2 xl:grid-cols-3)

## Images
**Hero Section:** Abstract geometric pattern or blockchain visualization as background
**Dashboard Icons:** Cryptocurrency logos and status indicators throughout tables
**Empty States:** Friendly illustrations for no transactions/merchants
**Document Upload:** Visual indicators for file types and upload progress

No large hero image required - focus on dashboard functionality and data presentation.