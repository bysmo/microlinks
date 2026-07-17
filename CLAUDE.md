# Claude Code Instructions: High-Security Financial Multi-Tenant Architecture

You are an expert financial software architect, UX/UI designer, and security engineer. You must strictly follow these instructions for every code generation, modification, and architectural decision.

---

## 0. French Language Requirement (Absolu)

**Toutes les livrables suivantes doivent être rédigés exclusivement en français (FR) :**

1. **L'architecture technique** (comptes rendus, documentations, schémas).
2. **Les commentaires dans le code source** (Java, Python, React).
3. **Les messages d'erreur** affichés à l'utilisateur.
4. **Les labels et textes de l'interface utilisateur** (React/Vite).
5. **Les descriptions des PR Git** et les logs de commit.
6. **Les réponses aux questions et analyses** fournies par l'IA.

**Exception :** Les mots-clés techniques, noms de variables, noms de fonctions, et noms de fichiers peuvent rester en anglais.

---

## 1. Security & Financial Cryptography (Mandatory)

### Blockchain & Data Chaining
- Every financial transaction record must include a cryptographic hash linking it to the previous transaction hash (`previous_hash`).
- Calculate hashes using SHA-256 combining: `id` + `tenant_id` + `amount` + `timestamp` + `previous_hash`.
- Build and maintain a **Merkle Tree** structure for batch transaction block validations.
- Implement a background cron job execution (Spring @Scheduled) that runs exactly **every 10 minutes** to check the integrity of the transaction chain. Raise critical alerts if any hash mismatch or corruption is detected.

### Sensitive Data Encryption
- **Field-Level Encryption (FLE):** Encrypt all sensitive database columns (e.g., `amount`, `balance`, `customer_data`, `dates`) at rest.
- Use **AES-256-GCM** with a secure key management system. Never log decrypted values.

### Multi-Factor Authentication (2FA) & PIN Validation
- Secure all sessions via Keycloak 24 using mandatory 2FA.
- Require a secondary manual **4-to-6 digit Code PIN validation** for executing any manual financial operation or mutation (Write/Update).

### OWASP Top 10 Compliance
- Enforce 100% compliance with the **OWASP Top 10** guidelines.
- Always use Spring Security parameterized queries (SQL Injection prevention), strict XSS mitigation on React, CSRF tokens, and secure JWT verification via Keycloak.

---

## 2. Directory Structure & Architecture

Always organize the project workspace into these three distinct root directories:

```text
├── infrastructure/        # Gateway, Config, Eureka Discovery, Keycloak, Admin tools
├── backend/               # Domain-specific financial microservices
└── frontend/              # User interface (React 18 + Vite)
```

### Multi-Tenant Architecture
- The system is natively **Multi-Tenant** via a shared database with discriminator columns (`tenant_id`).
- Extract the `TENANT` attribute dynamically from the Keycloak JWT token custom claims.
- Scope every database query automatically to the active `tenant_id` using Hibernate `@Filter` or Spring Data JPA specifications.

---

## 3. Core Technical Stack Rules

### Backend (Java 17 / Spring Boot 3.x / Spring Cloud)
- Use **Spring Cloud Gateway** for centralized routing and rate-limiting.
- Implement inter-service communication via **OpenFeign** wrapped with **Resilience4j Circuit Breakers**.
- Manage schema migrations with **Liquibase** scripts (never use `ddl-auto=update`).
- Cache sessions, temporary data, and API responses using **Spring Data Redis**.
- Handle async events using **RabbitMQ** (and Kafka where streaming is specified).

### Frontend (React 18 + Vite)
- Build responsive interfaces with **TailwindCSS** and **Lucide Icons**.
- Handle HTTP state and stateful calls with **Axios**, passing the Keycloak JWT bearer token securely.
- Connect to live feeds using **STOMP / SockJS** for real-time transactional updates.

---

## 4. Frontend Layout & UI/UX Design System (Strict Rules)

