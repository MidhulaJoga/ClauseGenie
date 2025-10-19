// ---------- FIREBASE IMPORTS ----------
    import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
    import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
    import { getFirestore, doc, setDoc, collection, query, limit, getDocs, orderBy, onSnapshot, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

    // ---------- GLOBAL VARIABLES FOR FIREBASE ----------
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
    let db, auth;
    let currentUserId = null;
    let isAuthReady = false;

    // START NEW CODE: Sample Document Content
    const SAMPLE_DOC_CONTENT = `LOAN AGREEMENT

BY AND BETWEEN
CHURCH LOANS & INVESTMENTS TRUST ("TRUST")
AND
AMARILLO NATIONAL BANK ("BANK")

DATED
DECEMBER 31, 2002

SECTION 1. LOANS
1.1 Bank's Commitment. Bank agrees to make loans to the Trust, at any time or from time to time during the term hereof, in an aggregate principal amount not exceeding at any one time outstanding the sum of $20,000,000.

1.4 Interest. The Notes shall bear interest at a rate equal to 1% per annum less than J.P. Morgan Chase & Co., Inc.'s prime lending rate, adjusted daily.

SECTION 5. COLLATERAL
5.1 Collateral Requirement. The Trust shall deliver and maintain with the Bank, at all times, Qualified Collateral having a Pledge Value equal to at least 110% of the aggregate outstanding principal balance of the Notes.

SECTION 6. AFFIRMATIVE COVENANTS
6.12 Other Indebtedness. The Trust shall not, directly or indirectly, be liable for or assume or guaranty any indebtedness of any person, firm or corporation, other than in connection with the ordinary course of its business of making loans to churches, without the prior written consent of Bank.

SECTION 8. EVENTS OF DEFAULT
8.1 Events of Default. The following shall constitute an Event of Default hereunder: (c) If a final money judgment in excess of $25,000 shall be rendered against the Trust and such judgment shall not be discharged or stayed within sixty (60) days.
`;
    // END NEW CODE

    // ---------- AI Legal Document Analyzer CLASS (Refactored from app.js) ----------
    class LegalDocumentAnalyzer {
        constructor() {
            this.uploadedFiles = [];
            this.selectedFormat = 'Summary'; // Default format
            this.analysisResults = null;
            this.currentTheme = 'light';
            
            // 🚀 GEMINI API KEY INSERTED HERE 🚀
            const apiKey = "AIzaSyDdUieZ7sx9bWD_v6iUd71HYoTQ49dYYuI"; 
            this.apiURL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`; 

            this.init();
        }

        async init() {
            this.initializeTheme();
            await this.initFirebase(); // Initialize Firebase first
        }
        
        // ---------- FIREBASE & AUTH SETUP ----------
        async initFirebase() {
            try {
                const app = initializeApp(firebaseConfig);
                db = getFirestore(app);
                auth = getAuth(app);
                
                // Set Firestore logging level (optional but helpful)
                setLogLevel('debug');

                const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

                if (token) {
                    await signInWithCustomToken(auth, token);
                } else {
                    await signInAnonymously(auth);
                }

                onAuthStateChanged(auth, (user) => {
                    if (user) {
                        currentUserId = user.uid;
                    } else {
                        currentUserId = 'anonymous-' + crypto.randomUUID();
                    }
                    isAuthReady = true;
                    console.log("Firebase Auth State Ready. User ID:", currentUserId);
                    this.setupEventListeners(); // Setup listeners AFTER auth is ready
                    this.updateLoginStatus(user);
                    this.startHistoryListener();
                });

            } catch (error) {
                console.error("Error initializing Firebase:", error);
                currentUserId = 'anonymous-fallback-' + crypto.randomUUID();
                isAuthReady = true;
                this.setupEventListeners();
                this.updateLoginStatus(null);
            }
        }
        
        updateLoginStatus(user) {
            const statusElement = document.getElementById('userStatus');
            if (user) {
                statusElement.innerHTML = `<i class="fas fa-user-check text-green-500 mr-1"></i> Logged in as: <code class="text-xs bg-gray-200 p-1 rounded">${user.uid}</code>`;
            } else {
                statusElement.innerHTML = `<i class="fas fa-user text-yellow-500 mr-1"></i> Anonymous User ID: <code class="text-xs bg-gray-200 p-1 rounded">${currentUserId}</code>`;
            }
        }

        getHistoryCollectionPath() {
            // Private data storage path
            return `artifacts/${appId}/users/${currentUserId}/analysis_history`;
        }

        startHistoryListener() {
            if (!isAuthReady || !db || !currentUserId) return;
            // This is a simple example. Since history isn't rendered, we just log it.
            const historyRef = collection(db, this.getHistoryCollectionPath());
            const q = query(historyRef, orderBy("timestamp", "desc"), limit(5));

            onSnapshot(q, (snapshot) => {
                const history = [];
                snapshot.forEach((doc) => {
                    history.push(doc.data());
                });
                console.log("Analysis History Updated (Last 5):", history);
                // If we had a UI component, we would update it here.
            });
        }
        
        // ---------- EVENT LISTENERS & UI SETUP (FIXED) ----------

        setupEventListeners() {
            // Check if listeners are already set up (to prevent double-binding from onAuthStateChanged)
            if (document.getElementById('analyzeBtn').hasAttribute('data-listeners-set')) return;
            document.getElementById('analyzeBtn').setAttribute('data-listeners-set', 'true');

            document.getElementById('analyzeBtn').addEventListener('click', () => this.startAnalysis());
            document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileChange(e));
            document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
            document.getElementById('downloadBtn').addEventListener('click', () => this.downloadResults());
            document.getElementById('loadSampleBtn').addEventListener('click', () => this.loadSampleDocument());

            document.querySelectorAll('.btn-format').forEach(btn => {
                btn.addEventListener('click', (e) => this.selectFormat(e.target));
            });
            // Initial setting of the active format class
            document.querySelector('.btn-format[data-format="Summary"]').classList.add('bg-indigo-600', 'text-white', 'shadow-md');
            
            // === NEW CHAT MODAL LISTENERS ===
            const chatInput = document.getElementById('chatInput');
            const sendBtn = document.getElementById('sendChatBtn');
            
            // Buttons to open/close the modal
            document.getElementById('openChatBtn').addEventListener('click', () => this.toggleChatModal(true));
            document.getElementById('closeChatBtn').addEventListener('click', () => this.toggleChatModal(false));

            const handleSend = () => {
                const question = chatInput.value.trim();
                if (question) {
                    this.renderChatMessage(question, 'user');
                    // Call the core AI function
                    this.answerQuestion(question); 
                    chatInput.value = ''; // Clear input field
                }
            };

            sendBtn.addEventListener('click', handleSend);
            
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !sendBtn.disabled) {
                    handleSend();
                }
            });
            // ===========================
        }

        selectFormat(button) {
            this.selectedFormat = button.getAttribute('data-format');
            document.querySelectorAll('.btn-format').forEach(btn => {
                btn.classList.remove('bg-indigo-600', 'text-white', 'shadow-md');
                btn.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
            });
            button.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
            button.classList.add('bg-indigo-600', 'text-white', 'shadow-md');
            
            if (this.analysisResults) {
                this.renderResults(this.analysisResults);
            }
        }

        handleFileChange(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.uploadedFiles = [{ name: file.name, content: e.target.result }];
                    this.analysisResults = null;
                    document.getElementById('analyzeBtn').disabled = false;
                    document.getElementById('initialMessage').classList.remove('hidden');
                    document.getElementById('resultsContent').classList.add('hidden');
                    document.getElementById('downloadBtn').classList.add('hidden');
                    
                    // FIX: Enable chat input/button when file is loaded
                    document.getElementById('chatInput').disabled = false;
                    document.getElementById('sendChatBtn').disabled = false;
                    
                    this.updateProgress(0, `Ready to analyze document: ${file.name}`);
                };
                reader.readAsText(file);
            }
        }

        // ---------- CORE ANALYSIS LOGIC (LLM API CALL) ----------
        async startAnalysis() {
            if (this.uploadedFiles.length === 0) {
                this.showNotification('Please upload a document first.', 'warning');
                return;
            }

            document.getElementById('analyzeBtn').disabled = true;
            document.getElementById('errorBox').classList.add('hidden');
            
            const docContent = this.uploadedFiles[0].content;
            const docName = this.uploadedFiles[0].name;
            const docContext = `The user has provided a document named "${docName}" for advanced legal analysis. The document content is below:\n\n---\n\n${docContent}`;

            try {
                // Check for empty API key - Now redundant as key is hardcoded, but good safety check
                const currentApiKey = this.apiURL.split('=')[1]; 
                if (!currentApiKey || currentApiKey === "") {
                     throw new Error("API Key is missing or invalid. Please ensure your Gemini API Key is correctly inserted in the 'LegalDocumentAnalyzer' class.");
                }


                // 1. Progress Step: LLM Call Preparation
                this.updateProgress(20, 'Sending document for AI analysis...');
                
                // 2. LLM Call
                const structuredAnalysis = await this.analyzeDocument(docContext);

                if (!structuredAnalysis) {
                    throw new Error("Analysis failed: LLM returned no structured data.");
                }

                // 3. Progress Step: Processing Results
                this.updateProgress(80, 'Processing AI results and formatting output...');

                this.analysisResults = structuredAnalysis;

                // 4. Save to Firestore (Demonstration of Data Persistence)
                this.saveAnalysisToFirestore(docName, structuredAnalysis);
                
                // 5. Completion
                this.renderResults(structuredAnalysis);
                this.updateProgress(100, 'Analysis Complete!');
                document.getElementById('analyzeBtn').disabled = false;
                document.getElementById('downloadBtn').classList.remove('hidden');
                document.getElementById('downloadBtn').disabled = false;
                this.showNotification('Analysis completed successfully!', 'success');
                
                // NEW: Show the floating chat button
                this.showChatToggleButton(true);

            } catch (error) {
                console.error("Analysis Error:", error);
                document.getElementById('errorMessage').textContent = `Analysis failed: ${error.message}`;
                document.getElementById('errorBox').classList.remove('hidden');
                this.updateProgress(0, 'Error during analysis. Please check console for details.');
                document.getElementById('analyzeBtn').disabled = false;
            }
        }
        
        // This is the core function that calls the Gemini API and enforces structured JSON output.
        async analyzeDocument(docContext) {
            const systemPrompt = `You are ClauseGenie, a highly accurate legal document analysis AI. Your task is to perform three steps:
1. Summarize the provided document into a single, comprehensive paragraph, ensuring you simplify all complex legal terms to be easily understandable (e.g., 6th-grade reading level).
2. Deconstruct the document into its key clauses or sections, extract core content, assess a hypothetical risk level (Low, Medium, or High) for a non-expert, and identify all Named Entities (PERSON, ORGANIZATION, DATE, TERM, JURISDICTION, RISK).
3. Return the entire response as a single, valid JSON object strictly adhering to the provided schema. Do not include any text outside the JSON block.`;

            const userQuery = `Analyze the document based on the system instructions. Focus on the core agreements, parties, dates, and potential risks. \n\nDOCUMENT CONTEXT:\n${docContext}`;

            const payload = {
                contents: [{ parts: [{ text: userQuery }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
                // Enforce JSON output structure
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            summary: {
                                type: "STRING",
                                description: "The simplified, single-paragraph summary of the entire document."
                            },
                            simplification_level: {
                                type: "STRING",
                                description: "The reading level used for simplification (e.g., 'Grade 6')."
                            },
                            analysis_results: {
                                type: "ARRAY",
                                items: {
                                    type: "OBJECT",
                                    properties: {
                                        clause_title: {
                                            type: "STRING",
                                            description: "The title of the clause or section."
                                        },
                                        simplified_content: {
                                            type: "STRING",
                                            description: "A short, simplified explanation of the clause."
                                        },
                                        risk_level: {
                                            type: "STRING",
                                            enum: ["Low", "Medium", "High"],
                                            description: "Hypothetical risk level for a non-expert."
                                        },
                                        entities: {
                                            type: "ARRAY",
                                            items: {
                                                type: "OBJECT",
                                                properties: {
                                                    type: { type: "STRING" },
                                                    name: { type: "STRING" }
                                                }
                                            }
                                        }
                                    },
                                    required: ["clause_title", "simplified_content", "risk_level", "entities"]
                                }
                            }
                        },
                        required: ["summary", "simplification_level", "analysis_results"]
                    }
                }
            };

            const response = await fetch(this.apiURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                // If 403, assume missing/invalid API key
                if (response.status === 403) {
                     throw new Error(`LLM API request failed with status: ${response.status}. The API Key is likely invalid or has usage restrictions. Please verify your key and usage limits.`);
                }
                throw new Error(`LLM API request failed with status: ${response.status}`);
            }

            const result = await response.json();
            const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!jsonText) {
                throw new Error("LLM response was empty or malformed.");
            }

            try {
                const parsedJson = JSON.parse(jsonText);
                return parsedJson;
            } catch (e) {
                console.error("Failed to parse JSON from LLM:", jsonText);
                throw new Error("LLM returned non-parsable JSON structure.");
            }
        }

        // ---------- FIRESTORE PERSISTENCE ----------
        async saveAnalysisToFirestore(docName, results) {
            if (!isAuthReady || !db || !currentUserId) return;
            const docId = Date.now().toString();
            const docRef = doc(db, this.getHistoryCollectionPath(), docId);
            
            try {
                await setDoc(docRef, {
                    documentName: docName,
                    userId: currentUserId,
                    timestamp: docId,
                    summary: results.summary,
                    // Note: Storing only a small part of the results to respect Firestore limits
                    clauseCount: results.analysis_results.length,
                    firstClauseTitle: results.analysis_results[0]?.clause_title || 'N/A'
                });
                console.log("Analysis history saved to Firestore with ID:", docId);
            } catch (e) {
                console.error("Error saving to Firestore:", e);
                this.showNotification(`Could not save history to Firestore. Check console.`, 'error');
            }
        }
        
        // ---------- CHATBOT Q&A LOGIC (MISSING: INSERTED HERE) ----------
        
        // Utility to convert basic markdown (like bold) to HTML for chat display
        markdownToHtml(markdown) {
            // Simple markdown conversion: **bold** to <strong>bold</strong>, \n\n to <p>
            let html = markdown.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html = html.replace(/\n\n/g, '<p>');
            return html;
        }

        // Handles displaying messages in the chat modal
        renderChatMessage(message, sender) {
            const chatHistory = document.getElementById('chatHistory');
            const chatInitialMessage = document.getElementById('chatInitialMessage');
            if (chatInitialMessage) {
                chatInitialMessage.remove();
            }

            const messageDiv = document.createElement('div');
            const isUser = sender === 'user';
            
            messageDiv.className = `flex ${isUser ? 'justify-end' : 'justify-start'}`;
            
            const contentSpan = document.createElement('div');
            contentSpan.className = `max-w-xs sm:max-w-md px-4 py-3 rounded-xl shadow-md text-sm leading-relaxed ${
                isUser 
                    ? 'bg-indigo-500 text-white rounded-br-none' 
                    : 'bg-gray-200 text-gray-800 rounded-tl-none'
            }`;
            contentSpan.innerHTML = isUser ? message : this.markdownToHtml(message);

            messageDiv.appendChild(contentSpan);
            chatHistory.appendChild(messageDiv);
            
            // Auto-scroll to the bottom
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }

        // Core function to send the question and document to the AI
        async answerQuestion(question) {
            const chatInput = document.getElementById('chatInput');
            const sendBtn = document.getElementById('sendChatBtn');
            const chatStatus = document.getElementById('chatStatus');

            if (!this.analysisResults || this.uploadedFiles.length === 0) {
                this.renderChatMessage("Please complete the document analysis first before asking questions.", 'ai');
                return;
            }

            const docContent = this.uploadedFiles[0].content;
            
            // Disable input while AI is thinking
            chatInput.disabled = true;
            sendBtn.disabled = true;
            chatStatus.classList.remove('hidden');

            try {
                const systemPrompt = `You are a legal document question-answering AI. Your goal is to answer the user's question accurately using ONLY the provided document content. 
If the information is not explicitly found in the document, you MUST respond with "The document does not contain information regarding this topic." 
Do not use outside knowledge. Do not summarize the entire document. Answer clearly and concisely.`;

                const userQuery = `DOCUMENT CONTENT:\n---\n${docContent}\n---\nUSER QUESTION: ${question}`;

                const payload = {
                    contents: [{ parts: [{ text: userQuery }] }],
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    generationConfig: {
                         temperature: 0.1 // Low temperature for factual, grounded answers
                    }
                };

                const response = await fetch(this.apiURL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`LLM API request failed with status: ${response.status}`);
                }

                const result = await response.json();
                const aiResponseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process that question right now.";
                
                this.renderChatMessage(aiResponseText, 'ai');

            } catch (error) {
                console.error("Chat Q&A Error:", error);
                this.renderChatMessage(`An error occurred while fetching the answer: ${error.message}`, 'ai');
            } finally {
                // Re-enable input
                chatInput.disabled = false;
                sendBtn.disabled = false;
                chatStatus.classList.add('hidden');
                chatInput.focus();
            }
        }

        // ---------- RESULT RENDERING ----------
        renderResults(results) {
            const contentDiv = document.getElementById('resultsContent');
            contentDiv.innerHTML = '';
            document.getElementById('initialMessage').classList.add('hidden');
            contentDiv.classList.remove('hidden');

            const clauses = results.analysis_results || [];

            // 1. Always show the Summary at the top
            let html = `
                <div class="mb-6 pb-4 border-b border-gray-200">
                    <h3 class="text-xl font-bold text-indigo-700 mb-2">Simplified Summary (${results.simplification_level})</h3>
                    <p class="text-gray-700 leading-relaxed">${results.summary}</p>
                </div>`;

            // 2. Render content based on the selected format
            switch (this.selectedFormat) {
                case 'NER':
                    html += this.renderNER(clauses);
                    break;
                case 'Table':
                    html += this.renderTable(clauses);
                    break;
                case 'Summary':
                default:
                    html += this.renderSummary(clauses);
            }
            
            contentDiv.innerHTML += html;
        }

        renderSummary(clauses) {
            let html = `
                <h3 class="text-xl font-bold text-indigo-700 mb-4">Detailed Simplification</h3>
                <ol class="list-decimal pl-5 space-y-4 text-gray-700">`;
            clauses.forEach(c => {
                const riskColor = c.risk_level === 'High' ? 'text-red-600' : c.risk_level === 'Medium' ? 'text-yellow-600' : 'text-emerald-600';
                html += `
                    <li class="font-semibold text-gray-900 mt-4">
                        ${c.clause_title}
                        <div class="font-normal text-gray-700 mt-1">
                            ${c.simplified_content}<br>
                            <em class="text-sm">Hypothetical Risk: <span class="${riskColor} font-bold">${c.risk_level}</span></em>
                        </div>
                    </li>`;
            });
            html += '</ol>';
            return html;
        }

        renderNER(clauses) {
            let html = `
                <h3 class="text-xl font-bold text-indigo-700 mb-4">Named Entity Recognition (NER)</h3>
                <div class="space-y-4">`;
            clauses.forEach(c => {
                const entities = c.entities.map(e => `<span class="inline-block px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800 mr-2 mb-1">${e.name} <span class="text-gray-500">(${e.type})</span></span>`).join('');
                html += `
                    <div class="p-3 border rounded-lg bg-white shadow-sm">
                        <p class="font-semibold text-gray-900 mb-1">${c.clause_title}</p>
                        <p class="text-sm text-gray-600">${c.simplified_content}</p>
                        <div class="mt-2 pt-2 border-t border-gray-100">
                            ${entities || '<p class="text-xs text-gray-400">No specific entities found.</p>'}
                        </div>
                    </div>`;
            });
            html += '</div>';
            return html;
        }

        renderTable(clauses) {
            let html = `
                <h3 class="text-xl font-bold text-indigo-700 mb-4">Risk & Clause Table Format</h3>
                <div class="overflow-x-auto rounded-lg shadow-md">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clause Title</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Simplified Content</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">`;
            
            clauses.forEach(c => {
                const riskColor = c.risk_level === 'High' ? 'bg-red-100 text-red-800' : c.risk_level === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-emerald-100 text-emerald-800';
                html += `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">${c.clause_title}</td>
                        <td class="px-6 py-4 text-sm text-gray-600">${c.simplified_content}</td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${riskColor}">
                                ${c.risk_level}
                            </span>
                        </td>
                    </tr>`;
            });
            
            html += `
                    </tbody>
                </table>
                </div>`;
            return html;
        }
        
        // ---------- UTILITIES ----------
        updateProgress(percent, text) {
            document.getElementById('progressFill').style.width = `${percent}%`;
            document.getElementById('statusText').textContent = text;
        }

        showNotification(msg, type = 'info') {
            const bgColor = type === 'success' ? 'bg-green-500' : type === 'warning' ? 'bg-yellow-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
            const alert = document.createElement('div');
            alert.className = `fixed top-4 right-4 z-50 p-4 rounded-lg text-white font-semibold shadow-xl transition-transform transform translate-x-full opacity-0 ${bgColor}`;
            alert.innerHTML = msg;
            
            document.body.appendChild(alert);
            
            // Animate in
            setTimeout(() => {
                alert.classList.remove('translate-x-full', 'opacity-0');
                alert.classList.add('translate-x-0', 'opacity-100');
            }, 10);

            // Animate out and remove
            setTimeout(() => {
                alert.classList.remove('translate-x-0', 'opacity-100');
                alert.classList.add('translate-x-full', 'opacity-0');
                setTimeout(() => alert.remove(), 500);
            }, 4000);
        }
        
        // START NEW CODE: Load Sample Document Method
        loadSampleDocument() {
            if (!SAMPLE_DOC_CONTENT) {
                this.showNotification('Sample document content is not defined.', 'error');
                return;
            }

            document.getElementById('fileInput').value = '';

            this.uploadedFiles = [{ 
                name: "Church_loans_Sample.txt", 
                content: SAMPLE_DOC_CONTENT 
            }];
            this.analysisResults = null;

            document.getElementById('analyzeBtn').disabled = false;
            document.getElementById('initialMessage').classList.remove('hidden');
            document.getElementById('resultsContent').classList.add('hidden');
            document.getElementById('downloadBtn').classList.add('hidden');
            
            this.updateProgress(0, `Ready to analyze sample document: Church_loans_Sample.txt`);
            
            // FIX: Enable chat input/button when sample is loaded
            document.getElementById('chatInput').disabled = false;
            document.getElementById('sendChatBtn').disabled = false;
            
            this.showNotification('Sample Loan Agreement loaded successfully!', 'info');
        }
        // END NEW CODE

        // FIND AND REPLACE resetAnalysis() WITH THIS:

        resetAnalysis() {
            this.uploadedFiles = [];
            this.analysisResults = null;
            document.getElementById('fileInput').value = '';
            document.getElementById('analyzeBtn').disabled = true;
            document.getElementById('downloadBtn').classList.add('hidden');
            document.getElementById('errorBox').classList.add('hidden');
            document.getElementById('initialMessage').classList.remove('hidden');
            document.getElementById('resultsContent').classList.add('hidden');
            this.updateProgress(0, 'Ready to analyze. Upload a new document.');
            
            // NEW RESET LOGIC FOR CHAT MODAL
            this.showChatToggleButton(false);
            this.toggleChatModal(false); 
            document.getElementById('chatInput').disabled = true;
            document.getElementById('sendChatBtn').disabled = true;

            this.showNotification('Analysis panel reset.', 'info');
        }

        downloadResults() {
            if (!this.analysisResults) {
                this.showNotification('No results to download.', 'warning');
                return;
            }
            const blob = new Blob([JSON.stringify(this.analysisResults, null, 2)], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `ClauseGenie_Analysis_${Date.now()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            this.showNotification('Analysis results downloaded!', 'success');
        }

        // NEW: Modal Toggle Functions
        toggleChatModal(show) {
            const modal = document.getElementById('chatModal');
            const openBtn = document.getElementById('openChatBtn');
            const shouldShow = show !== undefined ? show : modal.classList.contains('translate-x-full');

            if (shouldShow) {
                // Show modal
                modal.classList.remove('translate-x-full');
                modal.classList.add('translate-x-0');
                // Hide floating button
                openBtn.classList.add('scale-0', 'opacity-0');
            } else {
                // Hide modal
                modal.classList.remove('translate-x-0');
                modal.classList.add('translate-x-full');
                // Show floating button (if results exist)
                if (this.analysisResults) {
                     openBtn.classList.remove('scale-0', 'opacity-0');
                     openBtn.classList.add('scale-100', 'opacity-100');
                }
            }
        }
        
        showChatToggleButton(show) {
             const openBtn = document.getElementById('openChatBtn');
             if (show) {
                 openBtn.classList.remove('scale-0', 'opacity-0');
                 openBtn.classList.add('scale-100', 'opacity-100');
             } else {
                 openBtn.classList.remove('scale-100', 'opacity-100');
                 openBtn.classList.add('scale-0', 'opacity-0');
             }
        }

        initializeTheme() {
            const savedTheme = localStorage.getItem('theme') || 'light';
            this.currentTheme = savedTheme;
            this.applyTheme(savedTheme);
        }

        applyTheme(theme) {
            const body = document.body;
            const themeIcon = document.getElementById('themeIcon');
            const controlPanel = document.getElementById('controlPanel');
            const header = document.querySelector('header');
            const resultsContainer = document.getElementById('analysisResultsContainer');

            if (theme === 'dark') {
                body.classList.remove('bg-gray-100', 'text-gray-900');
                body.classList.add('bg-gray-900', 'text-gray-100');
                themeIcon.classList.replace('fa-moon', 'fa-sun');
                themeIcon.classList.replace('text-gray-600', 'text-yellow-400');
                
                header.classList.remove('bg-white');
                header.classList.add('bg-gray-800');

                controlPanel.classList.remove('bg-white');
                controlPanel.classList.add('bg-gray-800');
                
                resultsContainer.classList.remove('bg-gray-50', 'border-gray-200');
                resultsContainer.classList.add('bg-gray-800', 'border-gray-700');

            } else {
                body.classList.remove('bg-gray-900', 'text-gray-100');
                body.classList.add('bg-gray-100', 'text-gray-900');
                themeIcon.classList.replace('fa-sun', 'fa-moon');
                themeIcon.classList.replace('text-yellow-400', 'text-gray-600');
                
                header.classList.remove('bg-gray-800');
                header.classList.add('bg-white');

                controlPanel.classList.remove('bg-gray-800');
                controlPanel.classList.add('bg-white');
                
                resultsContainer.classList.remove('bg-gray-800', 'border-gray-700');
                resultsContainer.classList.add('bg-gray-50', 'border-gray-200');
            }
            localStorage.setItem('theme', theme);
            this.currentTheme = theme;
        }

        toggleTheme() {
            const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
            this.applyTheme(newTheme);
        }
    }

    // Initialize the application once Firebase Auth is ready
    window.analyzer = new LegalDocumentAnalyzer();
    
    // Custom utility classes used in HTML (Bootstrap replacements)
    document.addEventListener('DOMContentLoaded', () => {
        // Apply modal transition logic
        const helpModal = document.getElementById('helpModal');
        const helpModalContent = document.getElementById('helpModalContent');

        // Function to show modal with animation
        const showModal = () => {
            helpModal.classList.remove('hidden');
            setTimeout(() => {
                helpModal.classList.remove('opacity-0');
                helpModalContent.classList.remove('scale-95', 'opacity-0');
                helpModalContent.classList.add('scale-100', 'opacity-100');
            }, 10);
        };

        // Function to hide modal with animation
        const hideModal = () => {
            helpModalContent.classList.remove('scale-100', 'opacity-100');
            helpModalContent.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                helpModal.classList.add('hidden');
                helpModal.classList.add('opacity-0');
            }, 300); // Wait for transition
        };

        // Rebind the help button to use the new logic
        document.querySelector('button[onclick*="helpModal"]').onclick = showModal;

        // Rebind the close button
        document.querySelector('#helpModal button.absolute').onclick = hideModal;
        
        // Handle backdrop click
        helpModal.onclick = (event) => {
            if (event.target.id === 'helpModal') {
                hideModal();
            }
        };

        // Initial setup of button styles
        document.querySelectorAll('.btn-format').forEach(btn => {
            if (!btn.classList.contains('active')) {
                btn.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
            } else {
                 btn.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
                 btn.classList.add('bg-indigo-600', 'text-white', 'shadow-md');
            }
            btn.classList.add('w-full', 'py-2', 'rounded-lg', 'font-semibold', 'transition-colors', 'duration-200');
        });
    });
