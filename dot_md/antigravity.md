# Coding Guidelines & Rules

## 1. Project Structure & Architecture
- **Layered Modules:** Encapsulate modules inside `src/modules/<ModuleName>` with:
  - `controllers/` - Express route handlers.
  - `routes/` - Route declarations.
  - `validations/` - Zod schema validation definitions.
- **Middlewares & Configs:** Keep shared configurations under `src/config` and reusable middlewares in `src/middleware`.
- **Routing Hub:** Mount modules under `/v1` prefix in `src/apiRoutes.js`.

## 2. Language & Code Style
- **ES Modules:** Use ES Modules (`import`/`export`). Explicitly include `.js` extension for local imports.
- **Naming Conventions:**
  - Functions, variables, and code files: `camelCase` (e.g., `verifyToken`, `roles.controller.js`).
  - Database collections: `snake_case` (e.g., `refresh_tokens`).
- **Formatting:** Keep code legible by spacing out logic blocks.

## 3. Database Guidelines
- **Raw MongoDB:** Use the official `mongodb` driver (no Mongoose).
- **Access:** Initialize the client in `mongoConnect.js` and query via `db(dbName, collectionName)` from `mongo.js`.
- **ID Validation:** Always check IDs using `ObjectId.isValid(id)` before querying with `new ObjectId(id)`.

## 4. Validation & Security
- **Zod Validation:** All route inputs (body) must be validated via Zod schemas and the `validate(schema)` middleware.
- **Auth Flow:** Standardize JWT access tokens (15-min expiry) paired with database-backed random refresh tokens.
- **Access Control:** Secure endpoints with `verifyToken` and role-based `permission("permission_name")` middlewares.
- **Error Handling:** Log errors using `console.error` and return structured JSON (e.g., `{ success: false, message: "..." }`).
