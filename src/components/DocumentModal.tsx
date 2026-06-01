import { ExternalLink, FileSpreadsheet, FileText, FolderOpen, X } from "lucide-react";
import { getFileLabel, getFileTypeColor } from "../lib/graph";
import type { ProjectNode, StatusLabels } from "../types";

type DocumentModalProps = {
  node: ProjectNode | null;
  statusLabels: StatusLabels;
  onShowInFolder: (node: ProjectNode) => void;
  onClose: () => void;
};

export function DocumentModal({ node, statusLabels, onShowInFolder, onClose }: DocumentModalProps) {
  if (!node) {
    return null;
  }
  const accentColor = getFileTypeColor(node.fileType);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <article className="document-modal glass-panel">
        <header>
          <div>
            <span style={accentColor ? { color: accentColor } : undefined}>
              <FileText size={18} />
              {getFileLabel(node.fileType)}
            </span>
            <h2>{node.title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть просмотр">
            <X size={20} />
          </button>
        </header>

        <DocumentPreview node={node} />

        <footer>
          <span>{node.version}</span>
          <span>{node.status ? statusLabels[node.status] : "Без статуса"}</span>
          <span>{node.updatedAt}</span>
          <button onClick={() => node.fileUrl ? window.open(node.fileUrl, "_blank", "noopener,noreferrer") : undefined}>
            Открыть документ
            <ExternalLink size={17} />
          </button>
          <button onClick={() => onShowInFolder(node)}>
            Показать в папке
            <FolderOpen size={17} />
          </button>
        </footer>
      </article>
    </div>
  );
}

function DocumentPreview({ node }: { node: ProjectNode }) {
  if (node.fileType === "pdf" && node.fileUrl) {
    return (
      <div className="document-preview live-preview">
        <iframe src={node.fileUrl} title={node.title} />
      </div>
    );
  }

  if (node.fileType === "txt" && node.fileText) {
    return (
      <div className="document-preview live-preview">
        <pre>{node.fileText}</pre>
      </div>
    );
  }

  if (node.fileType === "xlsx") {
    return (
      <div className="document-preview">
        <div className="sheet-preview">
          <FileSpreadsheet size={34} />
          <b>{node.title}</b>
          <span>{node.fileSize ?? "Демо-таблица"}</span>
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
        <p>{node.title}</p>
        <h3>{node.fileUrl ? "Файл загружен в демо" : "Демонстрационный просмотр документа"}</h3>
        <span>
          {node.fileUrl
            ? "Документ доступен по кнопке открытия. PDF и TXT показываются прямо здесь, DOC/DOCX и Excel открываются отдельным просмотром браузера или системного приложения."
            : "В полноценной версии здесь будет отображаться PDF/DOCX-превью, история версий, комментарии и согласования."}
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
