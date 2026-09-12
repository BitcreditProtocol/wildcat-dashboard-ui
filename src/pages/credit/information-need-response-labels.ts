import { defineMessages, type IntlShape } from "react-intl";

export type InformationNeedResponsePath = "correct_answer" | "upload_supporting_document" | "explain_evidence_unavailable";

const messages = defineMessages({
  correctAnswer: {
    id: "credit.investigation.response.correctAnswer",
    defaultMessage: "Correct the answer",
    description: "Human-readable applicant response path for correcting an answer",
  },
  uploadEvidence: {
    id: "credit.investigation.response.uploadEvidence",
    defaultMessage: "Upload supporting evidence",
    description: "Human-readable applicant response path for uploading evidence",
  },
  evidenceUnavailable: {
    id: "credit.investigation.response.evidenceUnavailable",
    defaultMessage: "Explain why evidence is unavailable",
    description: "Human-readable applicant response path when evidence cannot be obtained",
  },
});

export function informationNeedResponseLabel(intl: IntlShape, response: InformationNeedResponsePath): string {
  switch (response) {
    case "correct_answer":
      return intl.formatMessage(messages.correctAnswer);
    case "upload_supporting_document":
      return intl.formatMessage(messages.uploadEvidence);
    case "explain_evidence_unavailable":
      return intl.formatMessage(messages.evidenceUnavailable);
  }
}
