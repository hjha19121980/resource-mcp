import type { EmployeeRepository } from "../database/repositories/employeeRepository.js";
import type { ResourceEmployee, TeamRecommendation, TeamRole } from "../types/resourceTypes.js";
import type { ResourceService } from "./resourceService.js";

const cloudMigrationRoles: TeamRole[] = [
  { role: "Architect", count: 1, skills: ["architect", "cloud architecture", "solution architecture"] },
  { role: "Developer", count: 2, skills: ["developer", "java", "python", "software development"] },
  { role: "DevOps Engineer", count: 1, skills: ["devops", "terraform", "kubernetes", "azure devops"] },
  { role: "QA Engineer", count: 1, skills: ["qa", "testing", "quality assurance"] }
];

const aiPlatformRoles: TeamRole[] = [
  { role: "AI Architect", count: 1, skills: ["ai architect", "machine learning", "generative ai", "llm"] },
  { role: "AI Engineer", count: 2, skills: ["ai engineer", "machine learning", "python", "llm"] },
  { role: "Cloud Engineer", count: 1, skills: ["cloud engineer", "azure", "aws", "cloud"] },
  { role: "DevOps Engineer", count: 1, skills: ["devops", "terraform", "kubernetes", "azure devops"] }
];

export class TeamBuilderService {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly resources: ResourceService
  ) {}

  async build(projectType: string): Promise<TeamRecommendation> {
    const roles = /ai\s*platform/i.test(projectType) ? aiPlatformRoles : cloudMigrationRoles;
    const allSkills = [...new Set(roles.flatMap((role) => role.skills))];
    const matchedNames = await Promise.all(allSkills.map((skill) => this.resources.findMatchingSkillNames(skill)));
    const candidates = await this.employees.findTeamCandidates([...new Set(matchedNames.flat())]);
    const selectedIds = new Set<string>();
    const recommendations = roles.map((role) => {
      const ranked = candidates
        .filter((candidate) =>
          !selectedIds.has(candidate.employeeId) &&
          role.skills.some((skill) => hasMatchingSkill(candidate, skill))
        )
        .map((candidate) => ({
          candidate,
          matchedSkills: candidate.skills
            .filter((skill) => role.skills.some((roleSkill) => hasMatchingSkillName(skill.skillName, roleSkill)))
            .map((skill) => skill.skillName),
          score: scoreCandidate(candidate, role.skills)
        }))
        .sort((left, right) => right.score - left.score || left.candidate.employeeName.localeCompare(right.candidate.employeeName))
        .slice(0, role.count);
      for (const entry of ranked) selectedIds.add(entry.candidate.employeeId);
      return {
        role: role.role,
        candidates: ranked.map(({ candidate, score, matchedSkills }) => ({
          employeeName: candidate.employeeName,
          designation: candidate.designation,
          availability: candidate.availability,
          score,
          matchedSkills
        }))
      };
    });
    return { projectType, roles: recommendations };
  }
}

function hasMatchingSkill(candidate: ResourceEmployee, roleSkill: string): boolean {
  return candidate.skills.some((skill) => hasMatchingSkillName(skill.skillName, roleSkill));
}

function hasMatchingSkillName(employeeSkill: string, roleSkill: string): boolean {
  const employeeNormalized = canonicalSkill(employeeSkill);
  const roleNormalized = canonicalSkill(roleSkill);
  return employeeNormalized === roleNormalized ||
    employeeNormalized.includes(roleNormalized) ||
    roleNormalized.includes(employeeNormalized);
}

function canonicalSkill(skill: string): string {
  const normalized = skill.toLowerCase().trim();
  if (normalized === "aks") return "kubernetes";
  if (normalized === "azure devops") return "devops";
  if (normalized === "spring") return "spring boot";
  return normalized;
}

function scoreCandidate(candidate: ResourceEmployee, roleSkills: string[]): number {
  const proficiency = { expert: 4, advanced: 3, intermediate: 2, beginner: 1 };
  const bestSkill = candidate.skills
    .filter((skill) => roleSkills.some((roleSkill) => hasMatchingSkillName(skill.skillName, roleSkill)))
    .reduce((best, skill) => Math.max(best, proficiency[skill.proficiencyLevel.toLowerCase() as keyof typeof proficiency] ?? 0), 0);
  const experience = Math.min(20, candidate.skills
    .filter((skill) => roleSkills.some((roleSkill) => hasMatchingSkillName(skill.skillName, roleSkill)))
    .reduce((maximum, skill) => Math.max(maximum, skill.yearsExperience), 0));
  return Math.round(bestSkill * 15 + experience * 2 + candidate.availability * 0.25 + Math.min(candidate.projectCount, 10) * 2);
}