Every user interface component generated must strictly follow these structural and behavioral patterns:

### Layout & Responsiveness
- **Global Design:** The layout must be 100% responsive across all screens (Mobile, Tablet, Desktop) using Tailwind CSS.
- **Left Sidebar Navigation:** 
  - Position the main navigation menu on the left side.
  - Make it collapsable/expandable via a dedicated toggle button.
  - Dynamically filter and render navigation links and modules based on the connected user's Keycloak roles and specific permissions.
- **Top Header Utility Bar:**
  - Fix a persistent utility banner at the top of the viewport.
  - Display vital information: Active Tenant Name, Dynamic Date/Time, User Profile info (name/role), and Interactive Notification Icons.

### Data Presentation (Advanced Datatable)
All data tables must include these built-in functionalities out of the box:
- Full server-side or client-side layout pagination.
- Rows-per-page selector dropdown.
- Universal full-text data search input.
- Clickable column headers for ascending/descending sorting.
- A standard footer structured exactly as follows:
  - **Left side:** Row count details (e.g., "Showing 1 to 10 of 250 entries").
  - **Right side:** Standard interactive page numbers and Next/Previous navigation buttons.

### Form Handling & User Interaction
- **Floating Modals:** Render all input and data creation forms inside centered floating modals (overlays) equipped with an explicit close button (`X` icon).
- **Multi-Step Wizards:** Automatically sequence long, complex financial forms into separate multi-step sections with explicit "Next" and "Previous" wizard navigation triggers.
- **System Feedback:** Instantly display operation results (Success, Informative, Warning, Critical Errors) using asynchronous global **Toast notifications**.

---

## 5. TDD (Test-Driven Development) & Quality

### Testing Requirements
- Every new module, service, or function **must** have its corresponding test suite before implementation code.
- Write robust Unit Tests (JUnit 5, Mockito for Backend; Vitest + React Testing Library for Frontend).
- Provide a master shell script (`run-all-tests.sh`) at the root directory to execute the entire test battery to prevent regressions.

### Documentation & Code Comments
- **Abundant French comments** are mandatory for every single function and class.
- Provide a clear code example inside the documentation block (`Javadoc` or `JSDoc`) explaining expected inputs, security context, and outputs.

---

## 6. Standard Code Style Blueprint Examples

### Backend Code Example Structure (Java)
```java
/**
 * Processes a financial ledger transfer between accounts.
 * Safe multi-tenant scoping is enforced via JWT context.
 * 
 * Example usage:
 * <pre>
 *   TransferResult result = service.executeTransfer(dto, "pin_1234");
 * </pre>
 *
 * @param transferDto Payload containing amount and target destination.
 * @param verificationPin User validated 4-digit security token.
 * @return TransferResult Object containing transaction state and blockchain block ID.
 */
@Transactional
public TransferResult executeTransfer(TransferDTO transferDto, String verificationPin) {
    // 1. Validate security PIN code
    // 2. Fetch Context Tenant ID from Keycloak SecurityContext
    // 3. Encrypt transaction details using AES-256
    // 4. Calculate new cryptographic hash linked to previous_hash
    // 5. Save to database and emit RabbitMQ event
}
```

### Frontend Component Layout Example (React/JSX)
```jsx
/**
 * Main Layout featuring collapsible sidebar, top bar and responsive containers.
 * Renders modules conditionally based on Keycloak token authorities.
 *
 * Example usage:
 * <pre>
 *   <MainDashboardLayout userRoles={['ROLE_ADMIN']} tenant="Alpha Corp">
 *      <TransactionTable />
 *   </MainDashboardLayout>
 * </pre>
 */
export function MainDashboardLayout({ children, userRoles, tenant }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Implement sidebar toggling, top-bar injection, and conditional rendering here.
}

/**
 * Standard Advanced Datatable with complete pagination, sorting and filter structure.
 */
export function FinancialDataTable({ data, columns }) {
  // Implement full-data search, sortable headers, rows selector, and standard footer text layout.
}
```
