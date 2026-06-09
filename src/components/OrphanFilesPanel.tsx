import { FilePlus2, FileText, LocateFixed, Maximize2 } from "lucide-react";
import { getDocumentFromNode, getFileLabel, getFileTypeColor, getOrphanDocumentNodes } from "../lib/graph";
import type { DemoProject, ProcessDocument } from "../types";

type OrphanFilesPanelProps = {
  project: DemoProject;
  onAddRandomFile: () => void;
  onFocusDocumentNode: (nodeId: string) => void;
  onOpenDocument: (document: ProcessDocument) => void;
};

export function OrphanFilesPanel({
  project,
  onAddRandomFile,
  onFocusDocumentNode,
  onOpenDocument,
}: OrphanFilesPanelProps) {
  const files = getOrphanDocumentNodes(project);

  return (
    <aside className="orphan-files-panel glass-panel">
      <header>
        <div>
          <span>Неразобранные</span>
          <strong>Бесхозные файлы</strong>
        </div>
        <button onClick={onAddRandomFile}>
          <FilePlus2 size={16} />
          Добавить случайный файл
        </button>
      </header>

      {files.length ? (
        <div className="orphan-files-list">
          {files.slice(0, 6).map((node) => {
            const document = getDocumentFromNode(node);
            const color = getFileTypeColor(document.fileType);
            return (
              <article key={node.id}>
                <button className="orphan-main-action" onClick={() => onFocusDocumentNode(node.id)}>
                  <span style={{ color }}>
                    <FileText size={16} />
                  </span>
                  <div>
                    <b>{document.title}</b>
                    <small>{getFileLabel(document.fileType)} · {document.updatedAt}</small>
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
        <p>Нет бесхозных файлов. Новые файлы появятся здесь перед разбором по разделам.</p>
      )}
    </aside>
  );
}
