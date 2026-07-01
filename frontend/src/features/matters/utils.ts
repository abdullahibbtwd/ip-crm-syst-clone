import type { MatterType } from "./types";

export type AttributeFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "tags";

export type AttributeFieldConfig = {
  key: string;
  label: string;
  type: AttributeFieldType;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  helpText?: string;
};

export const MATTER_TYPE_LABELS: Record<MatterType, string> = {
  trademark: "Trademark",
  patent: "Patent",
  utility_model: "Utility model",
  industrial_design: "Industrial design",
  copyright: "Copyright",
  geographical_indication: "Geographical indication",
  border_measures: "Border measures",
  fto_analysis: "FTO analysis",
  valuation: "Valuation",
  dispute_opposition: "Dispute / opposition",
};

export const MATTER_STATUS_LABELS: Record<
  import("./types").MatterStatus,
  string
> = {
  draft: "Draft",
  active: "Active",
  on_hold: "On hold",
  closed: "Closed",
  abandoned: "Abandoned",
};

export const MATTER_STATUS_BADGE_VARIANT: Record<
  import("./types").MatterStatus,
  | "default"
  | "secondary"
  | "outline"
  | "destructive"
  | "success"
  | "warning"
  | "info"
> = {
  draft: "secondary",
  active: "success",
  on_hold: "warning",
  closed: "outline",
  abandoned: "destructive",
};

export const JURISDICTION_STATUS_LABELS: Record<
  import("./types").MatterJurisdictionStatus,
  string
> = {
  pending: "Pending",
  filed: "Filed",
  approved: "Approved",
  rejected: "Rejected",
};

export const IP_RIGHT_STATUS_LABELS: Record<
  import("./types").IpRightStatus,
  string
> = {
  pending: "Pending filing",
  filed: "Filed",
  registered: "Registered",
  expired: "Expired",
  cancelled: "Cancelled",
};

const MARK_TYPE_OPTIONS = [
  { value: "wordmark", label: "Word mark" },
  { value: "figurative", label: "Figurative" },
  { value: "combined", label: "Combined" },
  { value: "three_dimensional", label: "3D" },
  { value: "sound", label: "Sound" },
];

export const MATTER_ATTRIBUTE_FIELDS: Record<
  MatterType,
  AttributeFieldConfig[]
> = {
  trademark: [
    {
      key: "niceClasses",
      label: "Nice classes",
      type: "tags",
      placeholder: "e.g. 12, 35",
    },
    {
      key: "markType",
      label: "Mark type",
      type: "select",
      options: MARK_TYPE_OPTIONS,
    },
    { key: "markDescription", label: "Mark description", type: "textarea" },
    { key: "colors", label: "Colours claimed", type: "text" },
  ],
  patent: [
    { key: "technicalField", label: "Technical field", type: "text" },
    { key: "claimsSummary", label: "Claims summary", type: "textarea" },
    { key: "priorityDate", label: "Priority date", type: "date" },
    { key: "pctNumber", label: "PCT number", type: "text" },
  ],
  utility_model: [
    { key: "technicalField", label: "Technical field", type: "text" },
    { key: "claimsSummary", label: "Claims summary", type: "textarea" },
    { key: "priorityDate", label: "Priority date", type: "date" },
  ],
  industrial_design: [
    { key: "locarnoClass", label: "Locarno class", type: "text" },
    {
      key: "productDescription",
      label: "Product description",
      type: "textarea",
    },
    {
      key: "designViews",
      label: "Design views",
      type: "textarea",
      helpText: "List or describe design views filed",
    },
  ],
  copyright: [
    { key: "workTitle", label: "Work title", type: "text" },
    { key: "workType", label: "Type of work", type: "text" },
    { key: "creationDate", label: "Creation date", type: "date" },
  ],
  geographical_indication: [
    { key: "productName", label: "Product name", type: "text" },
    { key: "region", label: "Geographical region", type: "text" },
  ],
  border_measures: [
    { key: "customsOffice", label: "Customs office", type: "text" },
    {
      key: "infringingGoods",
      label: "Infringing goods description",
      type: "textarea",
    },
  ],
  fto_analysis: [
    { key: "technologyArea", label: "Technology area", type: "text" },
    { key: "scopeSummary", label: "Scope summary", type: "textarea" },
  ],
  valuation: [
    { key: "assetDescription", label: "Asset description", type: "textarea" },
    { key: "valuationPurpose", label: "Valuation purpose", type: "text" },
  ],
  dispute_opposition: [
    { key: "opponentName", label: "Opponent / adverse party", type: "text" },
    { key: "disputeType", label: "Dispute type", type: "text" },
    { key: "basisSummary", label: "Basis summary", type: "textarea" },
  ],
};

export function formatJurisdictions(codes: string[]) {
  if (codes.length === 0) return "-";
  return codes.join(", ");
}

export function formatMatterDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function parseTagsInput(value: string): string[] {
  return value
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function tagsToInput(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "string") return value;
  return "";
}
