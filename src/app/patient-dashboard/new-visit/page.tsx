'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  UploadCloud, 
  MapPin, 
  DollarSign, 
  Activity,
  User,
  CalendarDays,
  ShieldCheck,
  X,
  ChevronDown,
  Search,
  Loader2
} from 'lucide-react';

const INDIAN_CITIES = [
  "Agra", "Ahmedabad", "Ajmer", "Akola", "Aligarh", "Allahabad", "Amravati", "Amritsar", "Asansol", 
  "Aurangabad", "Bangalore", "Bareilly", "Bhavnagar", "Bhilai", "Bhiwandi", "Bhopal", "Bhubaneswar", 
  "Bikaner", "Chandigarh", "Chennai", "Coimbatore", "Cuttack", "Dehradun", "Delhi", "Dhanbad", 
  "Durgapur", "Faridabad", "Firozabad", "Ghaziabad", "Gorakhpur", "Guntur", "Gurgaon", "Guwahati", 
  "Gwalior", "Howrah", "Hubli", "Hyderabad", "Indore", "Jabalpur", "Jaipur", "Jalandhar", "Jamshedpur", 
  "Jodhpur", "Kalyan-Dombivli", "Kanpur", "Kochi", "Kolhapur", "Kolkata", "Lucknow", "Ludhiana", 
  "Madurai", "Meerut", "Moradabad", "Mumbai", "Mysore", "Nagpur", "Nanded", "Nashik", "Navi Mumbai", 
  "Nellore", "Noida", "Patna", "Pimpri-Chinchwad", "Pune", "Raipur", "Rajkot", "Ranchi", "Rourkela", 
  "Saharanpur", "Salem", "Seoul", "Solapur", "Srinagar", "Surat", "Thane", "Tiruchirappalli", 
  "Tiruppur", "Vadodara", "Varanasi", "Vasai-Virar", "Vijayawada", "Visakhapatnam", "Warangal"
].sort();

