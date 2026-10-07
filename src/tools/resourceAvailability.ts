import { resourceAvailabilitySchema } from "../schemas/resourceSchemas.js";
import type { ResourceService } from "../services/resourceService.js";

export function createResourceAvailabilityTool(resources: ResourceService) {
  return {
    schema: resourceAvailabilitySchema,
    async execute(input: unknown) {
      const args = resourceAvailabilitySchema.parse(input);
      const results = await resources.search(args.skill, {
        page: 1,
        pageSize: 100,
        sortBy: "availability",
        sortOrder: "desc"
      }, args.minimumAvailability);
      return results.map((employee) => ({
        employeeName: employee.employeeName,
        availability: employee.availability
      }));
    }
  };
}
