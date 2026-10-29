import { defineMessages } from "react-intl";
export const capacityLabels = defineMessages({
  "initial-interviews": { id: "cockpit.capacity.interviews", defaultMessage: "Open initial interviews", description: "Capacity label" },
  "case-cabinet-revisions": { id: "cockpit.capacity.cases", defaultMessage: "Case cabinet revisions", description: "Capacity label" },
  "case-cabinet-history-bytes": {
    id: "cockpit.capacity.caseBytes",
    defaultMessage: "Case cabinet encrypted history",
    description: "Capacity label",
  },
  "finance-lock-cabinet-revisions": {
    id: "cockpit.capacity.locks",
    defaultMessage: "Finance-lock cabinet revisions",
    description: "Capacity label",
  },
  "finance-lock-cabinet-history-bytes": {
    id: "cockpit.capacity.lockBytes",
    defaultMessage: "Finance-lock cabinet encrypted history",
    description: "Capacity label",
  },
  "discussion-journals": { id: "cockpit.capacity.discussions", defaultMessage: "Discussion journals", description: "Capacity label" },
});
export const capacityDetails = defineMessages({
  expiry: {
    id: "cockpit.capacity.expiry",
    defaultMessage:
      "Unsubmitted interviews expire after seven days of inactivity. Submitted records retain their slots; old encrypted revisions and backups require offline retention handling.",
    description: "Interview retention detail",
  },
  unavailable: {
    id: "cockpit.capacity.unavailable",
    defaultMessage: "Storage unavailable or not configured.",
    description: "Storage capacity unavailable",
  },
  sealed: {
    id: "cockpit.capacity.sealed",
    defaultMessage: "Sealed; configure the authenticated successor.",
    description: "Sealed store capacity detail",
  },
  rotation: {
    id: "cockpit.capacity.rotation",
    defaultMessage: "Offline authenticated rotation before exhaustion; predecessor history is retained.",
    description: "Store retention detail",
  },
  snapshots: {
    id: "cockpit.capacity.snapshots",
    defaultMessage: "Full snapshots amplify history; leave room for the complete workflow, not just one write.",
    description: "Store revision growth detail",
  },
});
