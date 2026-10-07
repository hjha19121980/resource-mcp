import type { Pool } from "pg";
import type { ResourceEmployee, ResourceSearchFilters } from "../../types/resourceTypes.js";

interface EmployeeRow {
  employee_id: string;
  employee_name: string;
  designation: string | null;
  location: string | null;
  department: string | null;
  availability: number;
  proficiency: string | null;
  experience_years: number;
  project_count: number;
  skills: ResourceEmployee["skills"];
}

const employeeSelect = `e.employee_id, concat_ws(' ', e.first_name, e.last_name) AS employee_name,
  e.designation, e.location, e.department, e.availability_percentage AS availability,
  es.proficiency_level AS proficiency, es.years_experience AS experience_years,
  0::int AS project_count,
  jsonb_build_array(jsonb_build_object(
    'skillName', es.skill_name, 'proficiencyLevel', es.proficiency_level,
    'yearsExperience', es.years_experience
  )) AS skills`;

export class EmployeeRepository {
  constructor(private readonly pool: Pool) {}

  async searchBySkills(skillNames: string[], filters: ResourceSearchFilters, minimumAvailability = 0): Promise<ResourceEmployee[]> {
    if (skillNames.length === 0) return [];
    const sortColumns = {
      availability: "availability",
      experience: "experience_years",
      name: "lower(employee_name)"
    } as const;
    const direction = filters.sortOrder === "asc" ? "ASC" : "DESC";
    const conditions = ["e.employee_status = 'active'", "lower(es.skill_name) = ANY($1::text[])", "e.availability_percentage >= $2"];
    const values: unknown[] = [skillNames.map((name) => name.toLowerCase()), minimumAvailability];
    if (filters.department) {
      values.push(filters.department);
      conditions.push(`lower(e.department) = lower($${values.length})`);
    }
    if (filters.location) {
      values.push(filters.location);
      conditions.push(`lower(e.location) = lower($${values.length})`);
    }
    values.push(filters.pageSize, (filters.page - 1) * filters.pageSize);
    const result = await this.pool.query<EmployeeRow>(
      `SELECT * FROM (
         SELECT DISTINCT ON (e.employee_id) ${employeeSelect}
         FROM employees e
         JOIN employee_skills es ON es.employee_id = e.employee_id
         WHERE ${conditions.join(" AND ")}
         ORDER BY e.employee_id, es.years_experience DESC,
                  CASE lower(es.proficiency_level)
                    WHEN 'expert' THEN 4 WHEN 'advanced' THEN 3
                    WHEN 'intermediate' THEN 2 WHEN 'beginner' THEN 1 ELSE 0
                  END DESC
       ) employee_matches
       ORDER BY ${sortColumns[filters.sortBy]} ${direction}, employee_id
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );
    return result.rows.map(mapEmployeeRow);
  }

  async findTopExperts(skillNames: string[], limit: number): Promise<ResourceEmployee[]> {
    if (skillNames.length === 0) return [];
    const result = await this.pool.query<EmployeeRow>(
      `WITH ranked AS (
         SELECT e.employee_id, concat_ws(' ', e.first_name, e.last_name) AS employee_name,
                e.designation, e.location, e.department,
                e.availability_percentage AS availability,
                es.proficiency_level AS proficiency,
                es.years_experience AS experience_years,
                0::int AS project_count,
                jsonb_build_array(jsonb_build_object(
                  'skillName', es.skill_name, 'proficiencyLevel', es.proficiency_level,
                  'yearsExperience', es.years_experience
                )) AS skills,
                row_number() OVER (
                  PARTITION BY e.employee_id
                  ORDER BY CASE lower(es.proficiency_level)
                             WHEN 'expert' THEN 4 WHEN 'advanced' THEN 3
                             WHEN 'intermediate' THEN 2 WHEN 'beginner' THEN 1 ELSE 0
                           END DESC, es.years_experience DESC
                ) AS skill_rank
         FROM employees e
         JOIN employee_skills es ON es.employee_id = e.employee_id
         WHERE e.employee_status = 'active' AND lower(es.skill_name) = ANY($1::text[])
       )
       SELECT employee_id, employee_name, designation, location, department, availability,
              proficiency, experience_years, project_count, skills
       FROM ranked
       WHERE skill_rank = 1
       ORDER BY CASE lower(proficiency)
                  WHEN 'expert' THEN 4 WHEN 'advanced' THEN 3
                  WHEN 'intermediate' THEN 2 WHEN 'beginner' THEN 1 ELSE 0
                END DESC, experience_years DESC, employee_id
       LIMIT $2`,
      [skillNames.map((name) => name.toLowerCase()), limit]
    );
    return result.rows.map(mapEmployeeRow);
  }

  async findTeamCandidates(skillNames: string[]): Promise<ResourceEmployee[]> {
    if (skillNames.length === 0) return [];
    const result = await this.pool.query<EmployeeRow>(
      `SELECT e.employee_id, concat_ws(' ', e.first_name, e.last_name) AS employee_name,
              e.designation, e.location, e.department, e.availability_percentage AS availability,
              max(es.proficiency_level) AS proficiency,
              max(es.years_experience) AS experience_years,
              count(DISTINCT pe.project_id)::int AS project_count,
              jsonb_agg(DISTINCT jsonb_build_object(
                'skillName', es.skill_name, 'proficiencyLevel', es.proficiency_level,
                'yearsExperience', es.years_experience
              )) AS skills
       FROM employees e
       JOIN employee_skills es ON es.employee_id = e.employee_id
       LEFT JOIN project_experience pe ON pe.employee_id = e.employee_id
       WHERE e.employee_status = 'active'
         AND e.availability_percentage > 0
         AND lower(es.skill_name) = ANY($1::text[])
       GROUP BY e.employee_id
       ORDER BY e.availability_percentage DESC, e.employee_id
       LIMIT 500`,
      [skillNames.map((name) => name.toLowerCase())]
    );
    return result.rows.map(mapEmployeeRow);
  }

  async findDirectReports(managerName: string): Promise<Array<{ firstName: string; lastName: string; designation: string | null }>> {
    const result = await this.pool.query<{
      first_name: string;
      last_name: string;
      designation: string | null;
    }>(
      `SELECT first_name, last_name, designation
       FROM employees
       WHERE employee_status = 'active' AND lower(manager_name) = lower($1)
       ORDER BY last_name, first_name
       LIMIT 500`,
      [managerName]
    );
    return result.rows.map((row) => ({
      firstName: row.first_name,
      lastName: row.last_name,
      designation: row.designation
    }));
  }
}

function mapEmployeeRow(row: EmployeeRow): ResourceEmployee {
  const skills = Array.isArray(row.skills)
    ? row.skills.map((skill) => ({
        skillName: skill.skillName ?? "",
        proficiencyLevel: skill.proficiencyLevel ?? "Unknown",
        yearsExperience: Number(skill.yearsExperience ?? 0)
      }))
    : [];
  return {
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    designation: row.designation,
    location: row.location,
    department: row.department,
    availability: Number(row.availability),
    proficiency: row.proficiency ?? "Unknown",
    experienceYears: Number(row.experience_years),
    projectCount: Number(row.project_count),
    skills
  };
}
