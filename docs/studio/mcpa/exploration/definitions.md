# MCPA - Definitions

> Glossary of terms specific to this project. Maintain as concepts evolve.

---

## Core Terms

| Term | Definition | Example |
|------|-----------|---------|
| MCP App | An interactive HTML interface rendered inside an MCP host via sandboxed iframe | A data explorer embedded in Claude Desktop |
| Host | The MCP client application that renders apps (Claude Desktop, VS Code, etc.) | Claude Desktop rendering a `ui://` resource |
| Resource URI | A `ui://` prefixed URI that declares an app's HTML content as an MCP resource | `ui://my-server/dashboard` |
| Preloading | Host fetches and prepares app UI before the tool is invoked | Enables instant rendering when tool fires |
| Capability delegation | Apps request outcomes that the host routes through the user's connected integrations | App requests "schedule meeting" → host uses calendar tool |

---

## Related Concepts

| Concept | Relationship to This Project |
|---------|------------------------------|
| JSON-RPC | Communication protocol between app iframe and host via postMessage |
| CSP (Content Security Policy) | Security boundary controlling what external resources apps can access |
| postMessage | Browser API used as transport layer for JSON-RPC between iframe and host |
| State machine | Potential architecture pattern for managing app states and transitions |
| Event sourcing | Potential pattern for state reconstruction from tool call history |

---

*Add terms as they emerge during exploration. Precise definitions prevent confusion in later phases.*
