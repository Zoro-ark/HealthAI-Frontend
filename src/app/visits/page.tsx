// src/app/visits/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import Link from 'next/link';

// Interface for the visit data structure
interface Ingest {
    _id: string;
    ingest_id: string;
    type: string;
    original_filename: string;
    upload_timestamp: string; // Dates will be strings from JSON
    // Add other ingest fields if needed
}

interface Visit {
    _id: string; // MongoDB ObjectId
    visit_timestamp: string; // Dates will be strings from JSON
    chief_complaint: string;
    status: string;
    ingests: Ingest[];
    createdAt: string;
     updatedAt: string;
     // Add other visit fields if needed
}


export default function VisitsPage() {
  const router = useRouter();
  const { user, isSignedIn, isLoaded } = useUser();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  useEffect(() => {
    const checkStatusAndFetchVisits = async () => {
      if (!isLoaded) return; // Wait for Clerk to load

      if (!isSignedIn) {
        // Although Clerk middleware might handle this, double-check
        router.push('/sign-in'); // Redirect to sign-in if not signed in
        return;
      }

      setLoading(true);
      setError(null);

       try {
            // Get Clerk token
             const token = user.id // INSECURE: Use await user.getToken();
             // const token = await user.getToken();

             //Check verification status
            const statusRes = await fetch('http://localhost:5001/api/user/status', {
                 headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!statusRes.ok) {
                 throw new Error('Failed to fetch verification status');
            }
            const statusData = await statusRes.json();

            if (!statusData.isVerified) {
                 setIsVerified(false);
                 router.push('/verification'); // Redirect if not verified
                 return; // Stop further execution
            }
             setIsVerified(true);


       
            const visitsRes = await fetch('http://localhost:5001/api/visits', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!visitsRes.ok) {
                throw new Error('Failed to fetch visits');
            }
            const visitsData: Visit[] = await visitsRes.json();
            setVisits(visitsData);

       } catch (err: any) {
            console.error(err);
            setError(err.message || 'An error occurred.');
            setIsVerified(false); // Assume error means not verified or issue fetching
       } finally {
            setLoading(false);
       }
    };

    checkStatusAndFetchVisits();
  }, [isSignedIn, isLoaded, user, router]); // Add user and router dependencies

   // --- Render States ---
   if (!isLoaded || loading) {
    return <div className="p-6">Loading visits...</div>;
  }

   // This case should ideally be handled by redirection, but as a fallback:
   if (!isSignedIn) {
       return (
           <div className="p-6 text-center">
               <p className="mb-4">Please sign in to view your visits.</p>
               <SignInButton mode="redirect">
                   <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                       Sign In
                   </button>
               </SignInButton>
           </div>
       );
   }

  // If checkStatusAndFetchVisits is still running, isVerified might be null
   if (isVerified === null) {
       return <div className="p-6">Checking verification status...</div>;
   }

   // If redirected to /verification, this component might unmount before rendering further


  if (error) {
    return <div className="p-6 text-red-500">Error: {error}</div>;
  }


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white-900">Your Visits</h1>
        <Link href="/visits/new">
          <button className="px-5 py-2 bg-green-600 text-white rounded-md font-semibold hover:bg-green-700 transition shadow">
            + Request New Visit
          </button>
        </Link>
      </div>

      {visits.length === 0 ? (
        <p className="text-gray-600">You haven't requested any visits yet.</p>
      ) : (
        <div className="space-y-4">
          {visits.map((visit) => (
            <div key={visit._id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="flex justify-between items-start mb-2">
                    <div>
                         <h2 className="text-xl font-semibold text-gray-800">
                            Visit on {new Date(visit.visit_timestamp).toLocaleDateString()}
                         </h2>
                        <p className="text-sm text-gray-500">
                            Requested on: {new Date(visit.createdAt).toLocaleString()}
                        </p>
                     </div>
                   <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                         visit.status === 'completed' ? 'bg-green-100 text-green-800' :
                         visit.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                         visit.status === 'requested' ? 'bg-yellow-100 text-yellow-800' :
                         'bg-blue-100 text-blue-800' // in_progress or default
                     }`}>
                       {visit.status.replace('_', ' ').toUpperCase()}
                   </span>
               </div>
              <p className="text-gray-700 mb-3">
                <span className="font-medium">Chief Complaint:</span> {visit.chief_complaint || 'N/A'}
              </p>
                {visit.ingests && visit.ingests.length > 0 && (
                     <div>
                        <h3 className="text-md font-medium text-gray-700 mb-1">Documents Uploaded:</h3>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                            {visit.ingests.map(ingest => (
                                <li key={ingest._id || ingest.ingest_id}>
                                     {ingest.original_filename} ({ingest.type}) - Uploaded on {new Date(ingest.upload_timestamp).toLocaleDateString()}
                                     {/* In real app, add link to download/view from S3 */}
                                </li>
                            ))}
                        </ul>
                    </div>
               )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
