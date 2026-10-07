import { describe, expect, it, vi } from "vitest";
import { TeamBuilderService } from "../src/services/teamBuilderService.js";
import { HierarchyService } from "../src/services/hierarchyService.js";
import type { ResourceEmployee } from "../src/types/resourceTypes.js";
import { buildTeamSchema, resourceAvailabilitySchema, searchResourcesSchema } from "../src/schemas/resourceSchemas.js";

const candidate = (id: string, skillName: string, years = 6): ResourceEmployee => ({
  employeeId: id,
  employeeName: id,
  designation: `${skillName} Engineer`,
  location: "Toronto",
  department: "Engineering",
  availability: 80,
  proficiency: "Advanced",
  experienceYears: years,
  projectCount: 2,
  skills: [{ skillName, proficiencyLevel: "Advanced", yearsExperience: years }]
});

describe("tool services and validation", () => {
  it("rejects empty skills and availability outside 0-100", () => {
    expect(searchResourcesSchema.safeParse({ skill: " " }).success).toBe(false);
    expect(resourceAvailabilitySchema.safeParse({ skill: "Azure", minimumAvailability: 101 }).success).toBe(false);
    expect(buildTeamSchema.safeParse({ projectType: "Unknown Project" }).success).toBe(false);
  });

  it("returns direct reports in hierarchy output shape", async () => {
    const hierarchy = new HierarchyService({
      findDirectReports: vi.fn().mockResolvedValue([{ firstName: "Jane", lastName: "Doe", designation: "Developer" }])
    } as never);
    await expect(hierarchy.getDirectReports("Manager")).resolves.toEqual({
      manager: "Manager",
      reports: [{ employee: "Jane Doe", designation: "Developer" }]
    });
  });

  it("builds a cloud team with unique ranked candidates", async () => {
    const resources = {
      findMatchingSkillNames: vi.fn(async (skill: string) => [skill])
    };
    const employees = {
      findTeamCandidates: vi.fn().mockResolvedValue([
        candidate("Architect", "cloud architecture"),
        candidate("DevOne", "java"),
        candidate("DevTwo", "python"),
        candidate("DevOps", "terraform"),
        candidate("QA", "testing")
      ])
    };
    const builder = new TeamBuilderService(employees as never, resources as never);
    const result = await builder.build("Cloud Migration");
    expect(result.roles.map((role) => [role.role, role.candidates.length])).toEqual([
      ["Architect", 1],
      ["Developer", 2],
      ["DevOps Engineer", 1],
      ["QA Engineer", 1]
    ]);
    expect(new Set(result.roles.flatMap((role) => role.candidates.map((person) => person.employeeName))).size).toBe(5);
  });

  it("selects the AI Platform team for that project type", async () => {
    const resources = { findMatchingSkillNames: vi.fn(async (skill: string) => [skill]) };
    const employees = { findTeamCandidates: vi.fn().mockResolvedValue([]) };
    const result = await new TeamBuilderService(employees as never, resources as never).build("AI Platform");
    expect(result.roles.map((role) => role.role)).toEqual(["AI Architect", "AI Engineer", "Cloud Engineer", "DevOps Engineer"]);
  });
});
