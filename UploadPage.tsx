import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Eye,
  FileText,
  Film,
  Lock,
  Search,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { DocumentCategory, EvidenceDocumentItem } from '../types/evidenceos';

interface CategoryGroup {
  section: string;
  title: string;
  category: DocumentCategory;
  subcategories: string[];
}

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    section: 'Section A',
    title: 'Business Identity Documents',
    category: 'identity',
    subcategories: ['PAN', 'GST registration', 'Udyam registration'],
  },
  {
    section: 'Section B',
    title: 'Bank Documents',
    category: 'bank',
    subcategories: ['Bank statements', 'Account transaction history', 'Payment records'],
  },
  {
    section: 'Section C',
    title: 'Financial Statements',
    category: 'financial_statement',
    subcategories: [
      'Profit and loss statements',
      'Balance sheets',
      'Cash-flow statements',
      'Financial reports',
    ],
  },
  {
    section: 'Section D',
    title: 'Loan Details',
    category: 'loan',
    subcategories: [
      'Existing loan details',
      'Outstanding balances',
      'Repayment schedules',
      'EMI information',
    ],
  },
  {
    section: 'Section E',
    title: 'Business Transaction Evidence',
    category: 'transaction_evidence',
    subcategories: [
      'Handwritten ledgers',
      'Printed invoices',
      'Receipts',
      'Purchase bills',
      'Sales records',
    ],
  },
  {
    section: 'Section F',
    title: 'Communication & Video Evidence',
    category: 'communication',
    subcategories: [
      'WhatsApp text messages',
      'WhatsApp images',
      'WhatsApp PDF attachments',
      'Site / Ledger Walkthrough Video (MP4/WebM)',
    ],
  },
];

const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.txt',
  '.csv',
  '.mp4',
  '.webm',
  '.mov',
];
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB

