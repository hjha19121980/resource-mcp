import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { HierarchyService } from "../services/hierarchyService.js";
import type { ResourceService } from "../services/resourceService.js";
import type { TeamBuilderService } from "../services/teamBuilderService.js";
import type { Metrics } from "../utils/metrics.js";
import { registerTools } from "./toolRegistry.js";

export function createMcpServer(dependencies: {
  resources: ResourceService;
  hierarchy: HierarchyService;
  teamBuilder: TeamBuilderService;
  metrics: Metrics;
}): Server {
  const server = new Server(
    { name: "resource-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );
  registerTools(server, dependencies, dependencies.metrics);
  return server;
}

export async function startMcpServer(server: Server): Promise<void> {
  await server.connect(new StdioServerTransport());
}
