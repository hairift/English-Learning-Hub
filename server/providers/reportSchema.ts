export const reportJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "reportId",
    "totalScore",
    "dimensions",
    "summaryZh",
    "corrections",
    "suggestions",
    "coachCommentZh",
    "provider"
  ],
  properties: {
    reportId: { type: "string" },
    totalScore: { type: "number", minimum: 0, maximum: 100 },
    dimensions: {
      type: "array",
      minItems: 7,
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "labelZh", "labelEn", "score", "explanationZh"],
        properties: {
          id: {
            type: "string",
            enum: [
              "fluency",
              "pronunciation",
              "grammar",
              "vocabulary",
              "coherence",
              "task_completion",
              "interaction"
            ]
          },
          labelZh: { type: "string" },
          labelEn: { type: "string" },
          score: { type: "number", minimum: 0, maximum: 100 },
          explanationZh: { type: "string" }
        }
      }
    },
    summaryZh: { type: "string" },
    corrections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["original", "improved", "explanationZh"],
        properties: {
          original: { type: "string" },
          improved: { type: "string" },
          explanationZh: { type: "string" }
        }
      }
    },
    suggestions: {
      type: "array",
      items: { type: "string" }
    },
    coachCommentZh: { type: "string" },
    provider: { type: "string" },
    sentenceAnalyses: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["original", "improved", "issueType", "explanationZh", "highlights"],
        properties: {
          original: { type: "string" },
          improved: { type: "string" },
          issueType: {
            type: "string",
            enum: ["grammar", "wording", "logic", "pronunciation"]
          },
          explanationZh: { type: "string" },
          highlights: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["originalText", "improvedText", "reasonZh"],
              properties: {
                originalText: { type: "string" },
                improvedText: { type: "string" },
                reasonZh: { type: "string" }
              }
            }
          }
        }
      }
    },
    pronunciationTips: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["wordOrPhrase", "issueZh", "tipZh", "example"],
        properties: {
          wordOrPhrase: { type: "string" },
          issueZh: { type: "string" },
          tipZh: { type: "string" },
          example: { type: "string" }
        }
      }
    },
    evidenceTurns: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["speaker", "text", "reasonZh"],
        properties: {
          speaker: { type: "string", enum: ["user"] },
          text: { type: "string" },
          reasonZh: { type: "string" }
        }
      }
    },
    nextPractice: {
      type: "object",
      additionalProperties: false,
      required: ["goalZh", "targetSentence", "chunks", "drills"],
      properties: {
        goalZh: { type: "string" },
        targetSentence: { type: "string" },
        chunks: { type: "array", items: { type: "string" } },
        drills: { type: "array", items: { type: "string" } }
      }
    }
  }
} as const;
