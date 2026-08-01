import React, { useState, useEffect } from 'react';
import { getSchoolProfile, saveSchoolProfile, getCurrentUser, SchoolProfile } from '../utils/db';
import { Save, Sparkles, Building2, Phone, Target, Calendar, Info, CheckCircle2 } from 'lucide-react';

const FormField = ({ label, value, onChangeField, placeholder, type = "text", disabled }: { 
  label: string; 
  value: string; 
  onChangeField: (val: string) => void; 
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) => (
  <div className="space-y-1">
    <label className="block text-xs font-bold text-slate-500 uppercase">{label}</label>
    {type === "textarea" ? (
      <textarea 
        value={value} 
        disabled={disabled}
        onChange={(e) => onChangeField(e.target.value)} 
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 disabled:opacity-80 disabled:cursor-not-allowed text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[80px]" 
      />
    ) : (
      <input 
        type={type} 
        value={value} 
        disabled={disabled}
        onChange={(e) => onChangeField(e.target.value)} 
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 disabled:opacity-80 disabled:cursor-not-allowed text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[44px]" 
      />
    )}
  </div>
);

export default function SchoolProfileForm() {
  const [profile, setProfile] = useState<SchoolProfile | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [isLogoSaved, setIsLogoSaved] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isParent, setIsParent] = useState(false);
  const [activeTabTerm, setActiveTabTerm] = useState<string>('Term 1');

  useEffect(() => {
    const data = getSchoolProfile();
    setProfile(data);
    if (data.currentTerm) {
      setActiveTabTerm(data.currentTerm);
    }
    if (data.logoUrl) {
      setLogo(data.logoUrl);
      setIsLogoSaved(true);
    }
    const user = getCurrentUser();
    setIsParent(user?.role === 'Parent');
  }, []);

  const handleTermDateChange = (termKey: string, fieldType: 'start' | 'end' | 'summary', val: string) => {
    if (!profile) return;

    const startField = termKey === 'Term 1' ? 'term1StartDate' : termKey === 'Term 2' ? 'term2StartDate' : 'term3StartDate';
    const endField = termKey === 'Term 1' ? 'term1EndDate' : termKey === 'Term 2' ? 'term2EndDate' : 'term3EndDate';
    const summaryField = termKey === 'Term 1' ? 'term1Summary' : termKey === 'Term 2' ? 'term2Summary' : 'term3Summary';

    const newStart = fieldType === 'start' ? val : (profile[startField] || '');
    const newEnd = fieldType === 'end' ? val : (profile[endField] || '');

    let newSummary = fieldType === 'summary' ? val : (profile[summaryField] || '');
    if ((fieldType === 'start' || fieldType === 'end') && newStart && newEnd) {
      try {
        const sDate = new Date(newStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const eDate = new Date(newEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        newSummary = `${sDate} to ${eDate}`;
      } catch {
        newSummary = `${newStart} to ${newEnd}`;
      }
    }

    const updated: SchoolProfile = {
      ...profile,
      [startField]: newStart,
      [endField]: newEnd,
      [summaryField]: newSummary,
    };

    const activeTerm = profile.currentTerm || 'Term 1';
    if (termKey === activeTerm) {
      updated.termStartDate = newStart;
      updated.termEndDate = newEnd;
      updated.termDates = newSummary;
    }

    setProfile(updated);
    saveSchoolProfile(updated);
  };

  const handleSetActiveTerm = (term: string) => {
    if (!profile) return;
    const startVal = term === 'Term 1' ? profile.term1StartDate : term === 'Term 2' ? profile.term2StartDate : profile.term3StartDate;
    const endVal = term === 'Term 1' ? profile.term1EndDate : term === 'Term 2' ? profile.term2EndDate : profile.term3EndDate;
    const summaryVal = term === 'Term 1' ? profile.term1Summary : term === 'Term 2' ? profile.term2Summary : profile.term3Summary;

    const updated: SchoolProfile = {
      ...profile,
      currentTerm: `${term} ${new Date().getFullYear()}`,
      termStartDate: startVal || profile.termStartDate,
      termEndDate: endVal || profile.termEndDate,
      termDates: summaryVal || profile.termDates,
    };
    setProfile(updated);
    saveSchoolProfile(updated);
  };

  const handleChange = (field: keyof SchoolProfile, value: string) => {
    if (!profile) return;
    const updated = {
      ...profile,
      [field]: value
    };

    // Automatically update termDates summary if start or end date is updated
    if (field === 'termStartDate' || field === 'termEndDate') {
      const startDate = field === 'termStartDate' ? value : profile.termStartDate;
      const endDate = field === 'termEndDate' ? value : profile.termEndDate;
      if (startDate && endDate) {
        try {
          const sDate = new Date(startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          const eDate = new Date(endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          updated.termDates = `${sDate} to ${eDate}`;
        } catch {
          updated.termDates = `${startDate} to ${endDate}`;
        }
      }
    }

    setProfile(updated);
    saveSchoolProfile(updated);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogo(base64String);
        setIsLogoSaved(true);
        if (profile) {
          const updatedProfile = {
            ...profile,
            logoUrl: base64String
          };
          setProfile(updatedProfile);
          saveSchoolProfile(updatedProfile);
          window.dispatchEvent(new Event('storage'));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveLogo = () => {
    if (profile && logo) {
      const updated = { ...profile, logoUrl: logo };
      saveSchoolProfile(updated);
      setIsLogoSaved(true);
      
      // Dispatch storage event to notify other components (like header or login)
      window.dispatchEvent(new Event('storage'));
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    saveSchoolProfile(profile);
    setShowToast(true);
    
    // Dispatch storage event to let App.tsx know the name updated
    window.dispatchEvent(new Event('storage'));

    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  if (!profile) {
    return <div className="p-8 text-center text-slate-500 font-medium">Loading school profile...</div>;
  }

  return (
    <form onSubmit={handleSaveProfile} className="space-y-8 pb-16 relative">
      {/* Parent Portal Info Banner */}
      {isParent && (
        <div className="bg-blue-50 border border-blue-150 text-blue-800 p-4 rounded-2xl flex items-start gap-3 text-xs font-semibold animate-fade-in shadow-xs">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-extrabold text-blue-900 uppercase tracking-wide text-[11px]">Parent / Guardian View Mode</h4>
            <p className="text-blue-700 font-medium leading-relaxed">
              You are signed in to the Parent Portal. The school registration, ownership details, contact channels, and official bank accounts below are presented for official confirmation. Please contact school support for administrative edits.
            </p>
          </div>
        </div>
      )}

      {/* Save success toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-2.5 z-50 text-xs font-bold border border-slate-800 animate-slide-in">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          ✅ School profile updated successfully!
        </div>
      )}

      {/* Basic Identification */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Building2 className="w-4 h-4 text-blue-500" />
          School Identification & Registration
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="School Full Name" value={profile.name} onChangeField={(v) => handleChange('name', v)} placeholder="e.g. Elgon View Heights High School" disabled={isParent} />
          <FormField label="KNEC School Code" value={profile.code} onChangeField={(v) => handleChange('code', v)} placeholder="e.g. 20405101" disabled={isParent} />
          <FormField label="MoE Registration Number" value={profile.regNumber} onChangeField={(v) => handleChange('regNumber', v)} placeholder="e.g. MOE/SEC/3382" disabled={isParent} />
          <FormField label="County" value={profile.county} onChangeField={(v) => handleChange('county', v)} disabled={isParent} />
          <FormField label="Sub-County" value={profile.subCounty} onChangeField={(v) => handleChange('subCounty', v)} disabled={isParent} />
          <FormField label="Ward" value={profile.ward} onChangeField={(v) => handleChange('ward', v)} disabled={isParent} />
          <FormField label="Village / Estate" value={profile.village} onChangeField={(v) => handleChange('village', v)} disabled={isParent} />
          <FormField label="P.O. Box" value={profile.pobox} onChangeField={(v) => handleChange('pobox', v)} placeholder="e.g. P.O. Box 400" disabled={isParent} />
          <FormField label="Postal Code" value={profile.postalCode} onChangeField={(v) => handleChange('postalCode', v)} placeholder="e.g. 30100" disabled={isParent} />
          <FormField label="Physical Location / Landmark" value={profile.location} onChangeField={(v) => handleChange('location', v)} disabled={isParent} />
        </div>
      </div>

      {/* Classification */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          School Classification
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Ownership" value={profile.ownership} onChangeField={(v) => handleChange('ownership', v)} placeholder="e.g. Public or Private" disabled={isParent} />
          <FormField label="School Level" value={profile.level} onChangeField={(v) => handleChange('level', v)} placeholder="e.g. Primary, JSS, Senior High" disabled={isParent} />
          <FormField label="Gender Category" value={profile.genderCategory} onChangeField={(v) => handleChange('genderCategory', v)} placeholder="e.g. Co-Educational or Boys Only" disabled={isParent} />
          <FormField label="Accommodation Type" value={profile.accommodationType} onChangeField={(v) => handleChange('accommodationType', v)} placeholder="e.g. Day, Boarding, Mixed" disabled={isParent} />
          <FormField label="Total Land Area" value={profile.landArea} onChangeField={(v) => handleChange('landArea', v)} placeholder="e.g. 10 Acres" disabled={isParent} />
        </div>
      </div>

      {/* Contacts */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Phone className="w-4 h-4 text-emerald-500" />
          Contact & Bank Details
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Official Email Address" type="email" value={profile.email} onChangeField={(v) => handleChange('email', v)} disabled={isParent} />
          <FormField label="Mobile Number (Admin)" type="tel" value={profile.mobileAdmin} onChangeField={(v) => handleChange('mobileAdmin', v)} disabled={isParent} />
          <FormField label="Mobile Number (Bursar)" type="tel" value={profile.mobileBursar} onChangeField={(v) => handleChange('mobileBursar', v)} disabled={isParent} />
          <FormField label="Mobile Number (Principal)" type="tel" value={profile.mobilePrincipal} onChangeField={(v) => handleChange('mobilePrincipal', v)} disabled={isParent} />
          <FormField label="Office Telephone Number" type="tel" value={profile.officeTel} onChangeField={(v) => handleChange('officeTel', v)} disabled={isParent} />
          <FormField label="School Website" type="url" value={profile.website} onChangeField={(v) => handleChange('website', v)} disabled={isParent} />
          <FormField label="Social Media Handles" value={profile.socials} onChangeField={(v) => handleChange('socials', v)} disabled={isParent} />
          <FormField label="Bank Name & Branch" value={profile.bankName} onChangeField={(v) => handleChange('bankName', v)} disabled={isParent} />
          <FormField label="Bank Account Number" value={profile.bankAccount} onChangeField={(v) => handleChange('bankAccount', v)} disabled={isParent} />
        </div>
      </div>

      {/* Statements */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Target className="w-4 h-4 text-amber-500" />
          Motto, Mission & Vision
        </h4>
        <div className="space-y-4">
          <FormField label="School Motto" value={profile.motto} onChangeField={(v) => handleChange('motto', v)} disabled={isParent} />
          <FormField label="Mission Statement" type="textarea" value={profile.mission} onChangeField={(v) => handleChange('mission', v)} disabled={isParent} />
          <FormField label="Vision Statement" type="textarea" value={profile.vision} onChangeField={(v) => handleChange('vision', v)} disabled={isParent} />
          <FormField label="Core Values" type="textarea" value={profile.values} onChangeField={(v) => handleChange('values', v)} disabled={isParent} />
        </div>
      </div>

      {/* Operational & Academic Details */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            Operational & Academic Details
          </h4>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Current Active Term:</span>
            <select
              value={(profile.currentTerm || 'Term 1').replace(/\s*\d{4}/, '').trim()}
              onChange={(e) => {
                const term = e.target.value as 'Term 1' | 'Term 2' | 'Term 3';
                setActiveTabTerm(term);
                handleSetActiveTerm(term);
              }}
              disabled={isParent}
              className="py-1 px-3 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-full text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
            >
              <option value="Term 1">Term 1 {(profile.currentTerm || 'Term 1').replace(/\s*\d{4}/, '').trim() === 'Term 1' ? '✓ (Active)' : ''}</option>
              <option value="Term 2">Term 2 {(profile.currentTerm || 'Term 1').replace(/\s*\d{4}/, '').trim() === 'Term 2' ? '✓ (Active)' : ''}</option>
              <option value="Term 3">Term 3 {(profile.currentTerm || 'Term 1').replace(/\s*\d{4}/, '').trim() === 'Term 3' ? '✓ (Active)' : ''}</option>
            </select>
          </div>
        </div>

        {/* TERM TOGGLE BAR */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Select Active Term:</span>
              <div className="inline-flex p-1 bg-slate-200/80 rounded-xl gap-1">
                {(['Term 1', 'Term 2', 'Term 3'] as const).map((term) => {
                  const isActiveTerm = (profile.currentTerm || 'Term 1').replace(/\s*\d{4}/, '').trim() === term;
                  return (
                    <button
                      key={term}
                      type="button"
                      onClick={() => {
                        setActiveTabTerm(term);
                        handleSetActiveTerm(term);
                      }}
                      className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                        isActiveTerm
                          ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400'
                          : 'bg-white text-slate-700 hover:text-blue-700 hover:bg-slate-100 border border-slate-200/80'
                      }`}
                    >
                      {term}
                      {isActiveTerm ? (
                        <span className="px-1.5 py-0.5 bg-white text-emerald-800 text-[9px] font-black rounded-full uppercase shadow-2xs">
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-normal">
                          (Click to activate)
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {!isParent && (
              <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Active Term: <strong className="font-black text-emerald-900">{profile.currentTerm || 'Term 1'}</strong></span>
              </div>
            )}
          </div>

          {/* Selected Term Calendar Dates & Summary */}
          <div className="pt-2 border-t border-slate-200/60 grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-2xs">
            <FormField
              label={`${activeTabTerm} Opening Date (Calendar)`}
              type="date"
              value={
                activeTabTerm === 'Term 1'
                  ? profile.term1StartDate || ''
                  : activeTabTerm === 'Term 2'
                  ? profile.term2StartDate || ''
                  : profile.term3StartDate || ''
              }
              onChangeField={(v) => handleTermDateChange(activeTabTerm, 'start', v)}
              disabled={isParent}
            />
            <FormField
              label={`${activeTabTerm} Closing Date (Calendar)`}
              type="date"
              value={
                activeTabTerm === 'Term 1'
                  ? profile.term1EndDate || ''
                  : activeTabTerm === 'Term 2'
                  ? profile.term2EndDate || ''
                  : profile.term3EndDate || ''
              }
              onChangeField={(v) => handleTermDateChange(activeTabTerm, 'end', v)}
              disabled={isParent}
            />
            <FormField
              label={`${activeTabTerm} Dates Summary`}
              value={
                activeTabTerm === 'Term 1'
                  ? profile.term1Summary || ''
                  : activeTabTerm === 'Term 2'
                  ? profile.term2Summary || ''
                  : profile.term3Summary || ''
              }
              onChangeField={(v) => handleTermDateChange(activeTabTerm, 'summary', v)}
              placeholder="e.g. 5th Jan 2026 to 10th Apr 2026"
              disabled={isParent}
            />
          </div>
        </div>

        {/* Principal & Academic Calendar details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <FormField
            label="Headteacher / Principal Name"
            value={profile.principalName}
            onChangeField={(v) => handleChange('principalName', v)}
            disabled={isParent}
          />
          <FormField
            label="Appointment Date (Calendar)"
            type="date"
            value={profile.appointmentDate}
            onChangeField={(v) => handleChange('appointmentDate', v)}
            disabled={isParent}
          />
          <div className="md:col-span-2">
            <FormField
              label="Academic Calendar Description"
              type="textarea"
              value={profile.academicCalendar}
              onChangeField={(v) => handleChange('academicCalendar', v)}
              placeholder="Provide any additional details or notes regarding term schedules, mid-term breaks, and academic year plans."
              disabled={isParent}
            />
          </div>
        </div>
      </div>

      {/* Logo upload and preview */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h4 className="text-sm font-extrabold text-slate-800 border-b border-slate-100 pb-3">
          🖼️ Official School Logo
        </h4>
        <div className="space-y-4">
          {!isParent && (
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleLogoChange} 
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 file:cursor-pointer" 
            />
          )}
          {logo && (
            <div className="mt-4 flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <img src={logo} alt="School logo" className="w-24 h-24 object-contain bg-white border border-slate-200 p-1.5 rounded-xl shadow-xs" referrerPolicy="no-referrer" />
              <div className="space-y-2 text-center sm:text-left">
                <p className="text-xs text-slate-500 font-medium">
                  {isParent ? 'Official system logo registered with the board.' : 'Update the persistent logo across the administrative suite.'}
                </p>
                {!isParent && (
                  !isLogoSaved ? (
                    <button
                      type="button"
                      onClick={handleSaveLogo}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer min-h-[36px]"
                    >
                      💾 Save & Apply Logo
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-extrabold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                      ✓ Applied System-wide
                    </span>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {!isParent && (
        <div className="pt-4 flex justify-end">
          <button 
            type="submit"
            className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-2xl font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer shadow-lg hover:shadow-slate-200 min-h-[48px]"
          >
            <Save className="w-4 h-4" /> Save Profile Information
          </button>
        </div>
      )}
    </form>
  );
}
