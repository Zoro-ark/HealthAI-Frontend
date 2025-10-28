// src/app/verification/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

export default function VerificationPage() {
  const router = useRouter();
  const { user, isSignedIn, isLoaded } = useUser();
  const [formData, setFormData] = useState({
    name: user?.fullName || '',
    age: '',
    budget: '',
    availabilityDays: '',
    visaStatus: 'indian_citizen', // Default value
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!isSignedIn || !user) {
         setError("You must be signed in to verify.");
         setLoading(false);
         return;
    }

    // Basic client-side validation
    if (!formData.name || !formData.age || !formData.budget || !formData.availabilityDays || !formData.visaStatus) {
        setError("Please fill in all fields.");
        setLoading(false);
        return;
    }

    try {
      // IMPORTANT: Get Clerk token for secure backend communication
       const token = user.id // INSECURE: Replace with await user.getToken() in a real app after setting up Clerk backend SDK properly
      // const token = await user.getToken(); // Use this in production

      const response = await fetch('http://localhost:5001/api/user/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Send token/ID
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      // Redirect to visits page upon successful verification
      router.push('/visits');

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during verification.');
    } finally {
      setLoading(false);
    }
  };

   if (!isLoaded) {
        return <div>Loading user...</div>;
   }

   // Optionally redirect if already signed in and potentially verified (check status?)
   // Or handle cases where user data isn't fully loaded yet

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verify Your Profile
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please provide some additional details to proceed.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <div className="rounded-md shadow-sm -space-y-px">
             <div>
              <label htmlFor="name" className="sr-only">Name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
             <div>
              <label htmlFor="age" className="sr-only">Age</label>
              <input
                id="age"
                name="age"
                type="number"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Age"
                 value={formData.age}
                onChange={handleChange}
              />
            </div>
             <div>
              <label htmlFor="budget" className="sr-only">Budget</label>
               <input
                id="budget"
                name="budget"
                type="text" // Use text for flexibility (e.g., "$1000-$2000", "Approx 500 USD")
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Budget (e.g., $5000 USD)"
                value={formData.budget}
                onChange={handleChange}
              />
            </div>
             <div>
              <label htmlFor="availabilityDays" className="sr-only">Available Days</label>
              <input
                id="availabilityDays"
                name="availabilityDays"
                type="number"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Number of days available in country"
                 value={formData.availabilityDays}
                onChange={handleChange}
              />
            </div>
            <div>
                <label htmlFor="visaStatus" className="sr-only">Visa Status</label>
                 <select
                    id="visaStatus"
                    name="visaStatus"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    value={formData.visaStatus}
                    onChange={handleChange}
                >
                    <option value="indian_citizen">I am an Indian Citizen</option>
                    <option value="not_indian_citizen">I am not an Indian Citizen</option>
                    <option value="other">Other</option>
                 </select>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Submit Verification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}