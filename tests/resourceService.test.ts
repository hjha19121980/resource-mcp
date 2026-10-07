import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResourceService } from "../src/services/resourceService.js";
import { SkillMatchingService } from "../src/services/skillMatchingService.js";
import { MemoryCache } from "../src/utils/cache.js";
import type { ResourceEmployee } from "../src/types/resourceTypes.js";

const employee = (id: string, proficiency: string, years: number): ResourceEmployee => ({
  employeeId: id,
  employeeName: id,
  designation: "Developer",
  location: "Toronto",
  department: "Engineering",
  availability: 50,
  proficiency,
  experienceYears: years,
  projectCount: 1,
  skills: [{ skillName: "Kubernetes", proficiencyLevel: proficiency, yearsExperience: years }]
});

describe("ResourceService", () => {
  const employees = { searchBySkills: vi.fn(), findTopExperts: vi.fn() };
  const skills = { listSkillNames: vi.fn() };
  const projects = { findExperts: vi.fn() };
  let service: ResourceService;

  beforeEach(() => {
    vi.clearAllMocks();
    skills.listSkillNames.mockResolvedValue(["Kubernetes"]);
    employees.searchBySkills.mockResolvedValue([]);
    employees.findTopExperts.mockResolvedValue([]);
    projects.findExperts.mockResolvedValue([]);
    service = new ResourceService(
      employees as never,
      skills as never,
      projects as never,
      new SkillMatchingService(),
      new MemoryCache(60_000)
    );
  });

  it("searches through matched skills and caches results", async () => {
    const results = [employee("Alex", "Advanced", 5)];
    employees.searchBySkills.mockResolvedValue(results);
    const filters = { page: 1, pageSize: 25, sortBy: "availability" as const, sortOrder: "desc" as const };
    await expect(service.search("AKS", filters)).resolves.toEqual(results);
    await expect(service.search("AKS", filters)).resolves.toEqual(results);
    expect(employees.searchBySkills).toHaveBeenCalledTimes(1);
    expect(employees.searchBySkills).toHaveBeenCalledWith(["Kubernetes"], filters, 0);
  });

  it("ranks SMEs by proficiency and experience", async () => {
    employees.findTopExperts.mockResolvedValue([
      employee("Taylor", "Expert", 8),
      employee("Sam", "Expert", 2)
    ]);
    await expect(service.findTopExperts("Kubernetes", 2)).resolves.toMatchObject([
      { employeeName: "Taylor" },
      { employeeName: "Sam" }
    ]);
    expect(employees.findTopExperts).toHaveBeenCalledWith(["Kubernetes"], 2);
  });

  it("caches project expert results", async () => {
    projects.findExperts.mockResolvedValue([{ employee: "Alex Doe", role: "Developer" }]);
    await service.findProjectExperts("Payments");
    await service.findProjectExperts("Payments");
    expect(projects.findExperts).toHaveBeenCalledTimes(1);
  });
});
