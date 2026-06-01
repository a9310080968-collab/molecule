export type NodeStatus =
  | "approved"
  | "review"
  | "comments"
  | "unchecked"
  | "draft";

export type FileType = "pdf" | "docx" | "xlsx" | "pptx" | "txt" | "dwg" | "unknown";

export type DocumentSource = "project" | "drop" | "mail" | "ai";

export type ProjectNode = {
  id: string;
  type: "central" | "section" | "document" | "planned";
  title: string;
  color?: string;
  shortCode?: string;
  description?: string;
  progress?: number;
  status?: NodeStatus;
  version?: string;
  parentId?: string;
  responsible?: string;
  updatedAt?: string;
  fileType?: FileType;
  fileUrl?: string;
  fileText?: string;
  fileSize?: string;
  mimeType?: string;
  sourceUrl?: string;
  source?: DocumentSource;
  isNew?: boolean;
  deadlineAt?: string;
  tags?: string[];
  absorbed?: boolean;
  children?: string[];
};

export type NodeEdit = {
  title?: string;
  color?: string;
  type?: "section" | "document";
  shortCode?: string;
  progress?: number;
  status?: NodeStatus;
  version?: string;
  parentId?: string;
  fileType?: FileType;
  isNew?: boolean;
  deadlineAt?: string;
  tags?: string[];
  absorbed?: boolean;
};

export type NodeEdits = Record<string, NodeEdit>;

export type ProjectLink = {
  id: string;
  from: string;
  to: string;
  strength: "primary" | "secondary" | "tertiary";
  source: "auto" | "manual";
  pinned?: boolean;
  parallelOffset?: number;
};

export type LinkEdit = {
  title?: string;
  description?: string;
};

export type LinkEdits = Record<string, LinkEdit>;

export type SearchMatches = {
  nodeIds: Set<string>;
  linkIds: Set<string>;
};

export type StatusLabels = Record<NodeStatus, string>;

export type StatusColors = Record<NodeStatus, string>;

export type Vec3 = [number, number, number];

export type DropPlacement = {
  id: string;
  x: number;
  y: number;
  offset: number;
  nonce: number;
};

export type SectionReviewStatus = "idle" | "sent" | "approved" | "partial" | "rejected";

export type SectionReview = {
  status: SectionReviewStatus;
  approvedDocumentIds: string[];
  submittedAt?: string;
  decidedAt?: string;
};

export type SectionReviews = Record<string, SectionReview>;

export type DemoNotification = {
  id: string;
  title: string;
  description: string;
  time: string;
  targetId?: string;
  unread?: boolean;
};

export type IntakeBucketId = "unsorted" | "mail";

export type IntakeItem = {
  id: string;
  nodeId: string;
  bucket: IntakeBucketId;
  title: string;
  fileType?: FileType;
  source: DocumentSource;
  matchedSectionId?: string;
  createdAt: string;
  tag?: string;
};

export type AiSuggestionStatus = "pending" | "applied" | "dismissed";

export type AiSuggestedLink = {
  targetId: string;
  targetTitle: string;
  reason: string;
};

export type AiSuggestion = {
  id: string;
  itemId: string;
  nodeId: string;
  title: string;
  suggestedSectionId?: string;
  suggestedSectionTitle?: string;
  suggestedSectionCode?: string;
  confidence: number;
  summary: string;
  reasons: string[];
  detectedTags: string[];
  suggestedLinks: AiSuggestedLink[];
  status: AiSuggestionStatus;
};
