export type NodeStatus = "approved" | "review" | "comments" | "unchecked" | "draft";

export type FileType = "pdf" | "docx" | "xlsx" | "pptx" | "txt" | "dwg" | "unknown";

export type NodeKind = "central" | "section" | "ird" | "subsection" | "package" | "document";

export type ProcessStatus = "draft" | "sent" | "in_work" | "rejected" | "accepted";

export type ProcessDirection = "forward" | "backward" | "both";

export type ProjectParticipantRole = "admin" | "gip" | "coordinator" | "architect" | "constructor" | "engineer" | "estimator" | "observer" | "contractor";

export type ProjectParticipantStatus = "active" | "invited" | "blocked";

export type IntegrationProvider = "outlook" | "yandex" | "gmail" | "telegram" | "folder";

export type IntegrationStatus = "connected" | "not_connected" | "needs_permission";

export type UserIntegration = {
  id: string;
  provider: IntegrationProvider;
  label: string;
  status: IntegrationStatus;
  account?: string;
  folderPath?: string;
  lastSyncAt?: string;
};

export type ProjectParticipant = {
  id: string;
  projectId: string;
  name: string;
  position: string;
  role: ProjectParticipantRole;
  email: string;
  phone: string;
  messenger?: string;
  otherContacts?: string;
  status: ProjectParticipantStatus;
  integrations?: UserIntegration[];
};

export type ProcessFieldKey = "documents" | "sender" | "approver" | "deadline" | "comment" | "result";

export type ProcessFieldRequirement = {
  key: ProcessFieldKey;
  label: string;
  required: boolean;
};

export type ProcessDocumentRequirement = {
  documentId: string;
  required: boolean;
};

export type ProjectNode = {
  id: string;
  projectId: string;
  levelId: string;
  type: NodeKind;
  title: string;
  shortCode?: string;
  description?: string;
  status?: NodeStatus;
  responsible?: string;
  updatedAt?: string;
  tags?: string[];
  deadlineAt?: string;
  childrenLevelId?: string;
  documentOwnerNodeId?: string;
  fileType?: FileType;
  document?: ProcessDocument;
};

export type ProcessDocument = {
  id: string;
  title: string;
  fileType: FileType;
  version: string;
  status: NodeStatus;
  from: string;
  updatedAt: string;
  size?: string;
  source?: "demo" | "mail" | "chat" | "drop" | "manual" | IntegrationProvider;
  fileUrl?: string;
  fileText?: string;
  mimeType?: string;
  detectedTag?: string;
  receivedByParticipantId?: string;
  receivedByEmail?: string;
  integrationProvider?: IntegrationProvider;
  autoRouted?: boolean;
  isNew?: boolean;
  originPath?: string;
};

export type BusinessProcess = {
  id: string;
  projectId: string;
  levelId: string;
  from: string;
  to: string;
  title: string;
  description: string;
  status: ProcessStatus;
  direction: ProcessDirection;
  sender: string;
  receiver: string;
  createdAt: string;
  validationAt?: string;
  dueAt?: string;
  approver?: string;
  parallelIndex?: number;
  source: "demo" | "manual" | "mail" | "chat";
  tag?: string;
  documents: ProcessDocument[];
  requiredFields?: ProcessFieldRequirement[];
  documentRequirements?: ProcessDocumentRequirement[];
};

export type MapLevel = {
  id: string;
  projectId: string;
  title: string;
  subtitle: string;
  centralNodeId: string;
  nodeIds: string[];
  parentLevelId?: string;
  parentNodeId?: string;
};

export type ChatMessage = {
  id: string;
  projectId: string;
  author: string;
  role: string;
  text: string;
  time: string;
  processId?: string;
  nodeId?: string;
};

export type DemoProject = {
  id: string;
  title: string;
  address: string;
  updatedAt: string;
  storageUsedGb: number;
  storageLimitGb: number;
  levels: MapLevel[];
  nodes: ProjectNode[];
  processes: BusinessProcess[];
  inboxDocuments: ProcessDocument[];
  chatMessages: ChatMessage[];
  participants: ProjectParticipant[];
};

export type ProjectTemplate = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  sourceProjectTitle: string;
  levels: MapLevel[];
  nodes: ProjectNode[];
  processes: BusinessProcess[];
};

export type DemoNotification = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  time: string;
  targetNodeId?: string;
  targetProcessId?: string;
  unread?: boolean;
};

export type NodeEdit = Partial<Pick<ProjectNode, "title" | "shortCode" | "description" | "status" | "responsible" | "tags" | "deadlineAt">>;

export type ProcessEdit = Partial<
  Pick<
    BusinessProcess,
    | "title"
    | "description"
    | "status"
    | "direction"
    | "sender"
    | "receiver"
    | "validationAt"
    | "dueAt"
    | "approver"
    | "documents"
    | "requiredFields"
    | "documentRequirements"
  >
>;

export type ParticipantEdit = Omit<ProjectParticipant, "id" | "projectId">;

export type SearchMatches = {
  nodeIds: Set<string>;
  processIds: Set<string>;
};

export type Vec2 = {
  x: number;
  y: number;
};
