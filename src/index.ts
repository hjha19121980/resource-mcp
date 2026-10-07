import { createDatabase } from "./database/postgres.js";
import { EmployeeRepository } from "./database/repositories/employeeRepository.js";
import { ProjectRepository } from "./database/repositories/projectRepository.js";
import { SkillRepository } from "./database/repositories/skillRepository.js";
import { HierarchyService } from "./services/hierarchyService.js";
import { ResourceService } from "./services/resourceService.js";
import { SkillMatchingService } from "./services/skillMatchingService.js";
import { TeamBuilderService } from "./services/teamBuilderService.js";
import { createMcpServer, startMcpServer } from "./server/mcpServer.js";
import { startHealthServer } from "./server/healthServer.js";
import { MemoryCache } from "./utils/cache.js";
import { loadConfig } from "./utils/config.js";
import { logger } from "./utils/logger.js";
import { Metrics } from "./utils/metrics.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const metrics = new Metrics();
  const pool = createDatabase(config.DATABASE_URL, config.DATABASE_POOL_MAX, metrics);
  const employeeRepository = new EmployeeRepository(pool);
  const skillRepository = new SkillRepository(pool);
  const projectRepository = new ProjectRepository(pool);
  const resourceService = new ResourceService(
    employeeRepository,
    skillRepository,
    projectRepository,
    new SkillMatchingService(),
    new MemoryCache(config.CACHE_TTL_SECONDS * 1000)
  );
  const hierarchyService = new HierarchyService(employeeRepository);
  const teamBuilder = new TeamBuilderService(employeeRepository, resourceService);
  const healthServer = startHealthServer(config.PORT, pool, metrics);
  const mcpServer = createMcpServer({
    resources: resourceService,
    hierarchy: hierarchyService,
    teamBuilder,
    metrics
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Shutting down");
    healthServer.close();
    await mcpServer.close();
    await pool.end();
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  await startMcpServer(mcpServer);
  logger.info("Resource MCP server connected over stdio");
}

main().catch((error: unknown) => {
  logger.fatal({ err: error }, "Resource MCP server failed to start");
  process.exitCode = 1;
});
