import { describe, expect, it } from "vitest";
import { SkillMatchingService } from "../src/services/skillMatchingService.js";

describe("SkillMatchingService", () => {
  const service = new SkillMatchingService();

  it.each([
    ["AKS", ["Kubernetes"], ["Kubernetes"]],
    ["Azure DevOps", ["DevOps"], ["DevOps"]],
    ["Spring", ["Spring Boot"], ["Spring Boot"]]
  ])("maps %s synonyms", async (query, catalog, expected) => {
    await expect(service.matchSkillNames(query, catalog)).resolves.toEqual(expected);
  });

  it("matches misspelled skill names and returns no unrelated short fuzzy match", async () => {
    await expect(service.matchSkillNames("Kubernets", ["Kubernetes", "Java"])).resolves.toEqual(["Kubernetes"]);
    await expect(service.matchSkillNames("Go", ["Golang"])).resolves.toEqual([]);
  });
});
