import clsx from "clsx";
import { type DragEvent, useState } from "react";
import { FilePlus2, FileText, LocateFixed, Maximize2 } from "lucide-react";
import { getFileLabel, getFileTypeColor } from "../lib/graph";
import type { DemoProject, ProcessDocument } from "../types";

type OrphanFilesPanelProps = {
  project: DemoProject;
  onAddRandomFile: (tag?: string) => void;
  onMaterializeInboxDocument: (documentId: string) => void;
  onMoveDocumentNodeToInbox: (documentNodeId: string) => void;
  onImportFiles: (files: File[]) => void;
  onOpenDocument: (document: ProcessDocument) => void;
};

export function OrphanFilesPanel({
  project,
  onAddRandomFile,
  onMaterializeInboxDocument,
  onMoveDocumentNodeToInbox,
  onImportFiles,
  onOpenDocument,
}: OrphanFilesPanelProps) {
  const [tag, setTag] = useState("");
  const [dropActive, setDropActive] = useState(false);
  const files = project.inboxDocuments;

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
              <article key={document.id} className={clsx(document.isNew && "incoming-new")}>
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
    </aside>
  );
}
