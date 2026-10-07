import { orgHierarchySchema } from "../schemas/resourceSchemas.js";
import type { HierarchyService } from "../services/hierarchyService.js";

export function createOrgHierarchyTool(hierarchy: HierarchyService) {
  return {
    schema: orgHierarchySchema,
    async execute(input: unknown) {
      const args = orgHierarchySchema.parse(input);
      return hierarchy.getDirectReports(args.managerName);
    }
  };
}
