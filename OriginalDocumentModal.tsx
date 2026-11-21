import React, { useState } from 'react';
import {
  Download,
  FileText,
  Image as ImageIcon,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { EvidenceDocumentItem } from '../../types/evidenceos';

interface OriginalDocumentModalProps {
  document: EvidenceDocumentItem | null;
  onClose: () => void;
}

export function isImagePreviewUrl(url?: string, mimeType?: string): boolean {
  if (!url) return false;
  if (url.startsWith('data:image/')) return true;
  if (/\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(url)) return true;
  if (url.startsWith('blob:') && mimeType?.startsWith('image/')) return true;
  return false;
}

export function isPdfPreviewUrl(url?: string, mimeType?: string): boolean {
  if (!url) return false;
  if (url.startsWith('data:application/pdf')) return true;
  if (url.startsWith('blob:') && mimeType === 'application/pdf') return true;
  if (/\.pdf(\?.*)?$/i.test(url)) return true;
  return false;
}

export function isVideoPreviewUrl(url?: string, mimeType?: string): boolean {
  if (!url) return false;
  if (url.startsWith('data:video/')) return true;
  if (url.startsWith('blob:') && mimeType?.startsWith('video/')) return true;
  if (/\.(mp4|webm|mov)(\?.*)?$/i.test(url)) return true;
  return false;
}

export function OriginalDocumentModal({ document: doc, onClose }: OriginalDocumentModalProps) {
  const [viewTab, setViewTab] = useState<'original' | 'ocr'>('original');
  const [zoom, setZoom] = useState<number>(100);

  if (!doc) return null;

  const sourceUrl = doc.originalFileUrl || doc.previewDataUrl;
  const showImage = isImagePreviewUrl(sourceUrl, doc.mimeType);
  const showPdf = !showImage && isPdfPreviewUrl(sourceUrl, doc.mimeType);
  const showVideo = !showImage && !showPdf && isVideoPreviewUrl(sourceUrl, doc.mimeType);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#17231E]/70 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#DCE7DF] rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-[#DCE7DF] bg-[#F7FAF8] flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-[#64746B] font-mono-num">
              <span className="font-semibold text-[#176B45]">{doc.id}</span>
              <span>·</span>
              <span>{doc.subcategory}</span>
              <span>·</span>
              <span>{doc.isDemo ? 'Synthetic Demo Proof' : 'Original Submitted File'}</span>
            </div>
            <h3 className="font-display font-bold text-sm text-[#17231E] truncate mt-0.5">
              {doc.fileName}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center p-0.5 bg-[#F0F5F1] border border-[#DCE7DF] rounded-lg">
              <button
                type="button"
                onClick={() => setViewTab('original')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1 transition-colors ${
                  viewTab === 'original'
                    ? 'bg-white text-[#104B32] font-semibold shadow-xs'
                    : 'text-[#64746B] hover:text-[#17231E]'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Original Proof</span>
              </button>
              <button
                type="button"
                onClick={() => setViewTab('ocr')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1 transition-colors ${
                  viewTab === 'ocr'
                    ? 'bg-white text-[#104B32] font-semibold shadow-xs'
                    : 'text-[#64746B] hover:text-[#17231E]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Extracted OCR Text</span>
              </button>
            </div>

            {viewTab === 'original' && showImage && (
              <div className="inline-flex items-center border border-[#DCE7DF] rounded-lg bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(60, z - 20))}
                  className="h-8 w-8 flex items-center justify-center text-[#17231E] hover:bg-[#F0F5F1] border-r border-[#DCE7DF]"
                  title="Zoom out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 text-[11px] font-mono-num text-[#17231E]">{zoom}%</span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(220, z + 20))}
                  className="h-8 w-8 flex items-center justify-center text-[#17231E] hover:bg-[#F0F5F1] border-l border-[#DCE7DF]"
                  title="Zoom in"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {sourceUrl && (
              <a
                href={sourceUrl}
                download={doc.fileName}
                className="h-8 px-3 rounded-lg border border-[#DCE7DF] bg-white hover:bg-[#F0F5F1] text-xs font-semibold text-[#17231E] inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[#176B45]" />
                <span>Download</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#64746B] hover:text-[#17231E] hover:bg-[#F0F5F1]"
              aria-label="Close document preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-auto bg-[#F0F5F1] p-5 flex items-start justify-center min-h-[420px]">
          {viewTab === 'original' ? (
            showImage && sourceUrl ? (
              <div className="w-full flex justify-center">
                <img
                  src={sourceUrl}
                  alt={`Original proof for ${doc.fileName}`}
                  style={{ width: `${zoom}%`, maxWidth: zoom <= 100 ? '680px' : 'none' }}
                  className="rounded-lg border border-[#DCE7DF] bg-white shadow-sm object-contain transition-[width] duration-150"
                />
              </div>
            ) : showPdf && sourceUrl ? (
              <iframe
                src={sourceUrl}
                title={`Original PDF preview: ${doc.fileName}`}
                className="w-full h-[68vh] rounded-lg border border-[#DCE7DF] bg-white"
              />
            ) : showVideo && sourceUrl ? (
              <video
                src={sourceUrl}
                controls
                className="w-full max-h-[68vh] rounded-lg border border-[#DCE7DF] bg-black"
              />
            ) : (
              <div className="w-full max-w-3xl bg-white border border-[#DCE7DF] rounded-lg p-5 font-mono text-xs leading-relaxed text-[#17231E] whitespace-pre-wrap">
                {doc.originalRawText || doc.previewText}
              </div>
            )
          ) : (
            <div className="w-full max-w-3xl bg-white border border-[#DCE7DF] rounded-lg p-5 space-y-3">
              <div className="text-xs font-semibold text-[#104B32]">
                Extracted Text & Summary ({doc.ocrStatus})
              </div>
              <p className="text-xs text-[#64746B] leading-relaxed">{doc.extractedSummary}</p>
              <div className="p-4 rounded-lg bg-[#FAFDFB] border border-[#DCE7DF] font-mono text-xs leading-relaxed text-[#17231E] whitespace-pre-wrap">
                {doc.previewText}
              </div>
            </div>
          )}
        </div>

        {/* Footer Metadata */}
        <div className="px-4 py-2.5 border-t border-[#DCE7DF] bg-white flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64746B] font-mono-num">
          <span>
            SHA-256: {doc.sha256Short} · Size: {(doc.fileSize / 1024).toFixed(0)} KB · Pages:{' '}
            {doc.pageCount}
          </span>
          <span>
            {doc.isDemo
              ? 'Synthetic demonstration document proof (Kaveri Textiles)'
              : 'Original submitted file stored in active workspace session'}
          </span>
        </div>
      </div>
    </div>
  );
}
