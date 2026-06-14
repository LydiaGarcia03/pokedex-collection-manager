import { AlertCircle, CheckCircle } from 'lucide-react';
import { useRef, useState } from 'react';

interface ImportResult {
    pokemonCount: number;
    gameCount: number;
    cardCount: number;
    invalidLines: string[];
}

interface ImportCollectionModalProps {
    onClose: () => void;
    onImport: (content: string) => ImportResult | null;
}

export function ImportCollectionModal({ onClose, onImport }: ImportCollectionModalProps) {
    const [text, setText] = useState('');
    const [fileName, setFileName] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ ok: true; result: ImportResult } | { ok: false } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const hasText = text.trim().length > 0;
    const hasFile = fileContent !== null;
    const canImport = hasText || hasFile;

    function handleTextChange(value: string) {
        setText(value);
        setFeedback(null);
        if (value.trim() && hasFile) {
            setFileName(null);
            setFileContent(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const content = await file.text();
        setFileContent(content);
        setFileName(file.name);
        setText('');
        setFeedback(null);
    }

    function handleRemoveFile() {
        setFileName(null);
        setFileContent(null);
        setFeedback(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    function handleImport() {
        const content = fileContent ?? text;
        if (!content.trim()) return;
        const result = onImport(content);
        setFeedback(result ? { ok: true, result } : { ok: false });
    }

    return (
        <div className="collection-modal-backdrop" role="presentation" onClick={onClose}>
            <div
                className="collection-modal collection-modal--import"
                role="dialog"
                aria-modal="true"
                aria-label="Import Collection"
                onClick={e => e.stopPropagation()}
            >
                <h2 className="collection-modal__title">Import Collection</h2>

                <div className="import-modal__body">
                    <div className="import-modal__side">
                        <span className="import-modal__side-label">Colar texto</span>
                        <textarea
                            className="collection-modal__textarea"
                            placeholder="Cole aqui o texto da coleção..."
                            value={text}
                            onChange={e => handleTextChange(e.target.value)}
                            disabled={hasFile}
                            aria-label="Texto da coleção"
                        />
                    </div>

                    <div className="import-modal__or">ou</div>

                    <div className="import-modal__side">
                        <span className="import-modal__side-label">Anexar arquivo</span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".txt,text/plain"
                            className="collection-import-input"
                            onChange={handleFileChange}
                            disabled={hasText}
                        />
                        <button
                            type="button"
                            className={`import-file-zone${hasText ? ' import-file-zone--disabled' : ''}`}
                            onClick={() => !hasText && fileInputRef.current?.click()}
                            tabIndex={hasText ? -1 : 0}
                        >
                            {fileName ? (
                                <span className="import-file-zone__name">{fileName}</span>
                            ) : (
                                <span className="import-file-zone__prompt">
                                    Clique para selecionar um arquivo .txt
                                </span>
                            )}
                        </button>
                        {hasFile && (
                            <button
                                type="button"
                                className="import-file-remove"
                                onClick={handleRemoveFile}
                            >
                                Remover arquivo
                            </button>
                        )}
                    </div>
                </div>

                <div className="collection-modal__actions">
                    <button type="button" className="collection-modal__btn-secondary" onClick={onClose}>
                        Fechar
                    </button>
                    <button
                        type="button"
                        className="collection-modal__btn-primary"
                        onClick={handleImport}
                        disabled={!canImport}
                    >
                        Import Collection
                    </button>
                </div>

                {feedback && (
                    feedback.ok ? (
                        <div className="collection-modal__feedback collection-modal__feedback--success">
                            <CheckCircle size={15} />
                            <span>
                                Importação concluída — {feedback.result.pokemonCount} Pokémon
                                {feedback.result.gameCount > 0 && `, ${feedback.result.gameCount} jogos`}
                                {feedback.result.cardCount > 0 && `, ${feedback.result.cardCount} cartas`}
                                {feedback.result.invalidLines.length > 0 && ` · ${feedback.result.invalidLines.length} linha(s) ignorada(s)`}
                            </span>
                        </div>
                    ) : (
                        <div className="collection-modal__feedback collection-modal__feedback--error">
                            <AlertCircle size={15} />
                            <span>Formato inválido. Verifique o arquivo e tente novamente.</span>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
