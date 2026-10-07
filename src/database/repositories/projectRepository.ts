import type { Pool } from "pg";
import type { ProjectExpert } from "../../types/resourceTypes.js";

export class ProjectRepository {
  constructor(private readonly pool: Pool) {}

  async findExperts(projectName: string): Promise<ProjectExpert[]> {
    const result = await this.pool.query<{ employee: string; role: string | null }>(
      `SELECT concat_ws(' ', e.first_name, e.last_name) AS employee, pe.role_name AS role
       FROM project_experience pe
       JOIN employees e ON e.employee_id = pe.employee_id
       WHERE e.employee_status = 'active'
         AND lower(pe.project_name) LIKE '%' || lower($1) || '%'
       ORDER BY pe.end_date DESC NULLS FIRST, pe.start_date DESC NULLS LAST
       LIMIT 10`,
      [projectName]
    );
    return result.rows;
  }
}
