import { searchResourcesSchema } from "../schemas/resourceSchemas.js";
import type { ResourceService } from "../services/resourceService.js";

export function createSearchResourcesTool(resources: ResourceService) {
  return {
    schema: searchResourcesSchema,
    async execute(input: unknown) {
      const args = searchResourcesSchema.parse(input);
      const results = await resources.search(args.skill, {
        ...(args.department === undefined ? {} : { department: args.department }),
        ...(args.location === undefined ? {} : { location: args.location }),
        page: args.page,
        pageSize: args.pageSize,
        sortBy: args.sortBy,
        sortOrder: args.sortOrder
      });
      return results.map((employee) => ({
        employeeName: employee.employeeName,
        designation: employee.designation,
        proficiency: employee.proficiency,
        location: employee.location
      }));
    }
  };
}
