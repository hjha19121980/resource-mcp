# resource-mcp

An MCP server that helps AI assistants discover employee skills and experience, find available resources, explore reporting lines, and assemble delivery teams from a PostgreSQL-backed employee directory.

## Requirements

- Node.js 22 or newer
- PostgreSQL 16 or newer (or Docker Desktop)

## Installation

```powershell
npm install
Copy-Item .env.example .env
```

Set `DATABASE_URL` in `.env` to a PostgreSQL connection string. The server validates its configuration at startup.

## Database setup

Create a database, then apply the schema:

```powershell
psql "$env:DATABASE_URL" -f schema.sql
```

The schema creates the employee, skill, and project experience tables and their search indexes. Add your organization's employee data using your normal secure data-ingestion process; this project does not include sample or fabricated employee records.

## Running locally

```powershell
npm start
```

`npm start` builds the TypeScript source before launching the server. To build separately, use `npm run build`.

For development, use `npm run dev`. The MCP server communicates over **stdio**. Do not write application logs to stdout; Pino writes logs to stderr. The optional HTTP listener serves `GET /health` and `GET /metrics` on `PORT` (default `3000`).

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://resource_mcp:resource_mcp@localhost:5432/resource_mcp` | PostgreSQL connection URL |
| `PORT` | `3000` | HTTP health and metrics listener port |
| `LOG_LEVEL` | `info` | Pino log level |
| `CACHE_TTL_SECONDS` | `60` | In-memory result and skill-catalog cache lifetime |
| `DATABASE_POOL_MAX` | `10` | Maximum PostgreSQL pool connections |

`PORT` is retained as the conventional name for the HTTP listener. The MCP protocol itself uses stdio.

## Running with Docker

```powershell
docker compose up --build
```

The Compose configuration starts PostgreSQL and the MCP server, applies `schema.sql` on first database initialization, and exposes the health/metrics listener on port `3000`. Configure your MCP client to launch or attach to the server process; a container's stdio is not automatically connected to desktop clients.

## MCP client configuration

### Claude Desktop

Build the project and use an absolute path to the compiled entry point:

```json
{
  "mcpServers": {
    "resource-mcp": {
      "command": "node",
      "args": ["C:\\path\\to\\resource-mcp\\dist\\src\\index.js"],
      "env": {
        "DATABASE_URL": "postgresql://resource_mcp:your-password@localhost:5432/resource_mcp"
      }
    }
  }
}
```

### VS Code

Add this to `.vscode/mcp.json` (replace the path and connection details):

```json
{
  "servers": {
    "resource-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["C:\\path\\to\\resource-mcp\\dist\\src\\index.js"],
      "env": {
        "DATABASE_URL": "postgresql://resource_mcp:your-password@localhost:5432/resource_mcp"
      }
    }
  }
}
```

## Tools and sample queries

- `search_resources`: “Find Java developers in Toronto, sorted by availability.”
- `find_sme`: “Who are the top Kubernetes subject matter experts?”
- `resource_availability`: “Find Azure resources with at least 30% availability.”
- `org_hierarchy`: “Show the direct reports of Prashant Sharma.”
- `find_project_experts`: “Who worked on Payments Modernization?”
- `build_team`: “Recommend a team for a Cloud Migration.”

Skill matching supports the aliases AKS/Kubernetes, Azure DevOps/DevOps, and Spring/Spring Boot, plus fuzzy matching against skill names present in the database. Search results are paginated (maximum page size 100); SME and project expert results are capped at 10. Team recommendations rank active employees using skill proficiency, relevant experience, availability, and project history, and do not assign the same employee to multiple roles.

## Development and tests

```powershell
npm run typecheck
npm test
npm run test:coverage
```

Database tests use mocked repositories and do not require a running PostgreSQL instance.

## Data and privacy

Employee and project data is sensitive. Use least-privilege database credentials, secure secrets management, and organization-approved access controls and data-retention practices. Logs include tool names, timing, and operational errors, not tool input values or employee records.
