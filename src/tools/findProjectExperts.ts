import { findProjectExpertsSchema } from "../schemas/resourceSchemas.js";
import type { ResourceService } from "../services/resourceService.js";

export function createFindProjectExpertsTool(resources: ResourceService) {
  return {
    schema: findProjectExpertsSchema,
    async execute(input: unknown) {
      const args = findProjectExpertsSchema.parse(input);
      return resources.findProjectExperts(args.projectName);
    }
  };
}
