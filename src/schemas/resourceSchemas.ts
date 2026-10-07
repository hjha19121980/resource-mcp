import { z } from "zod";

const nonEmptyString = (field: string) =>
  z.string().trim().min(1, `${field} must not be empty`).max(200);

export const searchResourcesSchema = z.object({
  skill: nonEmptyString("skill"),
  department: nonEmptyString("department").optional(),
  location: nonEmptyString("location").optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
  sortBy: z.enum(["availability", "experience", "name"]).default("availability"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
}).strict();

export const findSmeSchema = z.object({
  skill: nonEmptyString("skill")
}).strict();

export const resourceAvailabilitySchema = z.object({
  skill: nonEmptyString("skill"),
  minimumAvailability: z.number().int().min(0).max(100)
}).strict();

export const orgHierarchySchema = z.object({
  managerName: nonEmptyString("managerName")
}).strict();

export const findProjectExpertsSchema = z.object({
  projectName: nonEmptyString("projectName")
}).strict();

export const buildTeamSchema = z.object({
  projectType: nonEmptyString("projectType").refine(
    (projectType) => /cloud\s*migration|ai\s*platform/i.test(projectType),
    "projectType must be Cloud Migration or AI Platform"
  )
}).strict();

export type SearchResourcesInput = z.infer<typeof searchResourcesSchema>;
export type FindSmeInput = z.infer<typeof findSmeSchema>;
export type ResourceAvailabilityInput = z.infer<typeof resourceAvailabilitySchema>;
export type OrgHierarchyInput = z.infer<typeof orgHierarchySchema>;
export type FindProjectExpertsInput = z.infer<typeof findProjectExpertsSchema>;
export type BuildTeamInput = z.infer<typeof buildTeamSchema>;
