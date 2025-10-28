// src/app/visits/new/page.tsx
'use client';

import { useState, FormEvent, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

type DocumentType = "prescription" | "lab_report" | "imaging" | "clinical_notes";

interface FileWithType {
    file: File;
    type: DocumentType;
}

export default function NewVisitPage() {
  const router = useRouter();
  const { user, isSignedIn, isLoaded } = useUser();
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [files, setFiles] = useState<FileWithType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

    // Check verification status on load
   useEffect(() => {
    const checkStatus = async () => {
         if (!isLoaded || !isSignedIn || !user) return;
         try {
            const token = user.id // INSECURE: Use await user.getToken();
            const statusRes = await fetch('http://localhost:5001/api/user/status', {
                 headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!statusRes.ok) throw new Error('Failed status check');
            const statusData = await statusRes.json();
             if (!statusData.isVerified) {
                router.push('/verification'); // Redirect if not verified
            } else {
                 setIsVerified(true);
            }
         } catch (err) {
             console.error(err);
             setError("Could not verify user status. Please try again.");
             // Optionally redirect to sign-in or home
         }
    };
    checkStatus();
  }, [isLoaded, isSignedIn, user, router]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles: FileWithType[] = Array.from(e.target.files).map(file => ({
          file: file,
          type: 'clinical_notes' // Default type, user will change this
      }));
      // Basic check for max files (matching backend)
      // max files is also in server.js (backend)
       if (files.length + newFiles.length > 5) {
           setError("You can upload a maximum of 5 files.");
           // Clear the file input
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
           return;
       }
      setFiles(prevFiles => [...prevFiles, ...newFiles]);
       // Clear the file input after selection to allow selecting the same file again if removed
       if (fileInputRef.current) {
           fileInputRef.current.value = "";
       }
    }
  };

   const handleFileTypeChange = (index: number, type: DocumentType) => { // type is for eg: clinical_notes
       setFiles(prevFiles => {
           const updatedFiles = [...prevFiles];
           updatedFiles[index].type = type;
           return updatedFiles;
       });
   };

    const removeFile = (index: number) => {
        setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isSignedIn || !user || !isVerified) {
         setError("You must be signed in and verified to submit a visit request.");
         return;
    }
     if (!chiefComplaint.trim()) {
        setError("Please enter the chief complaint.");
        return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('chief_complaint', chiefComplaint);
    
    // Add visit_type and a selector for it
    // formData.append('visit_type', selectedVisitType);

     // Create the document type map
     const documentTypeMap: { [key: string]: DocumentType } = {};
    files.forEach((fileWithType) => {
       formData.append('medicalDocs', fileWithType.file, fileWithType.file.name); // upload.array with key medicalDocs : server.js
       documentTypeMap[fileWithType.file.name] = fileWithType.type;
    });
    formData.append('documentTypeMap', JSON.stringify(documentTypeMap));


    try {
       const token = user.id // INSECURE: Use await user.getToken();
       // const token = await user.getToken();

      const response = await fetch('http://localhost:5001/api/visits', {
        method: 'POST',
        headers: {
          // 'Content-Type': 'multipart/form-data' is set automatically by browser w/ FormData
           'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit visit request');
      }

      // Redirect to visits page upon successful submission
      router.push('/visits');

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during submission.');
    } finally {
      setLoading(false);
    }
  };

  // Render loading/unverified states
   if (!isLoaded || isVerified === null) {
        return <div className="p-6">Loading...</div>;
   }
   if (!isSignedIn) {
       // Should be redirected by Clerk middleware ideally
       return <div className="p-6">Please sign in.</div>;
   }
   // If isVerified is false, user should have been redirected

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-white-900 mb-6">Request A Visit</h1>
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow-md border border-gray-200">
         {error && <p className="text-red-500 text-sm text-center bg-red-100 p-3 rounded">{error}</p>}

        <div>
          <label htmlFor="chiefComplaint" className="block text-sm font-medium text-gray-700 mb-1">
            Chief Complaint <span className="text-red-500">*</span>
          </label>
          <textarea
            id="chiefComplaint"
            name="chiefComplaint"
            rows={4}
            required
            className="text-black appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Describe the main reason for your visit..."
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload Medical Documents (Optional, Max 5 files)
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              {/* Icon can go here */}
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                >
                  <span>Upload files</span>
                  <input id="file-upload" name="medicalDocs" type="file" className="sr-only" multiple onChange={handleFileChange} ref={fileInputRef} accept="image/*,application/pdf,.doc,.docx" />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, PDF, DOCX up to 10MB each</p>
            </div>
          </div>
        </div>

         {/* Display selected files */}
        {files.length > 0 && (
            <div className="space-y-3">
                 <h3 className="text-md font-medium text-gray-700">Selected Files:</h3>
                 {files.map((fileWithType, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border border-gray-200 rounded-md bg-gray-50">
                         <span className="text-sm text-gray-800 truncate pr-2">{fileWithType.file.name} ({(fileWithType.file.size / 1024 / 1024).toFixed(2)} MB)</span>
                        <div className="flex items-center space-x-2">
                            <select
                                value={fileWithType.type}
                                onChange={(e) => handleFileTypeChange(index, e.target.value as DocumentType)}
                                className="text-xs text-black border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                 <option value="clinical_notes">Clinical Notes</option>
                                <option value="prescription">Prescription</option>
                                <option value="lab_report">Lab Report</option>
                                <option value="imaging">Imaging</option>
                             </select>
                            <button
                                type="button"
                                onClick={() => removeFile(index)}
                                className="text-red-500 hover:text-red-700 text-xs font-semibold"
                             >
                                Remove
                             </button>
                        </div>
                     </div>
                 ))}
            </div>
        )}


        <div className="pt-5">
          <div className="flex justify-end">
            <button
              type="button"
               onClick={() => router.push('/visits')} // Go back to visits list
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isVerified}
              className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}