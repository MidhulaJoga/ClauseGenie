// AI Legal Document Analyzer - Main Application with Theme Support and Custom Format
class LegalDocumentAnalyzer {
    constructor() {
        this.uploadedFiles = [];
        this.selectedFormat = null;
        this.customFormat = null;
        this.customStyleTemplate = null;
        this.processingSteps = [
            { id: 'step-upload', name: 'Document Upload', completed: false },
            { id: 'step-extraction', name: 'Text Extraction', completed: false },
            { id: 'step-nltk', name: 'NLP Processing', completed: false },
            { id: 'step-huggingface', name: 'AI Analysis', completed: false },
            { id: 'step-tensorflow', name: 'ML Classification', completed: false },
            { id: 'step-completion', name: 'Analysis Complete', completed: false }
        ];
        this.analysisResults = null;
        
        // Theme management
        this.currentTheme = 'light';
        this.themes = {
            light: {
                name: 'Light Theme',
                icon: 'fas fa-sun',
                text: 'Light',
                description: 'Clean and bright interface'
            },
            dark: {
                name: 'Dark Theme',
                icon: 'fas fa-moon',
                text: 'Dark',
                description: 'Dark and elegant interface'
            }
        };
        
        this.init();
    }

    init() {
        this.initializeTheme();
        this.setupEventListeners();
        this.initializeSampleData();
        
        // Show sample modal after a short delay - but don't auto-open
        // User can manually open it
        console.log('AI Legal Document Analyzer initialized');
    }

