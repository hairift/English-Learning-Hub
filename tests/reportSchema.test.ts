import { describe, expect, it } from "vitest";
import { reportJsonSchema } from "../server/providers/reportSchema";

describe("OpenAI report JSON schema", () => {
  it("requires the same top-level fields as the public report result", () => {
    expect(reportJsonSchema.additionalProperties).toBe(false);
    expect(reportJsonSchema.required).toEqual([
      "reportId",
      "totalScore",
      "dimensions",
      "summaryZh",
      "corrections",
      "suggestions",
      "coachCommentZh",
      "provider"
    ]);
  });

  it("requires score dimension fields so live reports stay renderable", () => {
    const dimensions = reportJsonSchema.properties.dimensions;

    expect(dimensions.minItems).toBe(7);
    expect(dimensions.maxItems).toBe(7);
    expect(dimensions.items.properties.id.enum).toEqual([
      "fluency",
      "pronunciation",
      "grammar",
      "vocabulary",
      "coherence",
      "task_completion",
      "interaction"
    ]);
    expect(dimensions.items.required).toEqual([
      "id",
      "labelZh",
      "labelEn",
      "score",
      "explanationZh"
    ]);
  });

  it("allows optional one-screen diagnostic report fields", () => {
    const properties = reportJsonSchema.properties as Record<string, any>;

    expect(reportJsonSchema.required).not.toContain("sentenceAnalyses");
    expect(properties.sentenceAnalyses.items.required).toEqual([
      "original",
      "improved",
      "issueType",
      "explanationZh",
      "highlights"
    ]);
    expect(properties.pronunciationTips.items.required).toEqual([
      "wordOrPhrase",
      "issueZh",
      "tipZh",
      "example"
    ]);
    expect(properties.evidenceTurns.items.properties.speaker.enum).toEqual(["user"]);
    expect(properties.nextPractice.required).toEqual([
      "goalZh",
      "targetSentence",
      "chunks",
      "drills"
    ]);
  });
});
