import type { EmployeeRepository } from "../database/repositories/employeeRepository.js";
import type { ProjectRepository } from "../database/repositories/projectRepository.js";
import type { SkillRepository } from "../database/repositories/skillRepository.js";
import type { ResourceEmployee, ResourceSearchFilters } from "../types/resourceTypes.js";
import type { MemoryCache } from "../utils/cache.js";
import { SkillMatchingService } from "./skillMatchingService.js";

export class ResourceService {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly skills: SkillRepository,
    private readonly projects: ProjectRepository,
    private readonly skillMatcher: SkillMatchingService,
    private readonly cache: MemoryCache
  ) {}

  async search(skill: string, filters: ResourceSearchFilters, minimumAvailability = 0): Promise<ResourceEmployee[]> {
    const key = `resources:${JSON.stringify({ skill, filters, minimumAvailability })}`;
    const cached = this.cache.get<ResourceEmployee[]>(key);
    if (cached) return cached;
    const skillNames = await this.matchingNames(skill);
    const results = await this.employees.searchBySkills(skillNames, filters, minimumAvailability);
    this.cache.set(key, results);
    return results;
  }

  async findTopExperts(skill: string, limit = 10): Promise<ResourceEmployee[]> {
    return this.employees.findTopExperts(await this.matchingNames(skill), limit);
  }

  async findProjectExperts(projectName: string) {
    const key = `project:${projectName.toLowerCase()}`;
    const cached = this.cache.get<Awaited<ReturnType<ProjectRepository["findExperts"]>>>(key);
    if (cached) return cached;
    const results = await this.projects.findExperts(projectName);
    this.cache.set(key, results);
    return results;
  }

  async findMatchingSkillNames(skill: string): Promise<string[]> {
    return this.matchingNames(skill);
  }

  private async matchingNames(skill: string): Promise<string[]> {
    const cached = this.cache.get<string[]>("skill-catalog");
    const availableNames = cached ?? await this.skills.listSkillNames();
    if (!cached) this.cache.set("skill-catalog", availableNames);
    return this.skillMatcher.matchSkillNames(skill, availableNames);
  }
}