export function UploadPage() {
  const {
    documents,
    activeWorkspace,
    addUploadedDocument,
    openDocumentInVerification,
  } = useWorkspace();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('transaction_evidence');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('Handwritten ledgers');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [processingState, setProcessingState] = useState<
    'idle' | 'uploading' | 'extracting' | 'done' | 'error'
  >('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Queue Table Filters, Sorting, Pagination
  const [tableSearch, setTableSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'uploadDate' | 'fileName' | 'fileSize'>('uploadDate');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const activeCategoryGroup = useMemo(
    () => CATEGORY_GROUPS.find((g) => g.category === selectedCategory) || CATEGORY_GROUPS[0],
    [selectedCategory]
  );

  const handleFileSelection = (file: File | null) => {
    setValidationError(null);
    setStatusMessage(null);
    setUploadProgress(0);
    setProcessingState('idle');

    if (!file) {
      setSelectedFile(null);
      setFilePreviewUrl(null);
      return;
    }

    const lowerName = file.name.toLowerCase();
    const extOk = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    if (!extOk) {
      setValidationError(
        `Unsupported format "${file.name}". Allowed: PDF, JPG, JPEG, PNG, WEBP, TXT, CSV, MP4, WEBM.`
      );
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setValidationError(
        `File exceeds 20 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB). Compress or split pages before uploading.`
      );
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith('video/')) {
      setSelectedCategory('communication');
      setSelectedSubcategory('Site / Ledger Walkthrough Video (MP4/WebM)');
    }

    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const fileToDataUrl = (file: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read selected file.'));
      reader.readAsDataURL(file);
    });

  const prepareImageForUpload = async (
    file: File
  ): Promise<{ uploadFile: File; dataUrl: string }> => {
    const rawDataUrl = await fileToDataUrl(file);
    // Keep small non-HEIC images intact if already compact
    if (file.size <= 650 * 1024 && (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp')) {
      return { uploadFile: file, dataUrl: rawDataUrl };
    }
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Unable to decode image'));
        el.src = rawDataUrl;
      });
      const maxDim = 1600;
      const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
      const targetW = Math.max(1, Math.round(img.width * scale));
      const targetH = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return { uploadFile: file, dataUrl: rawDataUrl };
      ctx.drawImage(img, 0, 0, targetW, targetH);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85)
      );
      if (!blob) return { uploadFile: file, dataUrl: compressedDataUrl };
      const cleanName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
      const uploadFile = new File([blob], cleanName, { type: 'image/jpeg' });
      return { uploadFile, dataUrl: compressedDataUrl };
    } catch {
      return { uploadFile: file, dataUrl: rawDataUrl };
    }
  };

  const handleUploadAndExtract = async () => {
    if (!selectedFile) return;

    setValidationError(null);
    setProcessingState('uploading');
    setUploadProgress(20);
    setStatusMessage('Preparing file for secure upload...');

    try {
      const effectiveCategory: DocumentCategory = selectedFile.type.startsWith('video/')
        ? 'video_evidence'
        : selectedCategory;

      let fileToSend: File = selectedFile;
      let persistentPreviewUrl: string | undefined = filePreviewUrl || undefined;
      let base64Payload: string | null = null;

      if (selectedFile.type.startsWith('image/')) {
        setStatusMessage('Optimizing image for fast OCR upload...');
        const prepared = await prepareImageForUpload(selectedFile);
        fileToSend = prepared.uploadFile;
        persistentPreviewUrl = prepared.dataUrl;
        base64Payload = prepared.dataUrl;
      }

      setUploadProgress(45);
      setStatusMessage('Uploading document to server workspace...');

      const formData = new FormData();
      formData.append('file', fileToSend);
      formData.append('category', effectiveCategory);
      formData.append('subcategory', selectedSubcategory);
      formData.append('businessId', activeWorkspace.id);

      let responseData: any = null;
      let multipartNetworkError: unknown = null;

      try {
        setProcessingState('extracting');
        setUploadProgress(75);
        setStatusMessage(
          selectedFile.type.startsWith('video/')
            ? 'Analyzing video frames & audio evidence with Gemini...'
            : 'Running Gemini multimodal OCR & authenticity inspection...'
        );
        const res = await fetch('/api/v1/documents/upload', {
          method: 'POST',
          body: formData,
        });
        const text = await res.text();
        let parsed: any = null;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = null;
        }
        if (!res.ok) {
          throw new Error(parsed?.error || `Upload failed with HTTP ${res.status}`);
        }
        responseData = parsed;
      } catch (err) {
        // Fallback to JSON base64 endpoint if multipart stream was interrupted by proxy
        const isNetworkFail =
          err instanceof TypeError ||
          (err instanceof Error && /network|failed to fetch|load failed/i.test(err.message));
        if (!isNetworkFail || fileToSend.size > 12 * 1024 * 1024) {
          throw err;
        }
        multipartNetworkError = err;
      }

      if (!responseData && multipartNetworkError) {
        setStatusMessage('Retrying upload via resilient JSON transfer...');
        const dataUrl = base64Payload || (await fileToDataUrl(fileToSend));
        const res = await fetch('/api/v1/documents/upload-base64', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: fileToSend.name,
            mimeType: fileToSend.type || 'application/octet-stream',
            category: effectiveCategory,
            fileBase64: dataUrl,
          }),
        });
        const text = await res.text();
        let parsed: any = null;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = null;
        }
        if (!res.ok) {
          throw new Error(parsed?.error || `Upload failed with HTTP ${res.status}`);
        }
        responseData = parsed;
      }

      if (!responseData) {
        throw new Error('Empty response received from server during document upload.');
      }

      const uploadedDoc: EvidenceDocumentItem = {
        id: responseData.documentId || `DOC-${Date.now().toString(36).toUpperCase()}`,
        businessId: activeWorkspace.id,
        fileName: selectedFile.name,
        category: effectiveCategory,
        subcategory: selectedSubcategory,
        uploadDate: new Date().toISOString(),
        fileSize: selectedFile.size,
        mimeType: selectedFile.type || 'application/octet-stream',
        uploadStatus: 'uploaded',
        ocrStatus: responseData.ocrStatus || 'completed',
        verificationStatus: responseData.verificationStatus || 'Extracted',
        language: responseData.language || 'English',
        pageCount: responseData.pageCount || 1,
        sha256Short: responseData.sha256Short || 'local-upload',
        extractedSummary:
          responseData.summary ||
          'Document uploaded and processed by EvidenceOS multimodal extraction pipeline.',
        previewText:
          responseData.extractedText ||
          responseData.summary ||
          'Extracted content available in verification inspector.',
        previewDataUrl: persistentPreviewUrl,
        isDemo: false,
        records: Array.isArray(responseData.records) ? responseData.records : [],
        completenessChecks: Array.isArray(responseData.completenessChecks)
          ? responseData.completenessChecks
          : [
              {
                field: 'Financial Document Detected',
                required: true,
                present: responseData.isFinancialDocument !== false,
                valuePreview:
                  responseData.isFinancialDocument === false
                    ? 'Non-financial image / no records'
                    : responseData.ocrStatus || 'Extracted',
              },
            ],
        internalConsistencyNotes: Array.isArray(responseData.consistencyNotes)
          ? responseData.consistencyNotes
          : ['Extracted via server-side Gemini API. Inspect fields before credit modeling.'],
        authenticityReport: responseData.authenticityReport || undefined,
      };

      await addUploadedDocument(uploadedDoc);
      setProcessingState('done');
      setStatusMessage(
        responseData.isFinancialDocument === false
          ? `Inspected ${uploadedDoc.fileName}: No financial document detected (0 records extracted).`
          : `Uploaded and extracted ${uploadedDoc.fileName} (${uploadedDoc.records.length} structured record(s)).`
      );
      setSelectedFile(null);
      setFilePreviewUrl(null);
      setUploadProgress(100);
    } catch (err) {
      setProcessingState('error');
      setValidationError(err instanceof Error ? err.message : 'Failed to upload document.');
      setStatusMessage(null);
    }
  };

  // Filtered, sorted, paginated queue
  const filteredQueue = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    const list = documents.filter((d) => {
      if (categoryFilter !== 'all' && d.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && d.verificationStatus !== statusFilter) return false;
      if (q) {
        return (
          d.fileName.toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q) ||
          d.subcategory.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'fileName') cmp = a.fileName.localeCompare(b.fileName);
      else if (sortField === 'fileSize') cmp = a.fileSize - b.fileSize;
      else cmp = a.uploadDate.localeCompare(b.uploadDate);
      return sortAsc ? cmp : -cmp;
    });
  }, [documents, tableSearch, categoryFilter, statusFilter, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredQueue.length / pageSize));
  const paginatedDocs = filteredQueue.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc((v) => !v);
    else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="p-5 max-w-[1400px] mx-auto space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#17231E]">Document Upload</h2>
          <p className="text-sm text-[#64746B] mt-0.5">
            Bring all your business financial evidence into one secure workspace.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#64746B] bg-white border border-[#DCE7DF] rounded-lg px-3 py-2">
          <Lock className="w-3.5 h-3.5 text-[#176B45] shrink-0" />
          <span>
            Sensitive PAN, bank & financial files are isolated in private storage and redacted from logs.
          </span>
        </div>
      </div>

      {/* Category Matrix + Upload Dropzone */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 5 cols: All 6 Supported Document Categories */}
        <div className="lg:col-span-5 bg-white border border-[#DCE7DF] rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold text-[#17231E]">
            1. Select Document Category & Evidence Type
          </div>

          <div className="space-y-2">
            {CATEGORY_GROUPS.map((group) => {
              const isActive = selectedCategory === group.category;
              return (
                <div
                  key={group.section}
                  className={`rounded-lg border p-3 transition-colors ${
                    isActive
                      ? 'border-[#176B45] bg-[#F0F5F1]'
                      : 'border-[#DCE7DF] bg-white hover:bg-[#F7FAF8]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory(group.category);
                      setSelectedSubcategory(group.subcategories[0]);
                    }}
                    className="w-full text-left flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-mono-num text-[11px] font-semibold text-[#176B45]">
                        {group.section}
                      </span>
                      <div className="text-[13px] font-semibold text-[#17231E]">{group.title}</div>
                    </div>
                  </button>

                  {isActive && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 pt-2 border-t border-[#DCE7DF]">
                      {group.subcategories.map((sub) => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setSelectedSubcategory(sub)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                            selectedSubcategory === sub
                              ? 'bg-[#176B45] text-white'
                              : 'bg-white border border-[#DCE7DF] text-[#17231E] hover:border-[#176B45]'
                          }`}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 7 cols: Drag-and-Drop Ingestion & Live Preview */}
        <div className="lg:col-span-7 bg-white border border-[#DCE7DF] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-[#17231E]">
              2. Upload File for{' '}
              <span className="text-[#176B45]">
                {activeCategoryGroup.title} · {selectedSubcategory}
              </span>
            </div>
            <span className="text-[11px] text-[#64746B] font-mono-num">
              PDF · JPG · PNG · WEBP · TXT · MP4 (Max 20 MB)
            </span>
          </div>

          {/* Drag-and-Drop Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const file = e.dataTransfer.files?.[0] || null;
              handleFileSelection(file);
            }}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive
                ? 'border-[#176B45] bg-[#DDEFE3]/40'
                : 'border-[#DCE7DF] bg-[#F7FAF8] hover:border-[#176B45]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_EXTENSIONS.join(',')}
              onChange={(e) => handleFileSelection(e.target.files?.[0] || null)}
              className="hidden"
            />
            <UploadCloud className="w-9 h-9 text-[#176B45] mx-auto mb-2.5" />
            <div className="text-sm font-semibold text-[#17231E]">
              Drag and drop financial evidence here
            </div>
            <p className="text-xs text-[#64746B] mt-1 max-w-md mx-auto">
              Supports handwritten ledgers (English, Tamil, Hindi), printed invoices, bank statement
              PDFs, WhatsApp exports, and site/ledger walkthrough videos.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 px-4 py-2 rounded-lg bg-white border border-[#DCE7DF] hover:border-[#176B45] text-xs font-semibold text-[#17231E] transition-colors"
            >
              Browse files
            </button>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#DC4545]/30 flex items-start gap-2 text-xs text-[#DC4545]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Selected File Preview & Upload Controls */}
          {selectedFile && (
            <div className="border border-[#DCE7DF] rounded-xl p-4 bg-[#FAFDFB] space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#DDEFE3] text-[#176B45] flex items-center justify-center shrink-0">
                    {selectedFile.type.startsWith('video/') ? (
                      <Film className="w-5 h-5" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#17231E] truncate">
                      {selectedFile.name}
                    </div>
                    <div className="text-xs text-[#64746B] font-mono-num mt-0.5">
                      {(selectedFile.size / 1024).toFixed(1)} KB · {selectedFile.type || 'document'} ·{' '}
                      {selectedSubcategory}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleFileSelection(null)}
                  disabled={processingState === 'uploading' || processingState === 'extracting'}
                  className="p-1.5 text-[#64746B] hover:text-[#DC4545] rounded-lg transition-colors"
                  title="Remove selected file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {filePreviewUrl && selectedFile.type.startsWith('image/') && (
                <img
                  src={filePreviewUrl}
                  alt={`Preview of ${selectedFile.name}`}
                  className="max-h-48 rounded-lg border border-[#DCE7DF] object-contain bg-white"
                />
              )}

              {filePreviewUrl && selectedFile.type.startsWith('video/') && (
                <video
                  src={filePreviewUrl}
                  controls
                  className="max-h-48 rounded-lg border border-[#DCE7DF] bg-black"
                />
              )}

              {/* Actual XHR Progress Bar (shown only during active upload/extraction) */}
              {(processingState === 'uploading' || processingState === 'extracting') && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#104B32] font-medium">{statusMessage}</span>
                    <span className="font-mono-num font-semibold text-[#176B45]">
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#DCE7DF] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#176B45] transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleFileSelection(null)}
                  disabled={processingState === 'uploading' || processingState === 'extracting'}
                  className="px-3.5 py-2 text-xs font-medium text-[#64746B] hover:text-[#17231E]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUploadAndExtract}
                  disabled={processingState === 'uploading' || processingState === 'extracting'}
                  className="px-4 py-2 rounded-lg bg-[#176B45] hover:bg-[#104B32] disabled:opacity-60 text-white text-xs font-semibold transition-colors"
                >
                  {processingState === 'uploading'
                    ? 'Uploading...'
                    : processingState === 'extracting'
                      ? 'Extracting with Gemini...'
                      : 'Upload & Run Gemini Extraction'}
                </button>
              </div>
            </div>
          )}

          {processingState === 'done' && statusMessage && (
            <div className="p-3 rounded-lg bg-[#DDEFE3]/60 border border-[#248451]/30 flex items-center justify-between gap-2 text-xs text-[#104B32]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#248451] shrink-0" />
                <span>{statusMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => openDocumentInVerification(documents[0]?.id || 'DOC001')}
                className="font-semibold underline shrink-0"
              >
                Inspect extracted records
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Upload Queue Table */}
      <section className="bg-white border border-[#DCE7DF] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#DCE7DF] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-semibold text-sm text-[#17231E]">
              Evidence Upload Queue ({filteredQueue.length})
            </h3>
            <p className="text-xs text-[#64746B] mt-0.5">
              Synthetic Kaveri Textiles demonstration evidence plus your uploaded files.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#64746B] absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => {
                  setTableSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search file or ID..."
                className="h-8 pl-8 pr-3 text-xs bg-[#F7FAF8] border border-[#DCE7DF] rounded-lg focus:outline-none focus:border-[#176B45]"
              />
            </div>

            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 px-2.5 text-xs bg-[#F7FAF8] border border-[#DCE7DF] rounded-lg"
            >
              <option value="all">All categories</option>
              <option value="identity">Business Identity</option>
              <option value="bank">Bank Documents</option>
              <option value="financial_statement">Financial Statements</option>
              <option value="loan">Loan Details</option>
              <option value="transaction_evidence">Transaction Evidence</option>
              <option value="communication">Communication</option>
              <option value="video_evidence">Video Evidence</option>
            </select>

            <select
              aria-label="Filter by verification status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 px-2.5 text-xs bg-[#F7FAF8] border border-[#DCE7DF] rounded-lg"
            >
              <option value="all">All verification states</option>
              <option value="Complete">Complete</option>
              <option value="Extracted">Extracted</option>
              <option value="Inconsistent">Inconsistent</option>
              <option value="Missing Information">Missing Information</option>
              <option value="Requires Manual Review">Requires Manual Review</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F7FAF8] border-b border-[#DCE7DF] text-[#64746B]">
                <th className="py-2.5 px-4 font-semibold">
                  <button
                    type="button"
                    onClick={() => toggleSort('fileName')}
                    className="inline-flex items-center gap-1 hover:text-[#17231E]"
                  >
                    File Name <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 font-semibold">Category</th>
                <th className="py-2.5 px-3 font-semibold">
                  <button
                    type="button"
                    onClick={() => toggleSort('uploadDate')}
                    className="inline-flex items-center gap-1 hover:text-[#17231E]"
                  >
                    Upload Date <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 font-semibold text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort('fileSize')}
                    className="inline-flex items-center gap-1 hover:text-[#17231E]"
                  >
                    Size <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 font-semibold">Upload</th>
                <th className="py-2.5 px-3 font-semibold">OCR</th>
                <th className="py-2.5 px-3 font-semibold">Verification</th>
                <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE7DF]">
              {paginatedDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-[#F7FAF8] transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-medium text-[#17231E]">{doc.fileName}</div>
                    <div className="text-[11px] text-[#64746B] font-mono-num">
                      {doc.id} {doc.isDemo ? '· DEMO' : '· LIVE UPLOAD'}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-[#17231E]">{doc.subcategory}</td>
                  <td className="py-3 px-3 font-mono-num text-[#64746B]">
                    {doc.uploadDate.slice(0, 10)}
                  </td>
                  <td className="py-3 px-3 font-mono-num text-right text-[#64746B]">
                    {(doc.fileSize / 1024).toFixed(0)} KB
                  </td>
                  <td className="py-3 px-3 capitalize text-[#248451] font-medium">
                    {doc.uploadStatus}
                  </td>
                  <td className="py-3 px-3 capitalize text-[#17231E]">{doc.ocrStatus}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`font-semibold ${
                        doc.verificationStatus === 'Complete' || doc.verificationStatus === 'Extracted'
                          ? 'text-[#248451]'
                          : doc.verificationStatus === 'Inconsistent' ||
                              doc.verificationStatus === 'Unreadable'
                            ? 'text-[#DC4545]'
                            : 'text-[#D99124]'
                      }`}
                    >
                      {doc.verificationStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => openDocumentInVerification(doc.id)}
                      className="inline-flex items-center gap-1 font-semibold text-[#176B45] hover:text-[#104B32]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Verify</span>
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedDocs.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#64746B]">
                    No documents match your current search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-2.5 border-t border-[#DCE7DF] flex items-center justify-between text-xs text-[#64746B]">
          <span>
            Showing {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, filteredQueue.length)} of {filteredQueue.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded border border-[#DCE7DF] disabled:opacity-40 hover:bg-[#F0F5F1] text-[#17231E]"
            >
              Previous
            </button>
            <span className="font-mono-num px-2">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded border border-[#DCE7DF] disabled:opacity-40 hover:bg-[#F0F5F1] text-[#17231E]"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
