import { describe, expect, it, vi } from "vitest";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { registerTools } from "../src/server/toolRegistry.js";
import { Metrics } from "../src/utils/metrics.js";
import type { ResourceEmployee } from "../src/types/resourceTypes.js";

describe("MCP tool registry", () => {
  const employee: ResourceEmployee = {
    employeeId: "id",
    employeeName: "Jane Doe",
    designation: "Developer",
    location: "Toronto",
    department: "Engineering",
    availability: 60,
    proficiency: "Expert",
    experienceYears: 8,
    projectCount: 2,
    skills: [{ skillName: "Java", proficiencyLevel: "Expert", yearsExperience: 8 }]
  };

  function setup() {
    const handlers: Array<(request: { params: { name?: string; arguments?: unknown } }) => Promise<unknown>> = [];
    const server = {
      setRequestHandler(_schema: unknown, handler: unknown) {
        handlers.push(handler as (request: { params: { name?: string; arguments?: unknown } }) => Promise<unknown>);
      }
    };
    const dependencies = {
      resources: {
        search: vi.fn().mockResolvedValue([employee]),
        findTopExperts: vi.fn().mockResolvedValue([employee]),
        findProjectExperts: vi.fn().mockResolvedValue([{ employee: "Jane Doe", role: "Developer" }])
      },
      hierarchy: {
        getDirectReports: vi.fn().mockResolvedValue({ manager: "Sam Smith", reports: [] })
      },
      teamBuilder: {
        build: vi.fn().mockResolvedValue({ projectType: "Cloud Migration", roles: [] })
      }
    };
    const metrics = new Metrics();
    registerTools(server as unknown as Server, dependencies as never, metrics);
    return { handlers, dependencies, metrics };
  }

  it("lists all tools with schemas", async () => {
    const { handlers } = setup();
    const result = await handlers[0]?.({ params: {} }) as { tools: Array<{ name: string; inputSchema: unknown }> };
    expect(result.tools.map((tool) => tool.name)).toEqual([
      "search_resources", "find_sme", "resource_availability", "org_hierarchy", "find_project_experts", "build_team"
    ]);
    expect(result.tools.every((tool) => tool.inputSchema)).toBe(true);
  });

  it("dispatches every MCP tool and serializes successful results", async () => {
    const { handlers, dependencies, metrics } = setup();
    const callTool = handlers[1];
    const calls: Array<[string, Record<string, unknown>]> = [
      ["search_resources", { skill: "Java" }],
      ["find_sme", { skill: "Java" }],
      ["resource_availability", { skill: "Java", minimumAvailability: 30 }],
      ["org_hierarchy", { managerName: "Sam Smith" }],
      ["find_project_experts", { projectName: "Payments" }],
      ["build_team", { projectType: "Cloud Migration" }]
    ];
    for (const [name, args] of calls) {
      const response = await callTool?.({ params: { name, arguments: args } }) as {
        isError?: boolean;
        content: Array<{ type: string; text: string }>;
      };
      expect(response.isError).toBeUndefined();
      expect(response.content[0]?.type).toBe("text");
      expect(() => JSON.parse(response.content[0]?.text ?? "")).not.toThrow();
    }
    expect(dependencies.resources.search).toHaveBeenCalledTimes(2);
    expect(metrics.snapshot()).toMatchObject({ toolInvocations: 6, toolErrors: 0 });
  });

  it("returns safe structured errors for invalid, unknown, and failing tool calls", async () => {
    const { handlers, dependencies, metrics } = setup();
    const callTool = handlers[1];
    const invalid = await callTool?.({ params: { name: "search_resources", arguments: { skill: " " } } }) as {
      isError: boolean;
      content: Array<{ text: string }>;
    };
    expect(invalid.isError).toBe(true);
    expect(JSON.parse(invalid.content[0]?.text ?? "")).toMatchObject({ success: false, error: expect.stringContaining("skill") });

    const unknown = await callTool?.({ params: { name: "missing", arguments: {} } }) as { isError: boolean };
    expect(unknown.isError).toBe(true);
    vi.mocked(dependencies.resources.search).mockRejectedValueOnce(new Error("sensitive database detail"));
    const failure = await callTool?.({ params: { name: "search_resources", arguments: { skill: "Java" } } }) as {
      content: Array<{ text: string }>;
    };
    expect(failure.content[0]?.text).not.toContain("sensitive database detail");
    expect(metrics.snapshot()).toMatchObject({ toolErrors: 2, toolInvocations: 2 });
  });
});
