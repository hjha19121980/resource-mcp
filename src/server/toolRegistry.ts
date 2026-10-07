import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ZodError, type ZodType } from "zod";
import type { HierarchyService } from "../services/hierarchyService.js";
import type { ResourceService } from "../services/resourceService.js";
import type { TeamBuilderService } from "../services/teamBuilderService.js";
import { logger } from "../utils/logger.js";
import type { Metrics } from "../utils/metrics.js";
import { createBuildTeamTool } from "../tools/buildTeam.js";
import { createFindProjectExpertsTool } from "../tools/findProjectExperts.js";
import { createFindSmeTool } from "../tools/findSME.js";
import { createOrgHierarchyTool } from "../tools/orgHierarchy.js";
import { createResourceAvailabilityTool } from "../tools/resourceAvailability.js";
import { createSearchResourcesTool } from "../tools/searchResources.js";

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description?: string; enum?: string[]; minimum?: number; maximum?: number }>;
    required: string[];
    additionalProperties?: boolean;
  };
  schema: ZodType;
  execute(input: unknown): Promise<unknown>;
}

export function registerTools(
  server: Server,
  dependencies: { resources: ResourceService; hierarchy: HierarchyService; teamBuilder: TeamBuilderService },
  metrics: Metrics
): void {
  const tools: ToolDefinition[] = [
    {
      name: "search_resources",
      description: "Find active employees with a matching skill. Results support pagination, filtering, and sorting.",
      inputSchema: {
        type: "object",
        properties: {
          skill: { type: "string", description: "Skill or technology to search for" },
          department: { type: "string" },
          location: { type: "string" },
          page: { type: "integer" },
          pageSize: { type: "integer", minimum: 1, maximum: 100 },
          sortBy: { type: "string", enum: ["availability", "experience", "name"] },
          sortOrder: { type: "string", enum: ["asc", "desc"] }
        },
        required: ["skill"],
        additionalProperties: false
      },
      ...createSearchResourcesTool(dependencies.resources)
    },
    {
      name: "find_sme",
      description: "Find up to 10 subject matter experts, ordered by proficiency and years of experience.",
      inputSchema: {
        type: "object",
        properties: { skill: { type: "string", description: "Topic or skill" } },
        required: ["skill"],
        additionalProperties: false
      },
      ...createFindSmeTool(dependencies.resources)
    },
    {
      name: "resource_availability",
      description: "Find employees with the requested skill and at least the specified availability percentage.",
      inputSchema: {
        type: "object",
        properties: {
          skill: { type: "string" },
          minimumAvailability: { type: "integer", minimum: 0, maximum: 100 }
        },
        required: ["skill", "minimumAvailability"],
        additionalProperties: false
      },
      ...createResourceAvailabilityTool(dependencies.resources)
    },
    {
      name: "org_hierarchy",
      description: "List active direct reports for a manager name.",
      inputSchema: {
        type: "object",
        properties: { managerName: { type: "string" } },
        required: ["managerName"],
        additionalProperties: false
      },
      ...createOrgHierarchyTool(dependencies.hierarchy)
    },
    {
      name: "find_project_experts",
      description: "Find up to 10 active employees with experience on the named project.",
      inputSchema: {
        type: "object",
        properties: { projectName: { type: "string" } },
        required: ["projectName"],
        additionalProperties: false
      },
      ...createFindProjectExpertsTool(dependencies.resources)
    },
    {
      name: "build_team",
      description: "Recommend a Cloud Migration or AI Platform delivery team using skill fit, experience, availability, and project history.",
      inputSchema: {
        type: "object",
        properties: { projectType: { type: "string" } },
        required: ["projectType"],
        additionalProperties: false
      },
      ...createBuildTeamTool(dependencies.teamBuilder)
    }
  ];

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }))
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find((candidate) => candidate.name === request.params.name);
    if (!tool) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "Unknown tool" }) }], isError: true };
    }

    const startedAt = performance.now();
    let failed = false;
    logger.info({ tool: tool.name }, "MCP tool invoked");
    try {
      const output = await tool.execute(request.params.arguments ?? {});
      return { content: [{ type: "text", text: JSON.stringify(output) }] };
    } catch (error) {
      failed = true;
      const message = error instanceof ZodError
        ? error.issues.map((issue) => issue.message).join("; ")
        : "Request failed";
      logger.error({ tool: tool.name, err: error }, "MCP tool failed");
      return {
        content: [{ type: "text", text: JSON.stringify({ success: false, error: message }) }],
        isError: true
      };
    } finally {
      const durationMilliseconds = performance.now() - startedAt;
      metrics.recordTool(durationMilliseconds, failed);
      logger.info({ tool: tool.name, durationMilliseconds, failed }, "MCP tool completed");
    }
  });
}
