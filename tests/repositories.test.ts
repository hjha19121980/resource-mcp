import { describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { EmployeeRepository } from "../src/database/repositories/employeeRepository.js";
import { ProjectRepository } from "../src/database/repositories/projectRepository.js";
import { SkillRepository } from "../src/database/repositories/skillRepository.js";

function mockPool(rows: unknown[]) {
  return { query: vi.fn().mockResolvedValue({ rows }) };
}

describe("repositories", () => {
  it("searches resources with filters, validated sort mapping, and pagination", async () => {
    const pool = mockPool([{
      employee_id: "id",
      employee_name: "Alex Doe",
      designation: "Developer",
      location: "Toronto",
      department: "Engineering",
      availability: 70,
      proficiency: "Expert",
      experience_years: 8,
      project_count: 0,
      skills: [{ skillName: "Java", proficiencyLevel: "Expert", yearsExperience: 8 }]
    }]);
    const repository = new EmployeeRepository(pool as unknown as Pool);
    const results = await repository.searchBySkills(["Java"], {
      department: "Engineering",
      location: "Toronto",
      page: 2,
      pageSize: 10,
      sortBy: "experience",
      sortOrder: "asc"
    }, 20);
    expect(results[0]).toMatchObject({ employeeId: "id", availability: 70, experienceYears: 8 });
    const query = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(query?.[0]).toContain("ORDER BY experience_years ASC");
    expect(query?.[1]).toEqual([["java"], 20, "Engineering", "Toronto", 10, 10]);
  });

  it("returns no team candidates when no skills are available", async () => {
    const pool = mockPool([]);
    await expect(new EmployeeRepository(pool as unknown as Pool).findTeamCandidates([])).resolves.toEqual([]);
    expect((pool.query as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it("maps team candidates and limits SME results using proficiency-first ranking", async () => {
    const row = {
      employee_id: "id",
      employee_name: "Alex Doe",
      designation: "Developer",
      location: "Toronto",
      department: "Engineering",
      availability: "40",
      proficiency: "Expert",
      experience_years: "7",
      project_count: "3",
      skills: [{ skillName: "Java", proficiencyLevel: "Expert", yearsExperience: 7 }]
    };
    const pool = mockPool([row]);
    const repository = new EmployeeRepository(pool as unknown as Pool);
    await expect(repository.findTopExperts(["Java"], 5)).resolves.toMatchObject([
      { employeeName: "Alex Doe", availability: 40, projectCount: 3 }
    ]);
    expect((pool.query as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toContain("PARTITION BY e.employee_id");
    await expect(repository.findTeamCandidates(["Java"])).resolves.toMatchObject([
      { employeeId: "id", skills: row.skills }
    ]);
    (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [] });
    await expect(repository.findDirectReports("Manager")).resolves.toEqual([]);
  });

  it("maps direct reports and skill names", async () => {
    const reportsPool = mockPool([{ first_name: "Jane", last_name: "Doe", designation: "Engineer" }]);
    await expect(new EmployeeRepository(reportsPool as unknown as Pool).findDirectReports("Manager")).resolves.toEqual([
      { firstName: "Jane", lastName: "Doe", designation: "Engineer" }
    ]);
    const skillPool = mockPool([{ skill_name: "Java" }, { skill_name: "Kubernetes" }]);
    await expect(new SkillRepository(skillPool as unknown as Pool).listSkillNames()).resolves.toEqual(["Java", "Kubernetes"]);
  });

  it("finds project experts", async () => {
    const pool = mockPool([{ employee: "Jane Doe", role: "Lead Developer" }]);
    await expect(new ProjectRepository(pool as unknown as Pool).findExperts("Payments")).resolves.toEqual([
      { employee: "Jane Doe", role: "Lead Developer" }
    ]);
  });
});
