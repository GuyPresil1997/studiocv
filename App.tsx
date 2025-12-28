import React, { useState, useEffect, useCallback } from 'react';
import { Layout, FileText, Download, Upload, Wand2, Menu, X, CloudUpload, FileType, Palette, Columns, AlignCenter, Undo, Redo, RotateCcw, FileDown } from 'lucide-react';
import { ResumeData, AppView, TemplateId, ThemeColor } from './types';
import { INITIAL_RESUME, SAMPLE_RESUME_TEXT } from './constants';
import { enhanceResumeWithAI, enhanceResumeFromFile } from './services/geminiService';
import { exportToDocx } from './services/docxService';
import { ResumeForm } from './components/ResumeForm';
import { ResumePreview } from './components/ResumePreview';

// Custom Hook for History Management
function useHistory<T>(initialState: T) {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // The current state is derived from the history at the current index
  const state = history[currentIndex];

  const setState = useCallback((newState: T) => {
    // If the new state is identical to current, don't push to history (performance & UX optimization)
    // We use a simple JSON stringify check here as ResumeData is relatively small JSON
    setHistory(prev => {
      const current = prev[currentIndex];
      if (JSON.stringify(current) === JSON.stringify(newState)) return prev;

      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(newState);
      return newHistory;
    });
    setCurrentIndex(prev => {
      // We need to calculate the new index based on the *new* history length derived above
      // But since setState is async, we can't trust 'prev' inside setHistory immediately here locally.
      // However, simplified logic: we know we are pushing 1 item.
      // To be safe and sync, we can just increment relative to the slice we know we made.
      // Actually, relying on the setter logic above:
      return prev + 1; // This assumes the push happened. 
      // Correct React pattern for dependent states is tricky. 
      // Let's optimize: We'll do it in one setHistory call if possible or just use a robust logic.
    });
  }, [currentIndex]);
  
  // Refined setState to ensure sync
  const updateState = (newState: T) => {
    const current = history[currentIndex];
    if (JSON.stringify(current) === JSON.stringify(newState)) return;

    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  };

  const undo = useCallback(() => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : prev));
  }, []);

  const redo = useCallback(() => {
    setCurrentIndex(prev => (prev < history.length - 1 ? prev + 1 : prev));
  }, [history.length]);

  return {
    state,
    setState: updateState,
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    history
  };
}

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.RESUME);
  
  // Use custom history hook instead of simple useState
  const { 
    state: resumeData, 
    setState: setResumeData, 
    undo, 
    redo, 
    canUndo, 
    canRedo 
  } = useHistory<ResumeData>(INITIAL_RESUME);

  const [template, setTemplate] = useState<TemplateId>('modern');
  const [themeColor, setThemeColor] = useState<ThemeColor>('blue');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [importMode, setImportMode] = useState<'file' | 'text'>('file');
  const [rawText, setRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'Z' && e.shiftKey))) {
        // Support Ctrl+Y for Redo on Windows/Linux
        e.preventDefault();
        if (canRedo) redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleEnhance = async () => {
    setIsEnhancing(true);
    try {
      let enhancedData: ResumeData;

      if (importMode === 'text') {
        if (!rawText.trim()) return;
        enhancedData = await enhanceResumeWithAI(rawText);
      } else {
        if (!selectedFile) return;

        // Validation for supported MIME types
        const supportedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
        if (!supportedTypes.includes(selectedFile.type)) {
          alert(`Unsupported file type: ${selectedFile.type}. Please upload a PDF, PNG, or JPG file.`);
          setIsEnhancing(false);
          return;
        }
        
        // Convert file to base64
        const reader = new FileReader();
        const base64Promise = new Promise<{data: string, type: string}>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            resolve({ data: base64Data, type: selectedFile.type });
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(selectedFile);
        
        const { data, type } = await base64Promise;
        enhancedData = await enhanceResumeFromFile(data, type);
      }

      setResumeData(enhancedData);
      setShowUploadModal(false);
      setRawText('');
      setSelectedFile(null);
    } catch (error) {
      console.error(error);
      alert("Failed to enhance resume. Please check your file/text and try again.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleExportPdf = () => {
    window.print();
  };

  const handleExportDocx = () => {
    exportToDocx(resumeData);
  };

  const NavItem = ({ v, icon: Icon, label }: { v: AppView; icon: any; label: string }) => (
    <button 
      onClick={() => { setView(v); setShowMobileMenu(false); }}
      className={`flex items-center gap-3 w-full p-3 rounded-lg transition-colors ${view === v ? 'bg-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  const ColorButton = ({ color, bgClass }: { color: ThemeColor, bgClass: string }) => (
    <button
      onClick={() => setThemeColor(color)}
      className={`w-6 h-6 rounded-full ${bgClass} transition-all ${themeColor === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-110'}`}
      title={`Set theme to ${color}`}
    />
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-full p-4 no-print">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
            <Layout size={20} />
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">ResumAI Studio</h1>
        </div>
        
        <nav className="space-y-2 flex-1">
          <NavItem v={AppView.RESUME} icon={FileText} label="Resume Editor" />
        </nav>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b z-20 flex items-center justify-between px-4 no-print">
         <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
            <Layout size={20} />
          </div>
          <h1 className="text-lg font-bold text-slate-800">ResumAI</h1>
        </div>
        <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="p-2">
          {showMobileMenu ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 bg-white z-10 pt-20 px-4 space-y-2">
          <NavItem v={AppView.RESUME} icon={FileText} label="Resume Editor" />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative pt-16 md:pt-0">
        
        {/* Toolbar (Only for Resume View) */}
        {view === AppView.RESUME && (
          <div className="h-16 border-b bg-white flex items-center justify-between px-6 no-print">
            
            <div className="flex items-center gap-4">
              {/* Template Selector */}
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => setTemplate('modern')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${template === 'modern' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Modern Layout"
                >
                  <Palette size={16} />
                  <span className="hidden lg:inline">Modern</span>
                </button>
                <button 
                  onClick={() => setTemplate('compact')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${template === 'compact' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Compact One-Page Layout"
                >
                  <Columns size={16} />
                  <span className="hidden lg:inline">Compact</span>
                </button>
                <button 
                  onClick={() => setTemplate('classic')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${template === 'classic' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Classic Layout"
                >
                  <AlignCenter size={16} />
                  <span className="hidden lg:inline">Classic</span>
                </button>
              </div>
              
              <div className="w-px h-6 bg-slate-200" />

              {/* Color Picker */}
              <div className="flex items-center gap-2">
                <ColorButton color="blue" bgClass="bg-blue-600" />
                <ColorButton color="green" bgClass="bg-emerald-600" />
                <ColorButton color="purple" bgClass="bg-violet-600" />
                <ColorButton color="red" bgClass="bg-rose-600" />
                <ColorButton color="orange" bgClass="bg-amber-600" />
                <ColorButton color="slate" bgClass="bg-slate-700" />
              </div>

              <div className="w-px h-6 bg-slate-200" />

              {/* Undo/Redo Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo size={16} />
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  title="Redo (Ctrl+Shift+Z)"
                >
                  <Redo size={16} />
                </button>
              </div>
            </div>

            <div className="flex gap-2 ml-auto">
              <button 
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                title="Import Resume"
              >
                <Upload size={18} />
                <span className="hidden lg:inline">Import</span>
              </button>
              
              <div className="h-6 w-px bg-slate-300 mx-1 self-center"></div>

              <button 
                onClick={handleExportDocx}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                title="Export as Word Document"
              >
                <FileDown size={18} />
                <span className="hidden lg:inline">Word</span>
              </button>
              
              <button 
                onClick={handleExportPdf}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                title="Export as PDF"
              >
                <Download size={18} />
                <span className="hidden lg:inline">PDF</span>
              </button>
            </div>
          </div>
        )}

        <div className="h-full overflow-hidden bg-slate-100/50 p-4 md:p-6 relative">
          
          {view === AppView.RESUME && (
            <div className="flex flex-col lg:flex-row gap-6 h-full max-w-7xl mx-auto">
              {/* Editor Pane */}
              <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-y-auto no-print h-full lg:max-w-md">
                <ResumeForm data={resumeData} onChange={setResumeData} />
              </div>
              
              {/* Preview Pane */}
              <div className="flex-1 bg-slate-200/50 rounded-xl border border-slate-200/60 overflow-y-auto flex justify-center p-8 h-full">
                <ResumePreview data={resumeData} template={template} themeColor={themeColor} />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Import Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 no-print backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Import Resume</h3>
                <p className="text-sm text-slate-500">Upload a file or paste text to auto-generate your resume</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b">
              <button 
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${importMode === 'file' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-slate-500 hover:bg-slate-50'}`}
                onClick={() => setImportMode('file')}
              >
                <CloudUpload size={18} /> Upload File
              </button>
              <button 
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${importMode === 'text' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-slate-500 hover:bg-slate-50'}`}
                onClick={() => setImportMode('text')}
              >
                <FileText size={18} /> Paste Text
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex-1 overflow-y-auto">
              
              {importMode === 'file' ? (
                <div className="h-full flex flex-col">
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex-1 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative min-h-[200px]">
                    <input 
                      type="file" 
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={handleFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    
                    {selectedFile ? (
                      <div className="flex flex-col items-center animate-in fade-in zoom-in duration-200">
                        <div className="w-16 h-16 bg-blue-100 text-primary rounded-full flex items-center justify-center mb-4">
                          <FileType size={32} />
                        </div>
                        <p className="text-lg font-semibold text-slate-800 mb-1">{selectedFile.name}</p>
                        <p className="text-sm text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                          }}
                          className="mt-4 text-sm text-red-500 hover:text-red-600 font-medium"
                        >
                          Remove File
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center pointer-events-none">
                        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                          <CloudUpload size={32} />
                        </div>
                        <p className="text-lg font-semibold text-slate-700 mb-1">Click or Drag to Upload</p>
                        <p className="text-sm text-slate-500">Supports PDF, Images (PNG, JPG)</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  <textarea 
                    className="w-full flex-1 p-4 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm min-h-[200px]"
                    placeholder="Paste your existing resume text here..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                  />
                  <div className="flex justify-end mt-2">
                    <button 
                      onClick={() => setRawText(SAMPLE_RESUME_TEXT)}
                      className="text-xs text-primary hover:underline"
                    >
                      Load Sample Text
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-slate-50 flex justify-end">
              <button 
                onClick={handleEnhance}
                disabled={isEnhancing || (importMode === 'text' ? !rawText.trim() : !selectedFile)}
                className="bg-primary hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all"
              >
                {isEnhancing ? <Wand2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
                <span>Enhance with AI</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global styles for Input Fields to keep code clean */}
      <style>{`
        .input-field {
          width: 100%;
          padding: 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid #e2e8f0;
          background-color: #f8fafc;
          transition: all 0.2s;
          outline: none;
        }
        .input-field:focus {
          background-color: #fff;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
      `}</style>
    </div>
  );
};

export default App;