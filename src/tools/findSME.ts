import { findSmeSchema } from "../schemas/resourceSchemas.js";
import type { ResourceService } from "../services/resourceService.js";

export function createFindSmeTool(resources: ResourceService) {
  return {
    schema: findSmeSchema,
    async execute(input: unknown) {
      const args = findSmeSchema.parse(input);
      const results = await resources.findTopExperts(args.skill, 10);
      return results.map((employee) => ({
        employeeName: employee.employeeName,
        proficiency: employee.proficiency,
        experienceYears: employee.experienceYears
      }));
    }
  };
}
