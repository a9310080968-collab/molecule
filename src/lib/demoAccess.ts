import type { BusinessProcess, DemoProject, DemoUserRole, ProjectNode, ProjectParticipant } from "../types";

export type DemoAccess = {
  role: DemoUserRole;
  label: string;
  scopeLabel: string;
  canViewAll: boolean;
  canEditAssignedWork: boolean;
  canEditStructure: boolean;
  canApprove: boolean;
  canCreateTasks: boolean;
  canUploadFiles: boolean;
  canViewChecks: boolean;
  canViewParticipants: boolean;
  canManageUsers: boolean;
  canManageProjects: boolean;
  canViewProjectSettings: boolean;
};

export const demoAccessByRole: Record<DemoUserRole, DemoAccess> = {
  employee: {
    role: "employee",
    label: "Employee",
    scopeLabel: "Assigned sections and tasks",
    canViewAll: false,
    canEditAssignedWork: true,
    canEditStructure: false,
    canApprove: false,
    canCreateTasks: true,
    canUploadFiles: true,
    canViewChecks: false,
    canViewParticipants: false,
    canManageUsers: false,
    canManageProjects: false,
    canViewProjectSettings: false,
  },
  gip: {
    role: "gip",
    label: "Lead Project Engineer",
    scopeLabel: "All sections and approvals",
    canViewAll: true,
    canEditAssignedWork: true,
    canEditStructure: true,
    canApprove: true,
    canCreateTasks: true,
    canUploadFiles: true,
    canViewChecks: true,
    canViewParticipants: true,
    canManageUsers: false,
    canManageProjects: false,
    canViewProjectSettings: false,
  },
  director: {
    role: "director",
    label: "Director",
    scopeLabel: "All projects and employees",
    canViewAll: true,
    canEditAssignedWork: true,
    canEditStructure: true,
    canApprove: true,
    canCreateTasks: true,
    canUploadFiles: true,
    canViewChecks: true,
    canViewParticipants: true,
    canManageUsers: true,
    canManageProjects: true,
    canViewProjectSettings: true,
  },
};

export function resolveDemoUser(project: DemoProject, role: DemoUserRole) {
  const participants = project.participants.filter((participant) => participant.status !== "blocked");
  if (role === "employee") {
    return participants.find((participant) => participant.name === "Alisa Bishop")
      ?? participants.find((participant) => !["admin", "gip", "observer"].includes(participant.role))
      ?? participants[0];
  }
  if (role === "gip") {
    return participants.find((participant) => participant.name === "John Smith")
      ?? participants.find((participant) => participant.role === "gip" || participant.role === "admin")
      ?? participants[0];
  }
  return participants.find((participant) => participant.name === "Matthew Brown")
    ?? participants.find((participant) => /director/i.test(participant.position))
    ?? participants.find((participant) => participant.role === "admin")
    ?? participants[0];
}

export function canEditNode(access: DemoAccess, user: ProjectParticipant | undefined, node: ProjectNode) {
  if (access.canEditStructure) {
    return true;
  }
  return Boolean(access.canEditAssignedWork && user && node.responsible === user.name);
}

export function canEditProcess(access: DemoAccess, user: ProjectParticipant | undefined, process: BusinessProcess) {
  if (access.canEditStructure) {
    return true;
  }
  return Boolean(
    access.canEditAssignedWork
      && user
      && [process.sender, process.receiver, process.approver, ...(process.participantNames ?? [])].includes(user.name),
  );
}

export function buildRoleProject(project: DemoProject, user: ProjectParticipant | undefined, access: DemoAccess): DemoProject {
  if (access.canViewAll || !user) {
    return project;
  }

  const assignedNodeIds = new Set(
    project.nodes
      .filter((node) => node.responsible === user.name)
      .map((node) => node.id),
  );
  const relevantProcesses = project.processes.filter((process) => isUserProcess(process, user, assignedNodeIds));
  const visibleNodeIds = new Set(
    project.nodes
      .filter((node) => node.type === "central" || assignedNodeIds.has(node.id))
      .map((node) => node.id),
  );

  relevantProcesses.forEach((process) => {
    visibleNodeIds.add(process.from);
    visibleNodeIds.add(process.to);
  });
  project.nodes.forEach((node) => {
    if (node.type === "document" && node.documentOwnerNodeId && visibleNodeIds.has(node.documentOwnerNodeId)) {
      visibleNodeIds.add(node.id);
    }
  });

  const visibleNodes = project.nodes.filter((node) => visibleNodeIds.has(node.id));
  const visibleProcessIds = new Set(relevantProcesses.map((process) => process.id));
  const visibleInbox = project.inboxDocuments.filter((document) =>
    !document.receivedByParticipantId
      || document.receivedByParticipantId === user.id
      || document.receivedByEmail === user.email,
  );

  return {
    ...project,
    nodes: visibleNodes,
    levels: project.levels.map((level) => ({
      ...level,
      nodeIds: level.nodeIds.filter((nodeId) => visibleNodeIds.has(nodeId)),
    })),
    processes: project.processes.filter((process) => visibleProcessIds.has(process.id)),
    inboxDocuments: visibleInbox,
  };
}

function isUserProcess(process: BusinessProcess, user: ProjectParticipant, assignedNodeIds: Set<string>) {
  return [process.sender, process.receiver, process.approver, ...(process.participantNames ?? []), ...(process.delegatedTo ?? [])].includes(user.name)
    || assignedNodeIds.has(process.from)
    || assignedNodeIds.has(process.to);
}