export default function NewVisitPage() {
  const router = useRouter();
  const { user } = useUser();
  
  // UI State
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Data State
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  
  // Dropdown UI State
  const [citySearch, setCitySearch] = useState("");
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCityDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const toggleDestination = (dest: string) => {
    setSelectedDestinations(prev => 
      prev.includes(dest) 
        ? prev.filter(d => d !== dest)
        : [...prev, dest]
    );
  };

  const filteredCities = INDIAN_CITIES.filter(city => 
    city.toLowerCase().includes(citySearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      alert("You must be signed in to submit a request.");
      return;
    }
    
    if (!name || !age || !gender || !contactInfo || !symptoms) {
      alert("Please fill in all required patient information and symptoms.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    
    try {
      // 1. Upsert Patient
      const { error: patientError } = await supabase
        .from('patients')
        .upsert({
          id: user.id,
          name,
          age: parseInt(age),
          gender,
          contact_info: contactInfo
        });
      
      if (patientError) throw patientError;

      // 2. Upload Documents to Bucket & Save Metadata
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('patient_documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('patient_documents')
          .getPublicUrl(filePath);

        const { error: docError } = await supabase
          .from('patient_docs')
          .insert({
            patient_id: user.id,
            name: file.name,
            size: file.size,
            url: publicUrl
          });
          
        if (docError) throw docError;
      }

      // 3. Insert Medical Request (which will show on Dashboard as "Under Review")
      const { error: requestError } = await supabase
        .from('medical_requests')
        .insert({
           patient_id: user.id,
           symptoms,
           budget_range: budgetRange || null,
           destinations: selectedDestinations,
           status: 'Under Review'
        });

      if (requestError) throw requestError;

      // Success
      router.push('/patient-dashboard');
      
    } catch (err: any) {
       console.error("Submission error:", err);
       alert("An error occurred during submission: " + (err.message || 'Unknown error'));
    } finally {
       setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 pt-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
          <Link href="/patient-dashboard">
            <button type="button" className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-100 transition-colors shadow-sm">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Lodge a New Visit</h1>
            <p className="text-slate-500 mt-1 text-sm">Tell us about your health needs so we can curate the perfect medical checkup package for you.</p>
          </div>
        </div>

        {/* Form Container */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl border border-slate-100"
        >
          {/* Decorative Top Banner */}
          <div className="h-4 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-t-3xl" />
          
          <form className="p-8 sm:p-10 space-y-8" onSubmit={handleSubmit}>
            
            {/* Section 1: Patient Information */}
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                <User className="w-5 h-5 text-blue-500" /> Patient Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Full Name *</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="e.g., John Doe" 
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400 placeholder:font-normal"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Age *</label>
                  <input 
                    type="number" 
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    required
                    placeholder="e.g., 45" 
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400 placeholder:font-normal"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Gender *</label>
                  <select 
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium appearance-none"
                  >
                    <option value="" disabled>Select Gender...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Contact Info *</label>
                  <input 
                    type="text" 
                    value={contactInfo}
                    onChange={e => setContactInfo(e.target.value)}
                    required
                    placeholder="e.g., Phone or Email" 
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400 placeholder:font-normal"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Medical Needs */}
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Activity className="w-5 h-5 text-emerald-500" /> Medical Needs
              </h2>
              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Symptoms or Reason for Visit *</label>
                  <textarea 
                    rows={4}
                    value={symptoms}
                    onChange={e => setSymptoms(e.target.value)}
                    required
                    placeholder="Describe your current symptoms, pre-existing conditions, or the specific checkup you require..." 
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium placeholder:text-slate-400 placeholder:font-normal resize-none"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Upload Local Physician Reports (Multiple Files Allowed)</label>
                  
                  {/* File Upload Zone */}
                  <div 
                    className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                      dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input 
                      type="file" 
                      id="file-upload" 
                      multiple
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                      onChange={handleFileChange}
                    />
                    
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-white rounded-full shadow-sm border border-slate-100">
                        <UploadCloud className="w-8 h-8 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-slate-700 font-medium font-sans">
                          <span className="text-blue-600 font-semibold">Click to upload</span> or drag and drop multiple files
                        </p>
                        <p className="text-slate-400 text-sm mt-1">SVG, PNG, JPG, or PDF (max. 10MB each)</p>
                      </div>
                    </div>
                  </div>

                  {/* Uploaded Files List */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <AnimatePresence>
                        {selectedFiles.map((file, index) => (
                          <motion.div 
                            key={`${file.name}-${index}`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm"
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                              <div className="truncate text-sm font-medium text-slate-700">
                                {file.name}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-md transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Preferences */}
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                <MapPin className="w-5 h-5 text-indigo-500" /> Travel Preferences
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-slate-400" /> Budget Range (USD)
                  </label>
                  <select 
                    value={budgetRange}
                    onChange={e => setBudgetRange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium appearance-none"
                  >
                    <option value="" disabled>Select Budget...</option>
                    <option value="500-1000">$500 - $1,000</option>
                    <option value="1000-1500">$1,000 - $1,500</option>
                    <option value="1500-2000">$1,500 - $2,000</option>
                    <option value="2000-2500">$2,000 - $2,500</option>
                    <option value="2500-3000">$2,500 - $3,000</option>
                    <option value="3000-3500">$3,000 - $3,500</option>
                    <option value="3500-4000">$3,500 - $4,000</option>
                    <option value="4000-4500">$4,000 - $4,500</option>
                    <option value="4500-5000">$4,500 - $5,000</option>
                    <option value="5000-5500">$5,000 - $5,500</option>
                    <option value="5500-6000">$5,500 - $6,000</option>
                    <option value="6000+">$6,000+</option>
                  </select>
                </div>

                <div className="space-y-2 relative" ref={dropdownRef}>
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" /> Preferred Destinations (Indian Cities)
                  </label>
                  
                  {/* Dropdown Toggle Button */}
                  <div 
                    onClick={() => setShowCityDropdown(!showCityDropdown)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 cursor-pointer hover:bg-slate-100 transition-all flex items-center justify-between"
                  >
                    <span className={`truncate font-medium ${selectedDestinations.length === 0 ? 'text-slate-400 font-normal' : ''}`}>
                      {selectedDestinations.length === 0 
                        ? 'Select cities...' 
                        : `${selectedDestinations.length} location${selectedDestinations.length > 1 ? 's' : ''} selected`}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />
                  </div>

                  {/* Custom Dropdown Menu */}
                  <AnimatePresence>
                    {showCityDropdown && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
                      >
                        <div className="p-2 border-b border-slate-100">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                              type="text" 
                              placeholder="Search cities..." 
                              value={citySearch}
                              onChange={(e) => setCitySearch(e.target.value)}
                              className="w-full bg-slate-50 border-none rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto p-2">
                          {filteredCities.length > 0 ? (
                            filteredCities.map(city => {
                              const isSelected = selectedDestinations.includes(city);
                              return (
                                <div 
                                  key={city}
                                  onClick={() => toggleDestination(city)}
                                  className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                                >
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'}`}>
                                    {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                                  </div>
                                  <span className={`text-sm ${isSelected ? 'font-medium text-indigo-900' : 'text-slate-700'}`}>{city}</span>
                                </div>
                              )
                            })
                          ) : (
                            <div className="px-3 py-4 text-center text-sm text-slate-500">
                              No cities found matching "{citySearch}"
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Render Selected Badges Below */}
                  {selectedDestinations.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-3">
                      {selectedDestinations.map(dest => (
                        <div key={dest} className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                          {dest}
                          <button type="button" onClick={() => toggleDestination(dest)} className="hover:bg-indigo-200 p-0.5 rounded-full transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                </div>

              </div>
            </div>

            {/* Actions */}
            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-4">
              <Link href="/patient-dashboard" className="w-full sm:w-auto">
                <button type="button" className="w-full px-8 py-3 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors">
                  Cancel
                </button>
              </Link>
              <button 
                type="submit" 
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                ) : (
                  <>Submit Request <CalendarDays className="w-4 h-4" /></>
                )}
              </button>
            </div>

          </form>
        </motion.div>

      </div>
    </div>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      {...props} 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor" 
      strokeWidth={3}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
