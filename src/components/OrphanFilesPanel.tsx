import clsx from "clsx";
import { type DragEvent, useEffect, useState } from "react";
import { FilePlus2, FileText, LocateFixed, Maximize2, Trash2 } from "lucide-react";
import { getFileLabel, getFileTypeColor } from "../lib/graph";
import type { DemoProject, ProcessDocument } from "../types";

type OrphanFilesPanelProps = {
  project: DemoProject;
  onAddRandomFile: (tag?: string) => void;
  onMaterializeInboxDocument: (documentId: string) => void;
  onMoveDocumentNodeToInbox: (documentNodeId: string) => void;
  onDeleteDocument: (documentId: string) => void;
  onImportFiles: (files: File[]) => void;
  onOpenDocument: (document: ProcessDocument) => void;
};

export function OrphanFilesPanel({
  project,
  onAddRandomFile,
  onMaterializeInboxDocument,
  onMoveDocumentNodeToInbox,
  onDeleteDocument,
  onImportFiles,
  onOpenDocument,
}: OrphanFilesPanelProps) {
  const [tag, setTag] = useState("");
  const [dropActive, setDropActive] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ documentId: string; x: number; y: number } | null>(null);
  const files = project.inboxDocuments;
  const contextDocument = contextMenu
    ? files.find((document) => document.id === contextMenu.documentId)
    : undefined;

  useEffect(() => {
    const closeContextMenu = (event: PointerEvent) => {
      if (!(event.target as HTMLElement).closest(".document-context-menu")) {
        setContextMenu(null);
      }
    };
    window.addEventListener("pointerdown", closeContextMenu);
    return () => window.removeEventListener("pointerdown", closeContextMenu);
  }, []);

  function addFile() {
    onAddRandomFile(tag.trim() || undefined);
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setDropActive(true);
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDropActive(false);

    const documentNodeId = event.dataTransfer.getData("application/x-molecule-document-node");
    if (documentNodeId) {
      onMoveDocumentNodeToInbox(documentNodeId);
      return;
    }

    const droppedFiles = Array.from(event.dataTransfer.files ?? []);
    if (droppedFiles.length) {
      onImportFiles(droppedFiles);
    }
  }

  return (
    <aside
      className={clsx("orphan-files-panel glass-panel", dropActive && "drop-active")}
      onDragOver={handleDragOver}
      onDragLeave={() => setDropActive(false)}
      onDrop={handleDrop}
    >
      <header>
        <div>
          <span>Неразобранные</span>
          <strong>Бесхозные файлы</strong>
        </div>
        <div className="orphan-add-control">
          <input
            value={tag}
            onChange={(event) => setTag(event.currentTarget.value)}
            placeholder="Тег, например АР"
            aria-label="Тег для случайного файла"
          />
          <button onClick={addFile}>
            <FilePlus2 size={16} />
            Добавить файл
          </button>
        </div>
      </header>

      {files.length ? (
        <div className="orphan-files-list">
          {files.slice(0, 8).map((document) => {
            const color = getFileTypeColor(document.fileType);
            return (
              <article
                key={document.id}
                className={clsx(document.isNew && "incoming-new")}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setContextMenu({
                    documentId: document.id,
                    x: Math.max(12, Math.min(event.clientX, window.innerWidth - 236)),
                    y: Math.max(12, Math.min(event.clientY, window.innerHeight - 174)),
                  });
                }}
              >
                <button
                  className="orphan-main-action"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/x-molecule-inbox-document", document.id);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => onMaterializeInboxDocument(document.id)}
                  title="Перетащите на рабочую область или нажмите, чтобы вынести файл на карту"
                >
                  <span style={{ color }}>
                    <FileText size={16} />
                  </span>
                  <div>
                    <b>{document.title}</b>
                    <small>{getFileLabel(document.fileType)} · {document.updatedAt}{document.isNew ? " · новое" : ""}</small>
                  </div>
                  <LocateFixed size={15} />
                </button>
                <button className="orphan-open-action" onClick={() => onOpenDocument(document)} aria-label="Открыть документ">
                  <Maximize2 size={15} />
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <p>Нет бесхозных файлов. Перетащите сюда файл с компьютера или отправьте тестовый файл из интеграций.</p>
      )}
      {contextMenu && contextDocument ? (
        <div
          className="document-context-menu context-menu glass-panel"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <strong>{contextDocument.title}</strong>
          <button
            onClick={() => {
              onMaterializeInboxDocument(contextDocument.id);
              setContextMenu(null);
            }}
          >
            <LocateFixed size={15} />
            Вынести на карту
          </button>
          <button
            onClick={() => {
              onOpenDocument(contextDocument);
              setContextMenu(null);
            }}
          >
            <Maximize2 size={15} />
            Открыть файл
          </button>
          <button
            className="danger"
            onClick={() => {
              onDeleteDocument(contextDocument.id);
              setContextMenu(null);
            }}
          >
            <Trash2 size={15} />
            Удалить файл
          </button>
        </div>
      ) : null}
    </aside>
  );
}
