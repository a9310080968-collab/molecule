import { ExternalLink, FileSpreadsheet, FileText, FolderOpen, X } from "lucide-react";
import { getFileLabel, getFileTypeColor } from "../lib/graph";
import { nodeStatusLabels } from "../data/mockProject";
import type { ProcessDocument } from "../types";
import { useI18n } from "../lib/i18n";

type DocumentModalProps = {
  document: ProcessDocument | null;
  onShowInFolder: (document: ProcessDocument) => void;
  onClose: () => void;
};

export function DocumentModal({ document, onShowInFolder, onClose }: DocumentModalProps) {
  const { t, system } = useI18n();
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
              {t(getFileLabel(document.fileType))}
            </span>
            <h2>{document.title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={t("Закрыть просмотр")}>
            <X size={20} />
          </button>
        </header>

        <DocumentPreview document={document} />

        <footer>
          <span>{document.version}</span>
          <span>{t(nodeStatusLabels[document.status])}</span>
          <span>{system(document.updatedAt)}</span>
          <button disabled={!document.fileUrl} onClick={() => document.fileUrl ? window.open(document.fileUrl, "_blank", "noopener,noreferrer") : undefined}>
            {t("Открыть документ")}
            <ExternalLink size={17} />
          </button>
          <button onClick={() => onShowInFolder(document)}>
            {t("Показать в папке")}
            <FolderOpen size={17} />
          </button>
        </footer>
      </article>
    </div>
  );
}

function DocumentPreview({ document }: { document: ProcessDocument }) {
  const { t, system } = useI18n();
  if (document.fileType === "pdf" && document.fileUrl) {
    return (
      <div className="document-preview live-preview">
        <iframe src={document.fileUrl} title={document.title} />
      </div>
    );
  }

  if (document.fileType === "xlsx" && document.previewRows?.length) {
    return (
      <div className="document-preview">
        <div className="sheet-preview real-sheet-preview">
          <FileSpreadsheet size={28} />
          <b>{document.title}</b>
          <span>{document.size ? system(document.size) : t("Демо-таблица")}</span>
          <table>
            <tbody>
              {document.previewRows.map((row, rowIndex) => (
                <tr key={`${rowIndex}-${row.join("-")}`}>
                  {row.map((cell, cellIndex) => rowIndex === 0 ? <th key={`${cellIndex}-${cell}`}>{cell}</th> : <td key={`${cellIndex}-${cell}`}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (document.fileType === "docx" && document.previewText) {
    const paragraphs = document.previewText.split(/\n+/).filter(Boolean);
    return (
      <div className="document-preview">
        <div className="preview-page docx-preview-page">
          <p>{document.title}</p>
          <h3>{paragraphs[0] ?? t("Документ")}</h3>
          {paragraphs.slice(1).map((paragraph) => (
            <span key={paragraph}>{paragraph}</span>
          ))}
        </div>
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
          <span>{document.size ? system(document.size) : t("Демо-таблица")}</span>
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
        <h3>{document.previewText ? document.previewText.split("\n")[0] : document.fileUrl ? t("Файл загружен в демо") : t("Демонстрационный просмотр документа")}</h3>
        <span>
          {document.previewText ?? t("В рабочей версии здесь будет отображаться PDF/DOCX/XLSX-превью, история передачи по контейнеру связи, комментарии и решения валидации.")}
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
