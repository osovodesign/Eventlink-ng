# EventLink

**Every Event. The Right People.**

EventLink is an event-services marketplace helping people planning events in **Warri and Effurun, Delta State, Nigeria** discover, evaluate, compare, and contact suitable venues and event professionals.

---

## Technical Stack

- **Frontend:** React 19, TypeScript (strict mode), Tailwind CSS v4, Lucide React
- **Backend & Persistence:** Firebase Authentication & Cloud Firestore (`ai-studio-eventlink-f3ff492a-b0dd-475b-b57c-78cec063ac7f`)
- **Security Governance:** Payload-First Security TDD (`security_spec.md`, `firestore.rules`, `firestore.rules.test.ts`, `@firebase/eslint-plugin-security-rules`)
- **Brand Tokens:** Deep Navy (`#142B4A`), Cobalt Blue (`#4778D8`), Light Grey (`#F4F6F9`), White (`#FFFFFF`)
- **Typography:** Manrope (headings) + Inter (body/UI)

---

## Key Application Routes

- `/` — Public Marketplace Discovery Homepage (Warri & Effurun)
- `/search` & `/categories/:slug` — Faceted Venue & Service Provider Search
- `/venues/:slug` & `/vendors/:slug` — Public Listing Detail, Gallery, Packages & Enquiry Modal
- `/saved` — Customer Saved Shortlist
- `/compare` — Side-by-Side Venue Comparison Table (up to 3 venues)
- `/enquiries` — Customer Enquiries, Planned Events & Vendor Quotations Workspace
- `/vendor` — Vendor Organization, Listing Editor, Media Manager & Enquiries/Quotes Workspace
- `/admin` — Platform Administration, Listing Moderation, Community Reports, Audit Logs & Live Smoke-Test Suite
- `/account` — Account Settings, In-App Notifications, NDPA JSON Data Export & Account Deletion
- `/privacy`, `/terms`, `/support` — Legal, Privacy Policy, Terms of Service & Support Center

---

## Development & Verification Commands

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment variables:**
   Copy `.env.example` to `.env` if needed. Never commit real secrets or production credentials.

3. **Start development server (Port 3000):**
   ```bash
   npm run dev
   ```

4. **Type-check / Lint (`tsc --noEmit`):**
   ```bash
   npm run lint
   ```

5. **Audit Firestore security rules (`eslint`):**
   ```bash
   npx eslint firestore.rules
   ```

6. **Production build (`vite build`):**
   ```bash
   npm run build
   ```

See [`LAUNCH_READINESS.md`](./LAUNCH_READINESS.md) for the Phase 11 Quality, Security, Rollback Plan, and Launch-Day Smoke-Test Checklist.
