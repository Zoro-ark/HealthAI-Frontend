"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, CheckCircle, FileText, User, Building, GraduationCap, ArrowRight, Loader2, Link as LinkIcon, AlertCircle, Clock3, ShieldCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useUser } from "@clerk/nextjs";

// Framer motion variants
const containerVariants: any = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    transition: { 
      duration: 0.5, 
      ease: "easeOut",
      staggerChildren: 0.1
    } 
  }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

export default function DoctorDetailsClient() {
  const supabase = createClient();
  const { user, isLoaded, isSignedIn } = useUser();
  const [currentStatus, setCurrentStatus] = useState<'loading' | 'pending' | 'verified' | 'rejected' | 'none'>('loading');

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    registrationNumber: "",
    specialty: "",
    degreeInfo: "",
    experienceYears: "",
    clinicAddress: "",
  });

  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user) {
      setCurrentStatus('none');
      return;
    }

    const checkStatus = async () => {
      try {
        const { data: dbUser, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('clerk_id', user.id)
          .single();

        if (userError || !dbUser) {
           setCurrentStatus('none');
           return;
        }

        const { data, error } = await supabase
          .from('doctor_verifications')
          .select('status')
          .eq('user_id', dbUser.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error || !data || data.length === 0) {
          setCurrentStatus('none');
        } else {
          setCurrentStatus(data[0].status as any);
        }
      } catch (err) {
        setCurrentStatus('none');
      }
    };

    checkStatus();
  }, [isLoaded, isSignedIn, user, supabase]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const documentUrls: string[] = [];

      // 1. Upload files to Supabase Storage
      if (files.length > 0) {
        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `${Date.now()}-${fileName}`;

          const { error: uploadError, data } = await supabase.storage
            .from('doctor_documents')
            .upload(filePath, file);

          if (uploadError) {
            throw new Error(`File upload failed: ${uploadError.message}`);
          }

          if (data) {
            const { data: publicUrlData } = supabase.storage.from('doctor_documents').getPublicUrl(filePath);
            documentUrls.push(publicUrlData.publicUrl);
          }
        }
      }

      // 1.5 Fetch Database UUID for user
      const { data: dbUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', user.id)
        .single();
      
      if (userError || !dbUser) {
        throw new Error("Could not find matching database user. Are you signed in?");
      }

      // 2. Insert record into doctor_verifications table
      const { error: insertError } = await supabase
        .from('doctor_verifications')
        .insert({
          user_id: dbUser.id,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          registration_number: formData.registrationNumber,
          specialty: formData.specialty,
          degree_info: formData.degreeInfo,
          experience_years: parseInt(formData.experienceYears) || 0,
          clinic_address: formData.clinicAddress,
          documents: documentUrls
        });

      if (insertError) {
        throw new Error(`Database insert failed: ${insertError.message}`);
      }

      setSubmitSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/80 backdrop-blur-xl border border-white/40 p-12 rounded-3xl shadow-2xl max-w-lg text-center"
        >
          <div className="bg-emerald-100 text-emerald-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <CheckCircle className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-4 tracking-tight">Application Submitted</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            Thank you for submitting your verification details. Our administrative team will review your credentials and get back to you shortly.
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-8 py-3 bg-slate-900 text-white font-medium rounded-full hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
          >
            Return to Homepage
          </button>
        </motion.div>
      </div>
    );
  }

  if (currentStatus === 'loading') {
     return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-slate-500 font-medium tracking-tight">Loading verification status...</p>
        </div>
     );
  }

  if (currentStatus === 'pending') {
     return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/80 backdrop-blur-xl border border-white/40 p-12 rounded-3xl shadow-2xl max-w-lg text-center">
                <div className="bg-amber-100 text-amber-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner animate-pulse">
                    <Clock3 className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-4 tracking-tight">Pending Review</h2>
                <p className="text-slate-600 mb-4 leading-relaxed">
                    Your details have been sent to the admin and are currently under review. Please be patient while we verify your credentials.
                </p>
                <div className="bg-slate-100/50 border border-slate-200 rounded-2xl p-6 mb-8 text-sm text-slate-500">
                    If you have been waiting for more than 48 hours or require immediate assistance, please contact admin support at: <br/>
                    <strong className="text-slate-800 mt-2 inline-block">admin@medicotourism.com</strong>
                </div>
                <button onClick={() => window.location.href = '/'} className="px-8 py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium rounded-full transition-colors">
                    Return to Homepage
                </button>
            </motion.div>
        </div>
     );
  }

  if (currentStatus === 'verified') {
     return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/80 backdrop-blur-xl border border-white/40 p-12 rounded-3xl shadow-2xl max-w-lg text-center">
                <div className="bg-emerald-100 text-emerald-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <ShieldCheck className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-4 tracking-tight">You are Verified</h2>
                <p className="text-slate-600 mb-8 leading-relaxed">
                    Your doctor profile has already been verified by our administrators. You have full access to the portal.
                </p>
                <button onClick={() => window.location.href = '/doc'} className="px-8 py-3 bg-blue-600 text-white hover:bg-blue-700 font-medium rounded-full transition-colors shadow-lg shadow-blue-900/20">
                    Go to Doctor Portal
                </button>
            </motion.div>
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 relative to-slate-100 py-16 px-4 sm:px-6 lg:px-8 font-sans overflow-hidden">
        {/* Background decorative blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100/50 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100/50 blur-[100px] pointer-events-none" />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto relative z-10"
      >
        <div className="text-center mb-12">
          <motion.div variants={itemVariants} className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-slate-200 mb-6">
            <User className="w-8 h-8 text-blue-600" />
          </motion.div>
          <motion.h1 variants={itemVariants} className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
            Doctor Verification
          </motion.h1>
          <motion.p variants={itemVariants} className="text-lg text-slate-600 max-w-2xl mx-auto">
            Please provide your professional credentials and documents for administrative review.
          </motion.p>
        </div>

        <motion.div variants={itemVariants} className="bg-white/70 backdrop-blur-2xl rounded-3xl shadow-xl border border-white/50 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8 md:p-12">
            
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-xl mb-8 flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="font-medium">{errorMsg}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              
              {/* Personal Details */}
              <div className="space-y-6 md:col-span-2">
                <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
                  <User className="w-5 h-5 text-blue-500" />
                  <h3 className="text-xl font-semibold text-slate-800">Personal Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                    <input 
                      required type="text" name="fullName" value={formData.fullName} onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="Dr. John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                    <input 
                      required type="email" name="email" value={formData.email} onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="doctor@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                    <input 
                      required type="tel" name="phone" value={formData.phone} onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
              </div>

              {/* Professional Details */}
              <div className="space-y-6 md:col-span-2 pt-4">
                <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
                  <GraduationCap className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-xl font-semibold text-slate-800">Professional Credentials</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Degree</label>
                    <div className="relative">
                      <select 
                        required name="degreeInfo" value={formData.degreeInfo} onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none"
                      >
                        <option value="" disabled>Select your degree</option>
                        <option value="MBBS">MBBS (Bachelor of Medicine, Bachelor of Surgery)</option>
                        <option value="MD">MD (Doctor of Medicine)</option>
                        <option value="DO">DO (Doctor of Osteopathic Medicine)</option>
                        <option value="DDS">DDS (Doctor of Dental Surgery)</option>
                        <option value="DMD">DMD (Doctor of Medicine in Dentistry)</option>
                        <option value="DVM">DVM (Doctor of Veterinary Medicine)</option>
                        <option value="PhD">PhD (Doctor of Philosophy)</option>
                        <option value="BDS">BDS (Bachelor of Dental Surgery)</option>
                        <option value="Other">Other</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Specialty</label>
                    <input 
                      required type="text" name="specialty" value={formData.specialty} onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="Cardiology, Dermatology, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Registration / License Number</label>
                    <input 
                      required type="text" name="registrationNumber" value={formData.registrationNumber} onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="e.g. MED12345678"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Years of Experience</label>
                    <input 
                      required type="number" name="experienceYears" value={formData.experienceYears} onChange={handleInputChange} min="0" max="80"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="e.g. 10"
                    />
                  </div>
                </div>
              </div>

               {/* Clinic Details */}
               <div className="space-y-6 md:col-span-2 pt-4">
                <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
                  <Building className="w-5 h-5 text-teal-500" />
                  <h3 className="text-xl font-semibold text-slate-800">Clinic / Hospital Information</h3>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Primary Clinic Address</label>
                  <textarea 
                    required name="clinicAddress" value={formData.clinicAddress} onChange={handleInputChange} rows={3}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                    placeholder="Enter the full address of your primary clinic or hospital..."
                  />
                </div>
              </div>

               {/* Document Upload */}
               <div className="space-y-6 md:col-span-2 pt-4">
                <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
                  <FileText className="w-5 h-5 text-slate-500" />
                  <h3 className="text-xl font-semibold text-slate-800">Identity & Degree Proofs</h3>
                </div>
                
                <div className="mt-2 text-sm text-slate-500 mb-4">
                  Upload clear copies of your medical degree and a valid government ID.
                </div>

                <div className="border-2 border-dashed border-slate-300 bg-slate-50 rounded-2xl p-8 text-center hover:bg-slate-100 transition-colors relative cursor-pointer group">
                  <input 
                    type="file" multiple required onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <div className="flex flex-col items-center pointer-events-none">
                    <div className="p-4 bg-blue-100/50 rounded-full text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8" />
                    </div>
                    <p className="text-slate-700 font-medium text-lg">Click to upload or drag and drop</p>
                    <p className="text-slate-500 text-sm mt-1">PDF, JPG, PNG up to 10MB each</p>
                  </div>
                </div>

                {files.length > 0 && (
                  <div className="bg-white border text-sm border-slate-200 rounded-xl p-4 shadow-sm mt-4">
                    <p className="font-semibold text-slate-700 mb-3 border-b border-slate-100 pb-2">Selected Files ({files.length}):</p>
                    <ul className="space-y-2">
                      {files.map((file, idx) => (
                        <li key={idx} className="flex items-center text-slate-600 gap-3">
                           <FileText className="w-4 h-4 text-blue-400" />
                           <span className="truncate">{file.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

            </div>

            <div className="mt-12 flex justify-end">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className={`flex items-center gap-2 px-8 py-4 bg-blue-600 text-white font-semibold rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none group`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  <>
                    Submit Verification
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}
