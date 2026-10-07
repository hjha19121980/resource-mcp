import type { Pool } from "pg";

export class SkillRepository {
  constructor(private readonly pool: Pool) {}

  async listSkillNames(): Promise<string[]> {
    const result = await this.pool.query<{ skill_name: string }>(
      "SELECT DISTINCT skill_name FROM employee_skills WHERE skill_name IS NOT NULL ORDER BY skill_name"
    );
    return result.rows.map((row) => row.skill_name);
  }
}
