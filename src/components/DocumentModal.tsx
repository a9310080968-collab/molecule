import { ExternalLink, FileSpreadsheet, FileText, FolderOpen, X } from "lucide-react";
import { getFileLabel, getFileTypeColor } from "../lib/graph";
import { nodeStatusLabels } from "../data/mockProject";
import type { ProcessDocument } from "../types";

type DocumentModalProps = {
  document: ProcessDocument | null;
  onShowInFolder: (document: ProcessDocument) => void;
  onClose: () => void;
};

export function DocumentModal({ document, onShowInFolder, onClose }: DocumentModalProps) {
  if (!document) {
    return null;
  }

  const accentColor = getFileTypeColor(document.fileType);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <article className="document-modal glass-panel">
        <header>
          <div>
            <span style={{ color: accentColor }}>
              <FileText size={18} />
              {getFileLabel(document.fileType)}
            </span>
            <h2>{document.title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть просмотр">
            <X size={20} />
          </button>
        </header>

        <DocumentPreview document={document} />

        <footer>
          <span>{document.version}</span>
          <span>{nodeStatusLabels[document.status]}</span>
          <span>{document.updatedAt}</span>
          <button onClick={() => document.fileUrl ? window.open(document.fileUrl, "_blank", "noopener,noreferrer") : undefined}>
            Открыть документ
            <ExternalLink size={17} />
          </button>
          <button onClick={() => onShowInFolder(document)}>
            Показать в папке
            <FolderOpen size={17} />
          </button>
        </footer>
      </article>
    </div>
  );
}

function DocumentPreview({ document }: { document: ProcessDocument }) {
  if (document.fileType === "pdf" && document.fileUrl) {
    return (
      <div className="document-preview live-preview">
        <iframe src={document.fileUrl} title={document.title} />
      </div>
    );
  }

  if (document.fileType === "txt" && document.fileText) {
    return (
      <div className="document-preview live-preview">
        <pre>{document.fileText}</pre>
      </div>
    );
  }

  if (document.fileType === "xlsx") {
    return (
      <div className="document-preview">
        <div className="sheet-preview">
          <FileSpreadsheet size={34} />
          <b>{document.title}</b>
          <span>{document.size ?? "Демо-таблица"}</span>
          <div>
            {Array.from({ length: 24 }).map((_, index) => <i key={index} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="document-preview">
      <div className="preview-page">
        <p>{document.title}</p>
        <h3>{document.fileUrl ? "Файл загружен в демо" : "Демонстрационный просмотр документа"}</h3>
        <span>
          В рабочей версии здесь будет отображаться PDF/DOCX/XLSX-превью, история передачи по контейнеру связи, комментарии и решения валидации.
        </span>
        <div className="preview-lines">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
    </div>
  );
}