    // Theme Management Methods
    initializeTheme() {
        // Check system preference first
        const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // Set initial theme based on system preference
        this.currentTheme = systemPrefersDark ? 'dark' : 'light';
        
        // Apply the theme
        this.applyTheme(this.currentTheme);
        
        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                // Only auto-switch if user hasn't manually set a theme
                if (!this.userHasSetTheme) {
                    this.currentTheme = e.matches ? 'dark' : 'light';
                    this.applyTheme(this.currentTheme);
                }
            });
        }
        
        this.userHasSetTheme = false;
    }

    applyTheme(theme) {
        const htmlElement = document.documentElement;
        const themeToggle = document.getElementById('themeToggle');
        const themeIcon = themeToggle?.querySelector('.theme-icon');
        const themeText = themeToggle?.querySelector('.theme-text');
        
        // Apply data attribute for theme
        htmlElement.setAttribute('data-color-scheme', theme);
        
        // Update theme toggle button
        if (themeIcon && themeText) {
            const themeConfig = this.themes[theme];
            themeIcon.className = themeConfig.icon + ' theme-icon';
            themeText.textContent = themeConfig.text;
            
            // Add a subtle animation to the icon
            themeIcon.style.transform = 'scale(0.8)';
            setTimeout(() => {
                themeIcon.style.transform = 'scale(1)';
            }, 150);
        }
        
        // Store current theme
        this.currentTheme = theme;
        
        // Trigger custom event for theme change
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
        
        // Show theme change notification
        if (this.userHasSetTheme) {
            this.showNotification(`Switched to ${this.themes[theme].name}`, 'info');
        }
    }

    toggleTheme() {
        this.userHasSetTheme = true;
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        
        // Add a smooth transition effect to the whole page
        document.body.style.transition = 'all 0.3s ease';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 300);
    }

    setupEventListeners() {
        // Theme toggle event listener
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // File upload events
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const analyzeBtn = document.getElementById('analyzeBtn');
        const downloadBtn = document.getElementById('downloadBtn');
        const newAnalysisBtn = document.getElementById('newAnalysisBtn');

        // Ensure elements exist before adding listeners
        if (uploadArea && fileInput) {
            uploadArea.addEventListener('click', () => fileInput.click());
            uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
            uploadArea.addEventListener('drop', this.handleFileDrop.bind(this));
            fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        }

        // Format selection - use event delegation to ensure it works
        document.addEventListener('click', (e) => {
            const formatOption = e.target.closest('.format-option');
            if (formatOption) {
                this.handleFormatSelection(formatOption);
            }
        });

        // Custom format modal events
        const confirmCustomFormat = document.getElementById('confirmCustomFormat');
        const cancelCustomFormat = document.getElementById('cancelCustomFormat');
        
        if (confirmCustomFormat) {
            confirmCustomFormat.addEventListener('click', this.confirmCustomFormat.bind(this));
        }
        if (cancelCustomFormat) {
            cancelCustomFormat.addEventListener('click', this.cancelCustomFormat.bind(this));
        }

        // Action buttons
        if (analyzeBtn) analyzeBtn.addEventListener('click', this.startAnalysis.bind(this));
        if (downloadBtn) downloadBtn.addEventListener('click', this.downloadResults.bind(this));
        if (newAnalysisBtn) newAnalysisBtn.addEventListener('click', this.resetAnalysis.bind(this));

        // Sample documents - use event delegation
        document.addEventListener('click', (e) => {
            if (e.target.closest('.sample-doc')) {
                this.loadSampleDocument(e);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + T for theme toggle
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                this.toggleTheme();
            }
            // Escape to close modal
            if (e.key === 'Escape') {
                const customModal = document.getElementById('customFormatModal');
                if (customModal && customModal.classList.contains('show')) {
                    const modal = bootstrap.Modal.getInstance(customModal);
                    if (modal) {
                        modal.hide();
                    }
                }
            }
        });
    }

    showCustomFormatModal() {
        const modalElement = document.getElementById('customFormatModal');
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
            
            // Auto-focus the textarea when modal is shown
            modalElement.addEventListener('shown.bs.modal', () => {
                const textarea = document.getElementById('customFormatDescription');
                if (textarea) {
                    textarea.focus();
                }
            }, { once: true });
        }
    }

    confirmCustomFormat() {
        const styleTemplate = document.getElementById('styleTemplate');
        if (!styleTemplate) {
            console.error('Custom style template element not found');
            return;
        }
        
        // Store custom format (no description field anymore)
        this.customFormat = '';
        this.customStyleTemplate = styleTemplate.value;
        
        // Close modal
        const modalElement = document.getElementById('customFormatModal');
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
        }
        
        // Enable analyze button
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
        }
        
        this.showNotification('Custom format saved successfully!', 'success');
    }

    cancelCustomFormat() {
        // Clear form
        const styleTemplate = document.getElementById('styleTemplate');
        if (styleTemplate) styleTemplate.value = '';
        
        // Reset selection
        this.selectedFormat = null;
        this.customFormat = null;
        this.customStyleTemplate = null;
        
        document.querySelectorAll('.format-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
        }
    }

    showSampleModal() {
        const modalElement = document.getElementById('sampleModal');
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        }
    }

    initializeSampleData() {
        this.sampleDocuments = {
            contract: {
                name: "Contract Agreement Template",
                type: "pdf",
                size: "2.4 MB",
                clauses: [
                    "Preamble and Party Identification",
                    "Definitions and Interpretations",
                    "Scope of Work and Deliverables",
                    "Payment Terms and Conditions",
                    "Intellectual Property Rights",
                    "Confidentiality and Non-Disclosure",
                    "Term and Termination",
                    "Indemnification",
                    "Force Majeure",
                    "Governing Law and Jurisdiction"
                ]
            },
            brief: {
                name: "Legal Brief Document",
                type: "docx",
                size: "1.8 MB",
                sections: [
                    "Statement of Issues",
                    "Factual Background",
                    "Legal Arguments",
                    "Case Law Analysis",
                    "Conclusion and Prayer for Relief"
                ]
            }
        };

        this.libraryInfo = {
            PyPDF2: {
                description: "Pure Python PDF library for text extraction",
                functions: ["PdfReader", "extract_text", "page processing"],
                useCase: "PDF document parsing and text extraction"
            },
            PyMuPDF: {
                description: "Python binding for MuPDF library",
                functions: ["fitz.open", "get_text", "table extraction"],
                useCase: "Advanced PDF processing with OCR capabilities"
            },
            "python-docx": {
                description: "Library for creating and updating MS Word documents",
                functions: ["Document", "paragraphs", "runs", "tables"],
                useCase: "MS Word document parsing and content extraction"
            },
            NLTK: {
                description: "Natural Language Toolkit for text processing",
                functions: ["tokenization", "lemmatization", "NER", "sentiment analysis"],
                useCase: "Text analysis and natural language processing"
            },
            HuggingFace: {
                description: "Transformers library for legal document analysis",
                functions: ["AutoTokenizer", "AutoModel", "summarization", "classification"],
                useCase: "AI-powered legal document understanding and summarization"
            },
            TensorFlow: {
                description: "Machine learning framework for document analysis",
                functions: ["text classification", "neural networks", "prediction models"],
                useCase: "Deep learning analysis and legal document classification"
            }
        };
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.style.borderColor = 'var(--color-primary)';
    }

    handleFileDrop(e) {
        e.preventDefault();
        e.currentTarget.style.borderColor = '';
        const files = Array.from(e.dataTransfer.files);
        this.processFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.processFiles(files);
    }

    processFiles(files) {
        const validFiles = files.filter(file => {
            const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'image/png', 'image/jpeg', 'image/jpg'];
            return validTypes.includes(file.type) || file.name.toLowerCase().match(/\.(pdf|docx?|png|jpe?g)$/);
        });

        validFiles.forEach(file => {
            if (!this.uploadedFiles.find(f => f.name === file.name)) {
                this.uploadedFiles.push({
                    file: file,
                    name: file.name,
                    size: this.formatFileSize(file.size),
                    type: this.getFileType(file),
                    id: Math.random().toString(36).substr(2, 9)
                });
            }
        });

        this.updateFilesList();
        this.showFormatSelection();
    }

    loadSampleDocument(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const sampleElement = e.target.closest('.sample-doc');
        if (!sampleElement) return;
        
        const sampleType = sampleElement.dataset.sample;
        const sample = this.sampleDocuments[sampleType];
        
        if (!sample) return;
        
        // Create a mock file object
        const mockFile = new File(["sample content"], sample.name, {
            type: sample.type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

        // Clear previous files
        this.uploadedFiles = [];

        // Add sample file
        this.uploadedFiles.push({
            file: mockFile,
            name: sample.name,
            size: sample.size,
            type: sample.type,
            id: Math.random().toString(36).substr(2, 9),
            isSample: true,
            sampleData: sample
        });

        this.updateFilesList();
        this.showFormatSelection();
        
        // Hide modal
        const modalElement = document.getElementById('sampleModal');
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
        }

        // Show success message
        this.showNotification(`Sample document "${sample.name}" loaded successfully!`, 'success');
    }

    getFileType(file) {
        const name = file.name.toLowerCase();
        if (name.endsWith('.pdf')) return 'pdf';
        if (name.endsWith('.docx') || name.endsWith('.doc')) return 'docx';
        if (name.match(/\.(png|jpe?g)$/)) return 'image';
        return 'unknown';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateFilesList() {
        const container = document.getElementById('uploadedFiles');
        if (!container) return;
        
        container.innerHTML = '';

        this.uploadedFiles.forEach(fileData => {
            const fileElement = document.createElement('div');
            fileElement.className = 'file-item';
            fileElement.innerHTML = `
                <div class="file-info">
                    <i class="fas ${this.getFileIcon(fileData.type)} file-icon ${fileData.type}"></i>
                    <div class="file-details">
                        <h6>${fileData.name}</h6>
                        <p>${fileData.size} • ${fileData.type.toUpperCase()}</p>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn btn--sm btn--outline" onclick="window.analyzer.removeFile('${fileData.id}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            container.appendChild(fileElement);
        });
    }

    getFileIcon(type) {
        const icons = {
            'pdf': 'fa-file-pdf',
            'docx': 'fa-file-word',
            'image': 'fa-file-image'
        };
        return icons[type] || 'fa-file';
    }

    removeFile(fileId) {
        this.uploadedFiles = this.uploadedFiles.filter(f => f.id !== fileId);
        this.updateFilesList();
        
        if (this.uploadedFiles.length === 0) {
            this.hideFormatSelection();
        }
    }

    showFormatSelection() {
        const formatSection = document.getElementById('formatSelection');
        if (formatSection) {
            formatSection.style.display = 'block';
            console.log('Format selection shown');
        }
    }

    hideFormatSelection() {
        const formatSection = document.getElementById('formatSelection');
        const analyzeBtn = document.getElementById('analyzeBtn');
        
        if (formatSection) formatSection.style.display = 'none';
        if (analyzeBtn) analyzeBtn.disabled = true;
        
        this.selectedFormat = null;
        this.customFormat = null;
        this.customStyleTemplate = null;
        document.querySelectorAll('.format-option').forEach(option => {
            option.classList.remove('selected');
        });
    }

    handleFormatSelection(option) {
        const format = option.dataset.format;
        
        // Remove previous selection
        document.querySelectorAll('.format-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // Select current option
        option.classList.add('selected');
        this.selectedFormat = format;
        
        // If custom format is selected, show the modal
        if (format === 'custom') {
            this.showCustomFormatModal();
            return;
        }
        
        // Enable analyze button for other formats
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
        }

        this.showNotification(`Selected format: ${format.charAt(0).toUpperCase() + format.slice(1)}`, 'info');
    }

    async startAnalysis() {
        if (!this.selectedFormat || this.uploadedFiles.length === 0) {
            this.showNotification('Please upload documents and select an output format.', 'warning');
            return;
        }

        // For custom format, ensure a style template is selected
        if (this.selectedFormat === 'custom' && !this.customStyleTemplate) {
            this.showNotification('Please select a style template for the custom format.', 'warning');
            this.showCustomFormatModal();
            return;
        }

        // Hide upload section and show processing
        document.getElementById('uploadSection').style.display = 'none';
        document.getElementById('processingSection').style.display = 'block';

        // Reset processing steps
        this.processingSteps.forEach(step => {
            step.completed = false;
            const stepElement = document.getElementById(step.id);
            if (stepElement) {
                stepElement.classList.remove('active', 'completed');
                const statusIcon = stepElement.querySelector('.step-status i');
                if (statusIcon) {
                    statusIcon.className = 'fas fa-clock';
                }
            }
        });

        // Start processing pipeline
        await this.simulateProcessingPipeline();
    }

    async simulateProcessingPipeline() {
        const steps = [
            { id: 'step-upload', duration: 500 },
            { id: 'step-extraction', duration: 2000, progress: 'extractionProgress' },
            { id: 'step-nltk', duration: 1500, progress: 'nltkProgress' },
            { id: 'step-huggingface', duration: 3000, progress: 'huggingfaceProgress' },
            { id: 'step-tensorflow', duration: 2500, progress: 'tensorflowProgress' },
            { id: 'step-completion', duration: 500 }
        ];

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const stepElement = document.getElementById(step.id);
            
            if (!stepElement) continue;

            // Mark as active
            stepElement.classList.add('active');
            const statusIcon = stepElement.querySelector('.step-status i');
            if (statusIcon) {
                statusIcon.className = 'fas fa-clock';
            }

            // Simulate progress if applicable
            if (step.progress) {
                await this.animateProgress(step.progress, step.duration);
            } else {
                await this.delay(step.duration);
            }

            // Mark as completed
            stepElement.classList.remove('active');
            stepElement.classList.add('completed');
            if (statusIcon) {
                statusIcon.className = 'fas fa-check';
            }
        }

        // Generate and show results
        await this.generateResults();
        this.showResults();
    }

    async animateProgress(progressId, duration) {
        const progressBar = document.getElementById(progressId);
        if (!progressBar) return;
        
        const steps = 100;
        const stepDuration = duration / steps;

        for (let i = 0; i <= steps; i++) {
            progressBar.style.width = i + '%';
            await this.delay(stepDuration);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async generateResults() {
        // Generate realistic analysis results based on uploaded files and selected format
        const documentCount = this.uploadedFiles.length;
        const totalClauses = this.uploadedFiles.reduce((total, file) => {
            if (file.isSample && file.sampleData.clauses) {
                return total + file.sampleData.clauses.length;
            }
            // Generate random clause count for non-sample files
            return total + Math.floor(Math.random() * 15) + 5;
        }, 0);

        this.analysisResults = {
            documentCount,
            clauseCount: totalClauses,
            riskScore: Math.floor(Math.random() * 30) + 15, // 15-45%
            confidenceScore: Math.floor(Math.random() * 20) + 80, // 80-100%
            summary: this.generateSummary(),
            detailedAnalysis: this.generateDetailedAnalysis(),
            aiInsights: this.generateAIInsights(),
            customOutput: this.selectedFormat === 'custom' ? this.generateCustomOutput() : null
        };

        try {
            const history = JSON.parse(localStorage.getItem('analysisHistory') || '[]');
            const previewHtml = this.selectedFormat === 'custom' && this.analysisResults.customOutput
                ? this.analysisResults.customOutput
                : this.analysisResults.summary;
            history.push({
                timestamp: Date.now(),
                selectedFormat: this.selectedFormat,
                customStyleTemplate: this.customStyleTemplate || null,
                title: this.uploadedFiles && this.uploadedFiles.length ? `${this.uploadedFiles.length} document(s) analyzed` : 'Analysis Result',
                previewHtml
            });
            localStorage.setItem('analysisHistory', JSON.stringify(history.slice(-200)));
        } catch (e) {
            // ignore storage errors
        }
    }

    generateSummary() {
        // Always provide a single comprehensive summarization output
        return this.generateFullSummarization();
    }

    generateFullSummarization() {
        const files = this.uploadedFiles;
        const makeParagraph = (text) => `<p>${text}</p>`;
        
        const perFileSummaries = files.map(file => {
            // Build a synthetic summary using available sample clauses or generic hints
            let highlights = [];
            if (file.isSample && file.sampleData && Array.isArray(file.sampleData.clauses)) {
                highlights = file.sampleData.clauses.slice(0, 6);
            } else {
                highlights = [
                    'Preamble and Party Identification',
                    'Payment Terms and Conditions',
                    'Termination Clause',
                    'Liability Limitations',
                    'Governing Law',
                    'Dispute Resolution'
                ];
            }

            const summaryBody = `This document exhibits a conventional contractual architecture with a defined preamble, operative terms, and boilerplate provisions. Key areas include ${highlights.slice(0, 3).join(', ')}, as well as ${highlights.slice(3).join(', ')}. Payment provisions specify consideration, invoicing cadence, and late‑fee triggers; termination provisions define notice, cure windows, and for‑cause vs. convenience rights; liability provisions establish caps, exclusions, and carve‑outs (e.g., IP infringement, confidentiality, data breach). Governing law and dispute resolution identify venue and forum (court vs. arbitration), which directly impact enforcement posture and cost profile.`;

            return `
                <div class="file-summary mb-4">
                    <h5><i class="fas ${this.getFileIcon(file.type)}"></i> ${file.name}</h5>
                    ${makeParagraph(summaryBody)}
                    <ul class="ms-3">
                        <li><strong>Definitions & Scope:</strong> Parties, defined terms, and service scope appear coherent and non‑conflicting.</li>
                        <li><strong>Service Levels:</strong> If SLAs are referenced, escalation and service credits should be aligned with operational capacity.</li>
                        <li><strong>Confidentiality:</strong> NDA‑style obligations likely cover non‑public information; check survival period and permitted disclosures.</li>
                        <li><strong>Data Handling:</strong> If personal data is processed, cross‑reference data processing addendum and transfer mechanisms.</li>
                        <li><strong>Change Control:</strong> Amendments typically require mutual written agreement; validate signature blocks and authority.</li>
                    </ul>
                </div>
            `;
        }).join('');

        const overall = `
            ${makeParagraph('Overall, the documents reflect a balanced allocation of obligations with moderate risk concentration around payment schedules, termination triggers, and liability boundaries. The contract posture is commercially standard, with targeted areas requiring calibration to business practice and regulatory posture.')}
            <div class="mt-3">
                <h6><i class="fas fa-exclamation-triangle me-2"></i>Risk Overview</h6>
                <ul class="ms-3">
                    <li><strong>Financial Exposure:</strong> Late‑fee multipliers and interest accrual may escalate quickly if invoicing cadence slips.</li>
                    <li><strong>Termination Impact:</strong> Short cure periods increase operational risk; asymmetric convenience rights affect continuity planning.</li>
                    <li><strong>Liability Caps:</strong> Caps below insurance coverage may be acceptable; carve‑outs (IP, confidentiality, data breach) may bypass caps.</li>
                    <li><strong>Jurisdiction/Forum:</strong> Out‑of‑state venue or mandatory arbitration may shift cost and timeline dynamics.</li>
                </ul>
            </div>
            <div class="mt-3">
                <h6><i class="fas fa-tasks me-2"></i>Recommendations</h6>
                <ol class="ms-3">
                    <li>Align <strong>payment milestones</strong> to delivery events; cap late‑fee interest and add a grace period.</li>
                    <li>Extend <strong>cure periods</strong> for non‑material breaches; define material breach thresholds to avoid ambiguity.</li>
                    <li>Set <strong>liability cap</strong> to 1–2× annual contract value; ensure explicit carve‑outs are narrowly tailored.</li>
                    <li>Confirm <strong>IP indemnity</strong> scope (defense, settlement, and damages) and any open‑source usage policies.</li>
                    <li>Adopt a <strong>neutral venue</strong> or add remote proceedings clause to reduce travel overhead.</li>
                </ol>
            </div>
            <div class="mt-3">
                <h6><i class="fas fa-shield-alt me-2"></i>Compliance & Privacy</h6>
                <ul class="ms-3">
                    <li>Map personal data flows; if applicable, attach a <strong>DPA</strong> with SCCs/IDTA for cross‑border transfers.</li>
                    <li>Reference <strong>security controls</strong> (ISO 27001/SOC 2), breach notification windows, and audit rights.</li>
                    <li>Ensure <strong>record retention</strong> aligns with sector requirements (e.g., financial, healthcare, education).</li>
                </ul>
            </div>
            <div class="mt-3">
                <h6><i class="fas fa-clock me-2"></i>Timeline & Deliverables</h6>
                <ul class="ms-3">
                    <li>Introduce buffer to milestone dates; define acceptance criteria and re‑test windows.</li>
                    <li>Clarify change‑request workflow and pricing for out‑of‑scope items.</li>
                </ul>
            </div>
            <div class="mt-3">
                <h6><i class="fas fa-balance-scale me-2"></i>Financials</h6>
                <ul class="ms-3">
                    <li>Specify net terms (e.g., Net 30) and invoice dispute resolution steps.</li>
                    <li>Cap ancillary fees; document currency, tax handling, and indexation (if any).</li>
                </ul>
            </div>
            <div class="mt-3">
                <h6><i class="fas fa-lightbulb me-2"></i>Action Items</h6>
                <ul class="ms-3">
                    <li>Redline payment, termination, and liability sections per above recommendations.</li>
                    <li>Attach DPA and security exhibit if personal data processing is in scope.</li>
                    <li>Confirm insurance certificates align to negotiated caps and carve‑outs.</li>
                </ul>
            </div>
        `;

        return `
            <div class="analysis-section">
                <h4 class="section-title">
                    <i class="fas fa-align-left"></i>
                    Summarization
                </h4>
                <div class="document-summarization">
                    ${perFileSummaries}
                    ${overall}
                </div>
            </div>
        `;
    }

    generateCustomOutput() {
        // Generate output even if instructions are empty; rely on template
        
        // Generate sample content based on user's custom format
        const sampleClauses = [
            {
                title: "Payment Terms and Conditions",
                content: "Defines payment schedules, invoicing cadence, accepted methods, and late‑fee triggers. Details dispute workflows and short‑pay handling. Includes provisions for currency conversion and tax treatment across jurisdictions.",
                riskLevel: "Medium",
                keyTerms: ["payment schedule", "late fees", "currency exchange", "taxes"]
            },
            {
                title: "Termination and Cancellation",
                content: "Outlines termination for cause and for convenience, associated notice periods, and cure windows. Specifies post‑termination cooperation, transition assistance, and data return or destruction obligations.",
                riskLevel: "High",
                keyTerms: ["for cause", "convenience", "cure period", "transition"]
            },
            {
                title: "Intellectual Property Rights",
                content: "Establishes ownership, license scope (territory, exclusivity), and restrictions on use of artifacts created or used under the agreement. Addresses background vs. foreground IP and derivative works.",
                riskLevel: "Low",
                keyTerms: ["ownership", "license", "background IP", "derivatives"]
            },
            {
                title: "Liability and Indemnification",
                content: "Limits aggregate liability, defines excluded damages (indirect, consequential), and specifies indemnification triggers and procedures. Clarifies defense, settlement authority, and cooperation duties.",
                riskLevel: "High",
                keyTerms: ["cap", "exclusions", "indemnity", "defense"]
            },
            {
                title: "Force Majeure Provisions",
                content: "Addresses unforeseen events that impede performance (e.g., natural disasters, strikes, pandemics). Defines notice requirements, mitigation efforts, and duration thresholds for termination rights.",
                riskLevel: "Medium",
                keyTerms: ["force majeure", "mitigation", "threshold", "notice"]
            },
            {
                title: "Confidentiality and Non‑Disclosure",
                content: "Imposes obligations to protect non‑public information, carve‑outs for required disclosures, and survival periods. Describes technical and organizational measures to prevent unauthorized access.",
                riskLevel: "Medium",
                keyTerms: ["confidential information", "survival", "carve‑outs", "TOMs"]
            },
            {
                title: "Data Protection and Security",
                content: "Defines personal data processing roles, security controls (ISO/SOC), breach notification timelines, and audit rights. References data processing addendum and cross‑border transfer mechanisms.",
                riskLevel: "High",
                keyTerms: ["DPA", "SCCs", "breach notice", "audit"]
            },
            {
                title: "Service Levels and Support",
                content: "Specifies uptime commitments, response/resolution targets, maintenance windows, and service credits. Establishes escalation paths and reporting cadence for incident management.",
                riskLevel: "Medium",
                keyTerms: ["SLA", "service credits", "escalation", "uptime"]
            },
            {
                title: "Warranties and Disclaimers",
                content: "Provides limited warranties (conformity, non‑infringement) and associated remedies. Includes standard disclaimers of implied warranties to bound risk exposure.",
                riskLevel: "Low",
                keyTerms: ["warranty", "remedy", "disclaimer", "non‑infringement"]
            },
            {
                title: "Acceptance and Testing",
                content: "Defines acceptance criteria, test procedures, re‑test rights, and deemed‑acceptance triggers. Ties acceptance to milestone payments where applicable.",
                riskLevel: "Medium",
                keyTerms: ["criteria", "re‑test", "deemed acceptance", "milestones"]
            },
            {
                title: "Change Control",
                content: "Outlines the process for requesting, assessing, and approving changes in scope, including pricing impacts and timeline adjustments. Establishes governance committee roles.",
                riskLevel: "Medium",
                keyTerms: ["CR", "pricing", "timeline", "governance"]
            },
            {
                title: "Dispute Resolution",
                content: "Specifies negotiation, mediation, and arbitration or court proceedings. Sets venue, governing rules, and cost allocation, with escalation timeframes to avoid deadlock.",
                riskLevel: "Medium",
                keyTerms: ["mediation", "arbitration", "venue", "costs"]
            },
            {
                title: "Governing Law and Jurisdiction",
                content: "Determines the legal system applied to interpret the agreement, and the forum where claims are heard. Influences enforcement strategy and litigation cost profile.",
                riskLevel: "Low",
                keyTerms: ["governing law", "jurisdiction", "venue"]
            },
            {
                title: "Subcontracting and Assignment",
                content: "Controls rights to assign the agreement or subcontract obligations, including consent requirements and accountability for subcontractor performance.",
                riskLevel: "Low",
                keyTerms: ["assignment", "consent", "subcontractor", "accountability"]
            },
            {
                title: "Pricing and Taxes",
                content: "Details base pricing, indexation, pass‑through expenses, and tax responsibilities. Clarifies invoice requirements and dispute timelines to prevent billing friction.",
                riskLevel: "Medium",
                keyTerms: ["pricing", "indexation", "expenses", "tax"]
            },
            {
                title: "Audit and Compliance",
                content: "Grants audit rights to verify performance, billing accuracy, and security posture. References compliance with applicable regulations and industry standards.",
                riskLevel: "Medium",
                keyTerms: ["audit", "compliance", "standards", "verification"]
            }
        ];

        // Apply formatting based on style template and user instructions
        return this.formatCustomOutput(sampleClauses);
    }

    formatCustomOutput(clauses) {
        const template = this.customStyleTemplate;
        const instructions = this.customFormat;
        
        let formattedOutput = '';
        
        // Format content based on template
        switch (template) {
            case 'numbered':
                formattedOutput += '<ol class="numbered-format">';
                clauses.forEach((clause) => {
                    formattedOutput += `
                        <li class="custom-format-item mb-2">
                            <div><strong>${clause.title}</strong></div>
                            <div>${clause.content}</div>
                            <div><em>Risk:</em> ${clause.riskLevel} | <em>Key terms:</em> ${clause.keyTerms.join(', ')}</div>
                        </li>
                    `;
                });
                formattedOutput += '</ol>';
                break;
                
            case 'bullet':
                formattedOutput += '<ul class="bullet-format">';
                clauses.forEach(clause => {
                    formattedOutput += `
                        <li class="custom-format-item mb-2">
                            <div><strong>${clause.title}</strong></div>
                            <div>${clause.content}</div>
                            <div><em>Risk:</em> ${clause.riskLevel} | <em>Key terms:</em> ${clause.keyTerms.join(', ')}</div>
                        </li>
                    `;
                });
                formattedOutput += '</ul>';
                break;
                
            case 'markdown':
                let md = '';
                clauses.forEach(clause => {
                    md += `## ${clause.title}\n`;
                    md += `${clause.content}\n\n`;
                    md += `**Risk Level:** ${clause.riskLevel}\n`;
                    md += `**Key Terms:** \`${clause.keyTerms.join('`, `')}\`\n\n`;
                });
                formattedOutput += `<pre class="markdown-format" style="white-space: pre-wrap;">${md.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`;
                break;
                
            case 'json':
                const jsonData = clauses.map(clause => ({
                    title: clause.title,
                    content: clause.content,
                    riskLevel: clause.riskLevel,
                    keyTerms: clause.keyTerms
                }));
                formattedOutput += `
                    <div class="json-format">
                        <pre><code>${JSON.stringify(jsonData, null, 2)}</code></pre>
                    </div>
                `;
                break;
                
            case 'table':
                formattedOutput += `
                    <div class="table-format">
                        <table class="table table-bordered">
                            <thead>
                                <tr>
                                    <th>Clause</th>
                                    <th>Description</th>
                                    <th>Risk Level</th>
                                    <th>Key Terms</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                clauses.forEach(clause => {
                    formattedOutput += `
                        <tr>
                            <td><strong>${clause.title}</strong></td>
                            <td>${clause.content}</td>
                            <td><span class="risk-${clause.riskLevel.toLowerCase()}">${clause.riskLevel}</span></td>
                            <td>${clause.keyTerms.join(', ')}</td>
                        </tr>
                    `;
                });
                formattedOutput += `
                            </tbody>
                        </table>
                    </div>
                `;
                break;
                
            case 'document-summarization':
                formattedOutput += '<div class="doc-summarization">';
                formattedOutput += `
                    <div class="mt-1">
                        <p>The agreement presents a coherent allocation of commercial, operational, and legal responsibilities. Core provisions establish the rhythm of delivery and acceptance, tie payment events to verifiable milestones, and bound exposure through layered warranty and liability constructs. Boilerplate governance—covering law, venue, notice, and assignment—supplies predictability while leaving room for negotiated variance where the transaction scope demands it.</p>
                        <p>Commercial posture is driven by the interplay of consideration, timelines, and change control. Where delivery is phased, acceptance criteria and re‑test rights should be framed to avoid inadvertent deemed‑acceptance while still enabling momentum. Change requests operate as a safety valve for scope drift, converting ambiguity into priced, time‑boxed work with clear authority paths. Service levels and credits—when present—translate availability and responsiveness into measurable accountability without distorting incentives.</p>
                        <p>Risk consolidates around termination triggers and the definition of breach. Short cure windows and undefined materiality thresholds can transform routine variance into contractual non‑compliance. Liability caps are effective where aligned to insurance cover and supported by narrowly tailored carve‑outs (for example, IP infringement, confidentiality, and data protection). Indemnity procedure—defense control, settlement consent, and cooperation—often determines the real‑world efficiency of risk transfer more than abstract cap math alone.</p>
                        <p>On compliance and privacy, personal data processing invites a structured annex that specifies roles, security controls (e.g., ISO 27001/SOC 2 mappings), breach notification clocks, audit protocols, and cross‑border transfer mechanisms. These instruments allow legal promises to be operationalized by security and privacy teams. Records and retention clauses should be harmonized with sectoral obligations and internal governance so that evidentiary needs are met without over‑collection.</p>
                        <p>In execution, timelines benefit from buffer allowances calibrated to upstream dependencies. Acceptance gates should connect to quality signals rather than calendar alone. Financial schedules improve with standardized invoice data, dispute escalation steps, and caps on ancillary charges. Finally, venue selection and remote proceedings clauses can materially reduce adjudication friction while preserving enforceability, especially for distributed teams.</p>
                    </div>
                `;
                formattedOutput += '</div>'; 
                break;

            case 'document-simplification':
                formattedOutput += '<div class="doc-simplification">';
                clauses.forEach((clause, index) => {
                    formattedOutput += `
                        <div class="custom-format-item mb-3">
                            <h6>${index + 1}. ${clause.title}</h6>
                            <ul class="ms-3">
                                <li><strong>Plain meaning:</strong> ${clause.content}</li>
                                <li><strong>Why it matters:</strong> Sets expectations and limits risk for both parties.</li>
                                <li><strong>Watch for:</strong> Tight deadlines, vague acceptance, uncapped fees, broad indemnities.</li>
                            </ul>
                        </div>
                    `;
                });
                formattedOutput += '</div>';
                break;

            case 'named-entity-summarization':
                // Expanded simulated entities commonly found in contracts
                const simulatedEntities = {
                    Parties: ['Acme Corp., a Delaware corporation', 'ServiceCo LLC, a California limited liability company'],
                    Contacts: ['Primary Contact: Jane Doe (Acme), jane.doe@acme.com', 'Account Manager: John Smith (ServiceCo), john.smith@serviceco.com'],
                    Addresses: ['Acme HQ: 123 Market St, San Francisco, CA', 'ServiceCo HQ: 456 Innovation Way, Austin, TX'],
                    Dates: [
                        'Effective Date: ' + new Date().toLocaleDateString(),
                        'Initial Term: 12 months',
                        'Auto-Renewal: 12-month increments unless notice 30 days prior'
                    ],
                    Monetary: [
                        'Contract Value: $350,000 (annual)',
                        'Liability Cap: $100,000 (aggregate)',
                        'Payment Terms: Net 30; dispute within 10 days'
                    ],
                    Jurisdiction: [
                        'Governing Law: California',
                        'Venue: San Francisco County, CA',
                        'Dispute Resolution: Mediation then binding arbitration (AAA rules)'
                    ],
                    IntellectualProperty: [
                        'Background IP retained by each party',
                        'Foreground IP: owned by Acme; ServiceCo receives non‑exclusive, worldwide license',
                        'Open Source Use: permitted subject to policy and disclosure'
                    ],
                    Confidentiality: [
                        'Confidential Info: non‑public business, technical, and financial data',
                        'Survival: 3 years post‑termination',
                        'Carve‑outs: information already known, independently developed, or legally compelled'
                    ],
                    DataProtection: [
                        'Roles: Acme (Controller), ServiceCo (Processor)',
                        'Security: ISO 27001/SOC 2 aligned controls',
                        'Breach Notice: within 72 hours; cooperate on remediation'
                    ]
                };
                formattedOutput += `
                    <div class="entity-summary">
                        <div class="mb-3"><strong>Parties:</strong><br>${simulatedEntities.Parties.join('<br>')}</div>
                        <div class="mb-3"><strong>Contacts:</strong><br>${simulatedEntities.Contacts.join('<br>')}</div>
                        <div class="mb-3"><strong>Addresses:</strong><br>${simulatedEntities.Addresses.join('<br>')}</div>
                        <div class="mb-3"><strong>Key Dates & Term:</strong><br>${simulatedEntities.Dates.join('<br>')}</div>
                        <div class="mb-3"><strong>Monetary & Financial:</strong><br>${simulatedEntities.Monetary.join('<br>')}</div>
                        <div class="mb-3"><strong>Jurisdiction & Disputes:</strong><br>${simulatedEntities.Jurisdiction.join('<br>')}</div>
                        <div class="mb-3"><strong>Intellectual Property:</strong><br>${simulatedEntities.IntellectualProperty.join('<br>')}</div>
                        <div class="mb-3"><strong>Confidentiality:</strong><br>${simulatedEntities.Confidentiality.join('<br>')}</div>
                        <div class="mb-3"><strong>Data Protection:</strong><br>${simulatedEntities.DataProtection.join('<br>')}</div>

                        <div class="mt-4">
                            <h6>Entity Analysis</h6>
                            <p>The parties are identified with sufficient corporate granularity to support signature authority verification and service of notice. Contact roles align operational ownership with escalation paths, reducing ambiguity during incident response or scope negotiation.</p>
                            <p>Term mechanics (initial + auto‑renew) mandate calendar controls for renewal decisions. Financial entities—contract value, caps, and net terms—should be reconciled with pricing schedules and insurance coverage to avoid latent exposure or billing friction.</p>
                            <p>Jurisdiction and dispute resolution entities collectively shape enforcement posture. A California governing law with AAA arbitration in San Francisco balances predictability and speed; remote proceedings language can further reduce cost overhead for distributed teams.</p>
                            <p>IP entities cleanly separate background and foreground rights while allowing operational licensing. Confidentiality entities establish scope, survival, and carve‑outs consistent with industry practice. Data protection entities convert privacy promises into operational controls, with breach clocks and cooperation duties enabling structured incident management.</p>
                        </div>

                        <div class="mt-3">
                            <h6>Follow‑ups & Recommendations</h6>
                            <ul class="ms-3">
                                <li>Confirm party legal names match Secretary of State records; capture DUNS/LEI if required.</li>
                                <li>Attach pricing exhibit; validate that the liability cap aligns with insured limits.</li>
                                <li>Add remote proceedings clause to arbitration to minimize travel overhead.</li>
                                <li>Append DPA and security exhibit; specify control mappings and audit scope.</li>
                                <li>Set renewal reminders 45–60 days prior to auto‑renewal threshold.</li>
                            </ul>
                        </div>
                    </div>
                `;
                break;

            default:
                // Fallback to numbered if template not recognized
                formattedOutput += '<ol class="numbered-format">';
                clauses.forEach((clause) => {
                    formattedOutput += `
                        <li class="custom-format-item mb-2">
                            <div><strong>${clause.title}</strong></div>
                            <div>${clause.content}</div>
                            <div><em>Risk:</em> ${clause.riskLevel} | <em>Key terms:</em> ${clause.keyTerms.join(', ')}</div>
                        </li>
                    `;
                });
                formattedOutput += '</ol>';
        }
        
        return formattedOutput;
    }

    generateClausesSummary() {
        return `
            <div class="analysis-section">
                <h4 class="section-title">
                    <i class="fas fa-list-alt"></i>
                    Contract Clauses Analysis
                </h4>
                ${this.uploadedFiles.map(file => this.generateFileClausesAnalysis(file)).join('')}
            </div>
        `;
    }

    generateFileClausesAnalysis(file) {
        let clauses = [];
        
        if (file.isSample && file.sampleData.clauses) {
            clauses = file.sampleData.clauses.map(clause => ({
                title: clause,
                content: this.generateClauseContent(clause),
                risk: this.getRandomRisk()
            }));
        } else {
            // Generate generic clauses for uploaded files
            const genericClauses = [
                "Terms and Conditions",
                "Payment Obligations",
                "Termination Clause",
                "Liability Limitations",
                "Governing Law"
            ];
            clauses = genericClauses.map(clause => ({
                title: clause,
                content: this.generateClauseContent(clause),
                risk: this.getRandomRisk()
            }));
        }

        return `
            <div class="file-analysis">
                <h5><i class="fas ${this.getFileIcon(file.type)}"></i> ${file.name}</h5>
                ${clauses.map(clause => `
                    <div class="clause-item">
                        <div class="clause-title">
                            ${clause.title}
                            <span class="risk-indicator risk-${clause.risk.level}">
                                <i class="fas fa-${clause.risk.icon}"></i>
                                ${clause.risk.label}
                            </span>
                        </div>
                        <div class="clause-content">${clause.content}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    generateClauseContent(clauseTitle) {
        const contents = {
            "Preamble and Party Identification": "This clause identifies the contracting parties and establishes the legal framework for the agreement. Risk level is low with standard identification protocols.",
            "Payment Terms and Conditions": "Outlines payment schedules, methods, and penalties for late payment. Contains potential cash flow risks that should be monitored.",
            "Termination Clause": "Specifies conditions under which the contract may be terminated. Review required for notice periods and termination penalties.",
            "Liability Limitations": "Establishes caps on damages and liability exposure. Important for risk management and insurance planning.",
            "Governing Law": "Determines which jurisdiction's laws will apply to the contract. Ensure compatibility with business operations.",
            "Terms and Conditions": "Standard terms governing the relationship between parties. Review for compliance with applicable regulations.",
            "Payment Obligations": "Financial commitments and payment terms. Assess impact on cash flow and budgeting requirements.",
            "Intellectual Property Rights": "Protects creative and intellectual assets. Ensure comprehensive coverage of all relevant IP."
        };
        
        return contents[clauseTitle] || "This clause requires detailed legal review to assess compliance requirements and potential risk factors.";
    }

    getRandomRisk() {
        const risks = [
            { level: 'low', label: 'Low Risk', icon: 'check-circle' },
            { level: 'medium', label: 'Medium Risk', icon: 'exclamation-triangle' },
            { level: 'high', label: 'High Risk', icon: 'exclamation-circle' }
        ];
        
        // Weight towards lower risk for realistic results
        const weights = [0.6, 0.3, 0.1];
        const random = Math.random();
        let cumulative = 0;
        
        for (let i = 0; i < weights.length; i++) {
            cumulative += weights[i];
            if (random <= cumulative) {
                return risks[i];
            }
        }
        
        return risks[0];
    }

    generatePointsSummary() {
        return `
            <div class="analysis-section">
                <h4 class="section-title">
                    <i class="fas fa-list-ul"></i>
                    Key Legal Points
                </h4>
                <div class="points-list">
                    <ul class="list-unstyled">
                        <li class="mb-3">
                            <i class="fas fa-check-circle text-success me-2"></i>
                            <strong>Contract Formation:</strong> All essential elements present including offer, acceptance, and consideration
                        </li>
                        <li class="mb-3">
                            <i class="fas fa-exclamation-triangle text-warning me-2"></i>
                            <strong>Liability Concerns:</strong> Limited liability clauses may not cover all potential damages
                        </li>
                        <li class="mb-3">
                            <i class="fas fa-info-circle text-info me-2"></i>
                            <strong>Intellectual Property:</strong> Clear ownership and usage rights defined
                        </li>
                        <li class="mb-3">
                            <i class="fas fa-clock text-primary me-2"></i>
                            <strong>Term Duration:</strong> Contract period and renewal terms are clearly specified
                        </li>
                        <li class="mb-3">
                            <i class="fas fa-gavel text-secondary me-2"></i>
                            <strong>Dispute Resolution:</strong> Arbitration clauses present for conflict management
                        </li>
                    </ul>
                </div>
            </div>
        `;
    }

    generateDivisionsSummary() {
        return `
            <div class="analysis-section">
                <h4 class="section-title">
                    <i class="fas fa-sitemap"></i>
                    Document Structure Analysis
                </h4>
                <div class="divisions-analysis">
                    <div class="division-item mb-3">
                        <h5>Section I: Introductory Provisions</h5>
                        <p>Contains preamble, definitions, and scope of agreement. Well-structured with clear terminology.</p>
                    </div>
                    <div class="division-item mb-3">
                        <h5>Section II: Operational Terms</h5>
                        <p>Covers performance obligations, timelines, and deliverables. Requires attention to milestone definitions.</p>
                    </div>
                    <div class="division-item mb-3">
                        <h5>Section III: Financial Provisions</h5>
                        <p>Payment terms, penalties, and financial obligations. Review recommended for cash flow impact.</p>
                    </div>
                    <div class="division-item mb-3">
                        <h5>Section IV: Legal Framework</h5>
                        <p>Governing law, jurisdiction, and dispute resolution mechanisms. Standard provisions present.</p>
                    </div>
                </div>
            </div>
        `;
    }

    generateCustomSummary() {
        return `
            <div class="analysis-section">
                <h4 class="section-title">
                    <i class="fas fa-cogs"></i>
                    Custom Analysis Format
                </h4>
                <div class="custom-analysis">
                    <div class="analysis-category mb-4">
                        <h5>Executive Summary</h5>
                        <p>The analyzed documents demonstrate standard legal structure with appropriate risk mitigation measures. Key areas for attention include liability limitations and termination procedures.</p>
                    </div>
                    <div class="analysis-category mb-4">
                        <h5>Compliance Assessment</h5>
                        <p>Documents appear to comply with relevant regulatory requirements. Recommend periodic review to ensure continued compliance.</p>
                    </div>
                    <div class="analysis-category mb-4">
                        <h5>Risk Evaluation</h5>
                        <p>Overall risk profile is moderate. Primary concerns relate to intellectual property protection and dispute resolution mechanisms.</p>
                    </div>
                </div>
            </div>
        `;
    }

    generateDetailedAnalysis() {
        return `
            <div class="analysis-section">
                <h4 class="section-title">
                    <i class="fas fa-search"></i>
                    Library Processing Details
                </h4>
                <div class="library-analysis">
                    ${Object.entries(this.libraryInfo).map(([name, info]) => `
                        <div class="library-section mb-4">
                            <h5>${name} Processing</h5>
                            <p class="text-muted">${info.description}</p>
                            <div class="library-functions">
                                <strong>Functions Used:</strong>
                                <span class="ms-2">${info.functions.join(', ')}</span>
                            </div>
                            <div class="library-usecase mt-2">
                                <strong>Use Case:</strong>
                                <span class="ms-2">${info.useCase}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="analysis-section">
                <h4 class="section-title">
                    <i class="fas fa-chart-bar"></i>
                    Document Metrics
                </h4>
                <div class="metrics-grid">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="metric-item">
                                <h6>Text Extraction Accuracy</h6>
                                <div class="progress mb-2">
                                    <div class="progress-bar" style="width: 94%">94%</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="metric-item">
                                <h6>Classification Confidence</h6>
                                <div class="progress mb-2">
                                    <div class="progress-bar" style="width: 87%">87%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    generateAIInsights() {
        return `
            <div class="analysis-section">
                <h4 class="section-title">
                    <i class="fas fa-brain"></i>
                    AI-Powered Insights
                </h4>
                <div class="insights-content">
                    <div class="insight-item mb-4">
                        <div class="insight-header mb-2">
                            <i class="fas fa-lightbulb text-warning me-2"></i>
                            <h6 class="d-inline">Contract Optimization Recommendation</h6>
                        </div>
                        <p>Based on analysis of similar contracts, consider adding a force majeure clause with pandemic-specific language to enhance protection against unforeseen circumstances.</p>
                    </div>
                    
                    <div class="insight-item mb-4">
                        <div class="insight-header mb-2">
                            <i class="fas fa-shield-alt text-info me-2"></i>
                            <h6 class="d-inline">Risk Mitigation Suggestion</h6>
                        </div>
                        <p>The current liability limitation may not provide adequate protection. Industry standard caps are typically 1.5-2x the contract value for similar agreements.</p>
                    </div>
                    
                    <div class="insight-item mb-4">
                        <div class="insight-header mb-2">
                            <i class="fas fa-trending-up text-success me-2"></i>
                            <h6 class="d-inline">Compliance Enhancement</h6>
                        </div>
                        <p>Consider adding data privacy clauses to ensure GDPR and CCPA compliance, especially if the contract involves processing personal information.</p>
                    </div>
                    
                    <div class="insight-item mb-4">
                        <div class="insight-header mb-2">
                            <i class="fas fa-clock text-primary me-2"></i>
                            <h6 class="d-inline">Timeline Analysis</h6>
                        </div>
                        <p>Performance deadlines appear ambitious compared to industry benchmarks. Consider building in buffer time for critical deliverables.</p>
                    </div>
                </div>
            </div>
        `;
    }

    showResults() {
        // Hide processing section and show results
        document.getElementById('processingSection').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'block';

        // Update statistics
        const elements = {
            documentCount: this.analysisResults.documentCount,
            clauseCount: this.analysisResults.clauseCount,
            riskScore: this.analysisResults.riskScore + '%',
            confidenceScore: this.analysisResults.confidenceScore + '%'
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });

        // Update content sections
        const contentElements = {
            summaryContent: this.analysisResults.summary,
            detailedAnalysis: this.analysisResults.detailedAnalysis,
            aiInsights: this.analysisResults.aiInsights
        };

        Object.entries(contentElements).forEach(([id, content]) => {
            const element = document.getElementById(id);
            if (element) element.innerHTML = content;
        });

        // Handle custom output tab
        if (this.selectedFormat === 'custom' && this.analysisResults.customOutput) {
            // Show custom output tab
            const customTabNav = document.getElementById('customOutputTabNav');
            const customTabContent = document.getElementById('customOutput');
            const customOutputContent = document.getElementById('customOutputContent');
            
            if (customTabNav) customTabNav.style.display = 'block';
            if (customTabContent) customTabContent.style.display = 'block';
            if (customOutputContent) customOutputContent.innerHTML = this.analysisResults.customOutput;
        }

        this.showNotification('Analysis complete! Results are now available.', 'success');
    }

    downloadResults() {
        if (!this.analysisResults) {
            this.showNotification('No analysis results available to download.', 'warning');
            return;
        }

        // Generate downloadable report
        const report = this.generateDownloadableReport();
        const blob = new Blob([report], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `legal-analysis-report-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Report downloaded successfully!', 'success');
    }

    generateDownloadableReport() {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>Legal Document Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #ddd; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .stats { display: flex; gap: 20px; margin-bottom: 30px; flex-wrap: wrap; }
        .stat { text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 8px; flex: 1; min-width: 150px; }
        .clause-item { margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #007bff; }
        .clause-title { font-weight: bold; margin-bottom: 8px; }
        .risk-indicator { font-size: 0.8em; padding: 2px 6px; border-radius: 3px; }
        .risk-low { background: #d4edda; color: #155724; }
        .risk-medium { background: #fff3cd; color: #856404; }
        .risk-high { background: #f8d7da; color: #721c24; }
        h1, h2, h3, h4, h5 { color: #333; }
        .insight-item { margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 6px; }
        .custom-format-item { margin: 15px 0; padding: 15px; background: #f0f8ff; border-radius: 6px; border-left: 4px solid #ff6b35; }
    </style>
</head>
<body>
    <div class="header">
        <h1>AI Legal Document Analysis Report</h1>
        <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Analysis Format:</strong> ${this.selectedFormat.charAt(0).toUpperCase() + this.selectedFormat.slice(1)}</p>
        <p><strong>Files Analyzed:</strong> ${this.uploadedFiles.map(f => f.name).join(', ')}</p>
        <p><strong>Theme Used:</strong> ${this.themes[this.currentTheme].name}</p>
        ${this.selectedFormat === 'custom' ? `<p><strong>Custom Instructions:</strong> "${this.customFormat}"</p>` : ''}
        ${this.customStyleTemplate ? `<p><strong>Style Template:</strong> ${this.customStyleTemplate.charAt(0).toUpperCase() + this.customStyleTemplate.slice(1)}</p>` : ''}
    </div>
    
    <div class="stats">
        <div class="stat">
            <h3>${this.analysisResults.documentCount}</h3>
            <p>Documents Analyzed</p>
        </div>
        <div class="stat">
            <h3>${this.analysisResults.clauseCount}</h3>
            <p>Clauses Found</p>
        </div>
        <div class="stat">
            <h3>${this.analysisResults.riskScore}%</h3>
            <p>Risk Score</p>
        </div>
        <div class="stat">
            <h3>${this.analysisResults.confidenceScore}%</h3>
            <p>Confidence Score</p>
        </div>
    </div>
    
    <div class="section">
        <h2>Analysis Summary</h2>
        ${this.analysisResults.summary}
    </div>
    
    ${this.analysisResults.customOutput ? `
    <div class="section">
        <h2>Custom Formatted Output</h2>
        ${this.analysisResults.customOutput}
    </div>
    ` : ''}
    
    <div class="section">
        <h2>Detailed Analysis</h2>
        ${this.analysisResults.detailedAnalysis}
    </div>
    
    <div class="section">
        <h2>AI Insights</h2>
        ${this.analysisResults.aiInsights}
    </div>
    
    <div class="footer" style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;">
        <p>Report generated by AI Legal Document Analyzer v2.0</p>
        <p>This is a simulated analysis for demonstration purposes</p>
        <p>Generated using ${this.themes[this.currentTheme].name}</p>
        ${this.selectedFormat === 'custom' ? '<p>Custom format functionality enabled</p>' : ''}
    </div>
</body>
</html>
        `;
    }

    resetAnalysis() {
        // Reset all states
        this.uploadedFiles = [];
        this.selectedFormat = null;
        this.customFormat = null;
        this.customStyleTemplate = null;
        this.analysisResults = null;

        // Reset UI
        document.getElementById('uploadSection').style.display = 'block';
        document.getElementById('processingSection').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'none';
        
        document.getElementById('uploadedFiles').innerHTML = '';
        this.hideFormatSelection();
        
        // Hide custom output tab
        const customTabNav = document.getElementById('customOutputTabNav');
        const customTabContent = document.getElementById('customOutput');
        if (customTabNav) customTabNav.style.display = 'none';
        if (customTabContent) customTabContent.style.display = 'none';
        
        // Clear custom format modal
        const textarea = document.getElementById('customFormatDescription');
        const styleTemplate = document.getElementById('styleTemplate');
        const formatError = document.getElementById('formatError');
        
        if (textarea) textarea.value = '';
        if (styleTemplate) styleTemplate.value = '';
        if (formatError) formatError.style.display = 'none';
        
        // Clear file input
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.value = '';

        this.showNotification('Analysis reset. You can upload new documents.', 'info');
    }

    showNotification(message, type = 'info') {
        // Create a theme-aware notification system
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 10000; min-width: 300px; max-width: 400px;';
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.analyzer = new LegalDocumentAnalyzer();
});

// Additional utility functions
window.showNotification = function(message, type = 'info') {
    if (window.analyzer) {
        window.analyzer.showNotification(message, type);
    }
};

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + U for upload
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.click();
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
        const modal = document.querySelector('.modal.show');
        if (modal) {
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) modalInstance.hide();
        }
    }
});

// Enhanced error handling with theme awareness
window.addEventListener('error', function(e) {
    console.error('Application error:', e.error);
    if (window.analyzer) {
        window.analyzer.showNotification('An error occurred. Please refresh the page and try again.', 'danger');
    }
});

// Theme change event listener for external components
window.addEventListener('themeChanged', function(e) {
    console.log('Theme changed to:', e.detail.theme);
    // Custom handling for theme changes can be added here
});

// Export functionality for debugging
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LegalDocumentAnalyzer };
}