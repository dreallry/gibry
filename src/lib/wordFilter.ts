/**
 * Word Filter (UX Layer for Student Safety)
 * Note: Runs on client-side as a friendly deterrent against inappropriate language.
 */

const BAD_WORDS_ID = [
  "anjing", "anjir", "anjay", "babi", "bangsat", "bajingan", "kontol", "memek",
  "pantek", "peli", "itil", "jembut", "ngentot", "ngewe", "titit", "tetek",
  "toket", "perek", "lonte", "pelacur", "goblok", "tolol", "bego", "idiot",
  "kampret", "asu", "tai", "setan", "iblis", "dungu", "sinting", "bencong",
  "banci", "homo", "lesbi", "kafir", "monyet", "kunyuk", "cacat", "autis",
  "bitch", "fuck", "shit", "asshole", "bastard", "dick", "pussy"
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b")
    .replace(/@/g, "a")
    .replace(/[$]/g, "s")
    .replace(/[^a-z0-9\s]/g, "");
}

export function checkContent(text: string): { clean: boolean; flaggedWords: string[] } {
  if (!text || typeof text !== "string") {
    return { clean: true, flaggedWords: [] };
  }

  const normalized = normalizeText(text);
  const words = normalized.split(/\s+/);
  const flagged = new Set<string>();

  for (const bad of BAD_WORDS_ID) {
    // Check exact word token
    if (words.includes(bad)) {
      flagged.add(bad);
      continue;
    }

    // Check embedded word in text without spaces (e.g. "dasaranjing")
    const collapsed = normalized.replace(/\s+/g, "");
    if (collapsed.includes(bad) && bad.length >= 4) {
      flagged.add(bad);
    }
  }

  const flaggedWords = Array.from(flagged);
  return {
    clean: flaggedWords.length === 0,
    flaggedWords,
  };
}
