const synonyms: Record<string, string[]> = {
  aks: ["kubernetes"],
  kubernetes: ["aks"],
  "azure devops": ["devops"],
  devops: ["azure devops"],
  spring: ["spring boot"],
  "spring boot": ["spring"]
};

export class SkillMatchingService {
  async matchSkillNames(input: string, availableSkillNames: string[]): Promise<string[]> {
    const normalizedInput = normalize(input);
    const aliases = [normalizedInput, ...(synonyms[normalizedInput] ?? [])];
    const exactMatches = availableSkillNames.filter((name) => aliases.includes(normalize(name)));
    if (exactMatches.length > 0) return [...new Set(exactMatches)];

    return availableSkillNames.filter((name) => {
      const normalizedName = normalize(name);
      return aliases.some((alias) => {
        if (Math.min(alias.length, normalizedName.length) < 4) return false;
        const distance = levenshtein(alias, normalizedName);
        return 1 - distance / Math.max(alias.length, normalizedName.length) >= 0.72;
      });
    });
  }
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function levenshtein(left: string, right: string): number {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        (current[rightIndex - 1] ?? 0) + 1,
        (previous[rightIndex] ?? 0) + 1,
        (previous[rightIndex - 1] ?? 0) + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      );
    }
    previous = current;
  }
  return previous[right.length] ?? 0;
}
