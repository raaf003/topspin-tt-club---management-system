import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { downloadLocalStorageData } from '../downloadLocalStorageScript';
import { Download, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

export const DebugExport: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const navigate = useNavigate();
  const STORAGE_KEY = 'smashtrack_data_v1';

  const triggerDownload = () => {
    const success = downloadLocalStorageData(STORAGE_KEY);
    setStatus(success ? 'success' : 'error');
  };

  useEffect(() => {
    // Auto trigger on mount
    triggerDownload();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className={`p-6 rounded-full mb-6 ${
        status === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 
        status === 'error' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600' : 
        'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600'
      }`}>
        {status === 'success' ? <CheckCircle className="w-12 h-12" /> : 
         status === 'error' ? <AlertCircle className="w-12 h-12" /> : 
         <Download className="w-12 h-12 animate-bounce" />}
      </div>

      <h1 className="text-2xl font-black dark:text-white mb-2 italic">
        {status === 'success' ? 'Export Successful!' : 
         status === 'error' ? 'Export Failed' : 
         'Exporting Data...'}
      </h1>
      
      <p className="text-gray-500 dark:text-slate-400 max-w-xs mx-auto mb-8 font-medium">
        {status === 'success' ? 'Your club data file has been generated and downloaded.' : 
         status === 'error' ? 'Could not find any data to export. Make sure you have recorded some activities first.' : 
         'Preparing your JSON backup file from local storage.'}
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {status !== 'success' && (
          <button 
            onClick={triggerDownload}
            className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
          >
            Retry Download
          </button>
        )}
        <button 
          onClick={() => navigate('/')}
          className="w-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 py-3 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </div>
    </div>
  );
};
