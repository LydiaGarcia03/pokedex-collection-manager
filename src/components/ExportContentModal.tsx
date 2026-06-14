import { CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ExportContentModalProps {
    content: string;
    onClose: () => void;
}

export function ExportContentModal({ content, onClose }: ExportContentModalProps) {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) return;
        const id = window.setTimeout(() => setCopied(false), 3000);
        return () => window.clearTimeout(id);
    }, [copied]);

    function handleCopy() {
        navigator.clipboard.writeText(content).then(() => setCopied(true));
    }

    function handleDownload() {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pokemon-collection-${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="collection-modal-backdrop" role="presentation" onClick={onClose}>
            <div
                className="collection-modal collection-modal--wide"
                role="dialog"
                aria-modal="true"
                aria-label="Export Collection"
                onClick={e => e.stopPropagation()}
            >
                <h2 className="collection-modal__title">Export Collection</h2>

                <textarea
                    className="collection-modal__textarea"
                    value={content}
                    readOnly
                    aria-label="Conteúdo da coleção"
                />

                <div className="collection-modal__actions">
                    <button type="button" className="collection-modal__btn-secondary" onClick={onClose}>
                        Fechar
                    </button>
                    <button type="button" className="collection-modal__btn-primary" onClick={handleCopy}>
                        Copy Collection
                    </button>
                    <button type="button" className="collection-modal__btn-primary" onClick={handleDownload}>
                        Download Collection
                    </button>
                </div>

                {copied && (
                    <div className="collection-modal__feedback collection-modal__feedback--success">
                        <CheckCircle size={15} />
                        <span>Collection copied successfully</span>
                    </div>
                )}
            </div>
        </div>
    );
}
