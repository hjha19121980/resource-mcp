export type ProficiencyLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "expert"
  | string;

export interface EmployeeSkill {
  skillName: string;
  proficiencyLevel: ProficiencyLevel;
  yearsExperience: number;
}

export interface ResourceEmployee {
  employeeId: string;
  employeeName: string;
  designation: string | null;
  location: string | null;
  department: string | null;
  availability: number;
  proficiency: string;
  experienceYears: number;
  projectCount: number;
  skills: EmployeeSkill[];
}

export interface ResourceSearchFilters {
  department?: string;
  location?: string;
  page: number;
  pageSize: number;
  sortBy: "availability" | "experience" | "name";
  sortOrder: "asc" | "desc";
}

export interface ManagerReport {
  employee: string;
  designation: string | null;
}

export interface ProjectExpert {
  employee: string;
  role: string | null;
}

export interface TeamRole {
  role: string;
  count: number;
  skills: string[];
}

export interface TeamRecommendation {
  projectType: string;
  roles: Array<{
    role: string;
    candidates: Array<{
      employeeName: string;
      designation: string | null;
      availability: number;
      score: number;
      matchedSkills: string[];
    }>;
  }>;
}
