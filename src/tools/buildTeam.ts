import { buildTeamSchema } from "../schemas/resourceSchemas.js";
import type { TeamBuilderService } from "../services/teamBuilderService.js";

export function createBuildTeamTool(teamBuilder: TeamBuilderService) {
  return {
    schema: buildTeamSchema,
    async execute(input: unknown) {
      const args = buildTeamSchema.parse(input);
      return teamBuilder.build(args.projectType);
    }
  };
}
