import React, { useMemo, useState, useRef } from 'react';
import { 
  X, FileText, Printer, Download, Sparkles, Plus, Trash2, 
  User, Briefcase, GraduationCap, Award, Phone, Mail, MapPin, Check,
  Camera, Eye, Layers, RefreshCw, Heart, Sliders, CheckCircle2
} from 'lucide-react';
import { printElementAsA4 } from '../lib/printA4';
import { downloadElementAsPdf } from '../lib/exportPdf';

interface ResumeMakerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EducationItem {
  degree: string;
  institution: string;
  year: string;
  percentage: string;
}

interface ExperienceItem {
  role: string;
  company: string;
  duration: string;
  description: string;
}

const OBJECTIVE_TEMPLATES = [
  "Seeking an entry-level position in an esteemed organization where I can utilize my educational skills and contribute to the growth of the company while continuously learning and improving myself.",
  "Hardworking and dedicated professional seeking a challenging role in the IT & digital services sector where my analytical, computer, and customer service skills can be fully utilized.",
  "To secure a responsible career opportunity to fully utilize my training and skills, while making a significant contribution to the success of the company.",
  "Experienced professional seeking a dynamic role to leverage my proven background in office administration, computer operations, and client management."
];

export const ResumeMakerModal: React.FC<ResumeMakerModalProps> = ({ isOpen, onClose }) => {
  // Header title
  const [headerTitle, setHeaderTitle] = useState<'RESUME' | 'CURRICULUM VITAE' | 'BIO-DATA'>('RESUME');

  // Personal state
  const [fullName, setFullName] = useState<string>('RAHUL KUMAR SHARMA');
  const [jobTitle, setJobTitle] = useState<string>('Computer Operator / Data Entry Specialist');
  const [phone, setPhone] = useState<string>('+91 9876543210');
  const [email, setEmail] = useState<string>('rahulkumar.work@gmail.com');
  const [address, setAddress] = useState<string>('Gandhi Nagar, Patna, Bihar - 800001');
  const [dob, setDob] = useState<string>('15/08/1998');
  const [fatherName, setFatherName] = useState<string>('Shri Ramesh Sharma');
  const [motherName, setMotherName] = useState<string>('Smt. Sunita Devi');
  const [gender, setGender] = useState<string>('Male');
  const [maritalStatus, setMaritalStatus] = useState<string>('Unmarried');
  const [nationality, setNationality] = useState<string>('Indian');
  const [languages, setLanguages] = useState<string>('Hindi, English');
  const [place, setPlace] = useState<string>('Patna');

  // Objective & Skills
  const [objective, setObjective] = useState<string>(OBJECTIVE_TEMPLATES[0]);
  const [skills, setSkills] = useState<string>('MS Office (Word, Excel, PowerPoint), Tally Prime, Hindi & English Typing (40 WPM), Internet Browsing & Online Form Filling, Adobe Photoshop Basic, Hardware & Networking');

  // Education list
  const [educations, setEducations] = useState<EducationItem[]>([
    { degree: 'Bachelor of Science (B.Sc)', institution: 'Patna University', year: '2020', percentage: '68%' },
    { degree: 'Intermediate (12th)', institution: 'BSEB Patna', year: '2017', percentage: '72%' },
    { degree: 'Matriculation (10th)', institution: 'BSEB Patna', year: '2015', percentage: '78%' }
  ]);

  // Experience list
  const [experiences, setExperiences] = useState<ExperienceItem[]>([
    { role: 'Senior Computer Operator', company: 'Digital Seva Kendra, Patna', duration: '2021 - Present', description: 'Handled online citizen services, government portal applications, data entry, and documentation.' }
  ]);

  // Strengths & Hobbies
  const [strengths, setStrengths] = useState<string>('Punctual, honest and dedicated professional, Quick learner with positive attitude, Good communication & customer handling skills, Ability to work sincerely in both individual and team environments');
  const [hobbies, setHobbies] = useState<string>('Reading books, Internet browsing & tech learning, Playing cricket');

  // Customization & Controls
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [themeColor, setThemeColor] = useState<string>('#1e3a8a'); // Navy Blue
  const [templateStyle, setTemplateStyle] = useState<'modern_sidebar' | 'classic_border' | 'executive' | 'biodata'>('modern_sidebar');
  const [fontScale, setFontScale] = useState<'large' | 'normal' | 'compact'>('large');

  // Section Toggles
  const [includeExperience, setIncludeExperience] = useState<boolean>(true);
  const [includeStrengths, setIncludeStrengths] = useState<boolean>(true);
  const [includeHobbies, setIncludeHobbies] = useState<boolean>(true);
  const [includeMotherName, setIncludeMotherName] = useState<boolean>(false);
  const [includePhotoBox, setIncludePhotoBox] = useState<boolean>(true);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const resumePrintRef = useRef<HTMLDivElement>(null);

  // Scaled typography classes tailored for rich A4 page filling
  const sizeClasses = useMemo(() => {
    if (fontScale === 'large') {
      return {
        wrapperPad: 'p-7 sm:p-8',
        sectionGap: 'space-y-3 sm:space-y-4',
        nameText: 'text-2xl sm:text-3xl font-black tracking-tight',
        titleText: 'text-sm sm:text-base font-bold',
        contactText: 'text-xs sm:text-[13px]',
        headText: 'text-xs sm:text-[13.5px] font-black uppercase tracking-wider',
        bodyText: 'text-xs sm:text-[13.5px] leading-relaxed text-justify',
        tableHead: 'p-2 text-xs sm:text-[13px] font-bold',
        tableCell: 'p-2 text-xs sm:text-[13px]',
        gridText: 'text-xs sm:text-[13.5px] leading-relaxed',
        signGap: 'h-10',
        signText: 'text-xs sm:text-[13.5px]',
      };
    } else if (fontScale === 'normal') {
      return {
        wrapperPad: 'p-5 sm:p-6',
        sectionGap: 'space-y-2.5 sm:space-y-3',
        nameText: 'text-xl sm:text-2xl font-black tracking-tight',
        titleText: 'text-xs sm:text-sm font-bold',
        contactText: 'text-[11px] sm:text-xs',
        headText: 'text-[11px] sm:text-xs font-black uppercase tracking-wider',
        bodyText: 'text-[11px] sm:text-xs leading-relaxed text-justify',
        tableHead: 'p-1.5 text-xs font-bold',
        tableCell: 'p-1.5 text-xs',
        gridText: 'text-[11px] sm:text-xs leading-relaxed',
        signGap: 'h-8',
        signText: 'text-[11px] sm:text-xs',
      };
    } else {
      return {
        wrapperPad: 'p-4 sm:p-5',
        sectionGap: 'space-y-2',
        nameText: 'text-lg sm:text-xl font-black tracking-tight',
        titleText: 'text-[11px] font-bold',
        contactText: 'text-[10px]',
        headText: 'text-[10px] font-black uppercase tracking-wider',
        bodyText: 'text-[10px] leading-snug text-justify',
        tableHead: 'p-1 text-[10px] font-bold',
        tableCell: 'p-1 text-[10px]',
        gridText: 'text-[10px] leading-snug',
        signGap: 'h-5',
        signText: 'text-[10px]',
      };
    }
  }, [fontScale]);

  // Handle Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPhotoUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Education Helpers
  const addEducation = () => {
    setEducations(prev => [...prev, { degree: '', institution: '', year: '', percentage: '' }]);
  };

  const removeEducation = (index: number) => {
    setEducations(prev => prev.filter((_, i) => i !== index));
  };

  const updateEducation = (index: number, field: keyof EducationItem, val: string) => {
    setEducations(prev => prev.map((item, i) => i === index ? { ...item, [field]: val } : item));
  };

  // Experience Helpers
  const addExperience = () => {
    setExperiences(prev => [...prev, { role: '', company: '', duration: '', description: '' }]);
  };

  const removeExperience = (index: number) => {
    setExperiences(prev => prev.filter((_, i) => i !== index));
  };

  const updateExperience = (index: number, field: keyof ExperienceItem, val: string) => {
    setExperiences(prev => prev.map((item, i) => i === index ? { ...item, [field]: val } : item));
  };

  // Quick Preset: ⚡ Fresher CV
  const applyFresherPreset = () => {
    setJobTitle('Computer Operator & Data Entry (Fresher)');
    setObjective(OBJECTIVE_TEMPLATES[0]);
    setEducations([
      { degree: 'Bachelor of Science (B.Sc)', institution: 'Patna University', year: '2020', percentage: '68%' },
      { degree: 'Intermediate (12th)', institution: 'BSEB Patna', year: '2017', percentage: '72%' },
      { degree: 'Matriculation (10th)', institution: 'BSEB Patna', year: '2015', percentage: '78%' }
    ]);
    setExperiences([
      { 
        role: 'Computer Operator & Tally Trainee', 
        company: 'National Computer Training Academy, Patna', 
        duration: '6 Months Training (2021)', 
        description: 'Completed hands-on practical training in MS Word, Advanced Excel, Tally ERP 9, and bilingual typing.' 
      }
    ]);
    setIncludeExperience(true);
    setIncludeStrengths(true);
    setIncludeHobbies(true);
    setFontScale('large');
  };

  // Quick Preset: 💼 Experienced Professional
  const applyExperiencedPreset = () => {
    setJobTitle('Senior Computer Operator & Digital Services Specialist');
    setObjective(OBJECTIVE_TEMPLATES[3]);
    setEducations([
      { degree: 'Bachelor of Commerce (B.Com)', institution: 'Patna University', year: '2019', percentage: '71%' },
      { degree: 'Intermediate (12th Com)', institution: 'BSEB Patna', year: '2016', percentage: '75%' },
      { degree: 'Matriculation (10th)', institution: 'BSEB Patna', year: '2014', percentage: '80%' }
    ]);
    setExperiences([
      { 
        role: 'Senior Centre Incharge & Operator', 
        company: 'Digital Seva Kendra & CSC, Patna', 
        duration: '2021 - Present', 
        description: 'Managing online citizen services, PAN/Aadhaar updates, GST/e-Shram applications, fast typing, and office accounts.' 
      },
      { 
        role: 'Data Entry & Office Assistant', 
        company: 'Shree Ram Logistics & Trading, Patna', 
        duration: '2019 - 2021', 
        description: 'Maintained day-to-day Excel registers, GST invoices, customer records, and email correspondence.' 
      }
    ]);
    setSkills('Advanced MS Excel (VLOOKUP, Pivot Tables), Tally Prime, Bilingual Typing (English 45 WPM, Hindi 40 WPM), Photoshop, Portal Forms Filing, Internet Banking');
    setIncludeExperience(true);
    setIncludeStrengths(true);
    setIncludeHobbies(true);
    setFontScale('large');
  };

  const [isExporting, setIsExporting] = useState<boolean>(false);

  // 1-Click Print CV
  const handlePrint = () => {
    if (!resumePrintRef.current) return;
    void printElementAsA4(resumePrintRef.current, `${fullName || 'Resume'} - CV`);
  };

  // Direct High-Resolution A4 PDF Download
  const handleDownloadPdf = async () => {
    if (!resumePrintRef.current) return;
    setIsExporting(true);
    try {
      const filename = `${(fullName || 'Resume').trim().replace(/\s+/g, '_')}_CV.pdf`;
      await downloadElementAsPdf(resumePrintRef.current, filename, '#ffffff');
    } catch (err) {
      console.error('Resume PDF export fallback error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-7xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Banner */}
        <div className="px-5 py-3 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-400/20 border border-blue-400/40 flex items-center justify-center text-blue-300 shadow-inner">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  1-Click CV & Resume Studio (स्मार्ट रिज्यूमे मेकर)
                </h3>
                <span className="px-2 py-0.5 bg-emerald-400 text-slate-950 text-[10px] font-black rounded-full uppercase">
                  A4 Full-Page Ready
                </span>
              </div>
              <p className="text-xs text-blue-200">
                100% full-page print layout without awkward white gaps • 4 cyber cafe templates with custom colors and bold fonts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>1-Click Print CV</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Exporting...' : 'PDF Download'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-4 p-3 sm:p-4 bg-slate-100">
          
          {/* Left Form Controls (5 Cols) */}
          <div className="lg:col-span-5 space-y-3.5 overflow-y-auto max-h-[84vh] pr-1">
            
            {/* Quick 1-Click Presets */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-2xl border border-blue-200 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-black text-blue-900">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Quick Fill:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={applyFresherPreset}
                  className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  ⚡ Fresher CV
                </button>
                <button
                  type="button"
                  onClick={applyExperiencedPreset}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  💼 Experienced CV
                </button>
              </div>
            </div>

            {/* 1. Header Title & Layout */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wide block">
                1. Header Type (शीर्षक)
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['RESUME', 'CURRICULUM VITAE', 'BIO-DATA'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setHeaderTitle(t)}
                    className={`py-1.5 px-1 rounded-xl text-xs font-bold cursor-pointer transition-all text-center ${
                      headerTitle === t
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Personal Information */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>Personal Details (व्यक्तिगत विवरण)</span>
                </h4>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-[10px] font-bold border border-blue-200 flex items-center gap-1 cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                  <span>{photoUrl ? 'Change Photo' : 'Upload Photo'}</span>
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Full Name *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Job Role / Post</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Mobile *</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Email</label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Full Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Father's Name</label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Date of Birth</label>
                  <input
                    type="text"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Gender / Status</label>
                  <div className="grid grid-cols-2 gap-1">
                    <input
                      type="text"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      placeholder="Male"
                      className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                    />
                    <input
                      type="text"
                      value={maritalStatus}
                      onChange={(e) => setMaritalStatus(e.target.value)}
                      placeholder="Unmarried"
                      className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Languages Known</label>
                  <input
                    type="text"
                    value={languages}
                    onChange={(e) => setLanguages(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* 3. Career Objective */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Career Objective</span>
                </h4>
                <div className="flex items-center gap-1">
                  {OBJECTIVE_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setObjective(tmpl)}
                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 rounded text-[10px] font-bold cursor-pointer"
                    >
                      T{idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={2}
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            {/* 4. Academic Qualifications */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <GraduationCap className="w-4 h-4 text-emerald-600" />
                  <span>Academic Qualifications (योग्यता)</span>
                </h4>
                <button
                  type="button"
                  onClick={addEducation}
                  className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Row</span>
                </button>
              </div>

              <div className="space-y-1.5">
                {educations.map((edu, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-1 items-center bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                    <input
                      type="text"
                      placeholder="Exam / Degree"
                      value={edu.degree}
                      onChange={(e) => updateEducation(idx, 'degree', e.target.value)}
                      className="col-span-4 px-2 py-1 text-xs bg-white border border-slate-200 rounded font-bold"
                    />
                    <input
                      type="text"
                      placeholder="Board / Univ"
                      value={edu.institution}
                      onChange={(e) => updateEducation(idx, 'institution', e.target.value)}
                      className="col-span-4 px-2 py-1 text-xs bg-white border border-slate-200 rounded"
                    />
                    <input
                      type="text"
                      placeholder="Year"
                      value={edu.year}
                      onChange={(e) => updateEducation(idx, 'year', e.target.value)}
                      className="col-span-2 px-1.5 py-1 text-xs bg-white border border-slate-200 rounded text-center"
                    />
                    <input
                      type="text"
                      placeholder="%"
                      value={edu.percentage}
                      onChange={(e) => updateEducation(idx, 'percentage', e.target.value)}
                      className="col-span-1 px-1 py-1 text-xs bg-white border border-slate-200 rounded text-center font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => removeEducation(idx)}
                      className="col-span-1 p-1 text-slate-400 hover:text-rose-600 flex justify-center cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Work Experience */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  <span>Work Experience / Training (अनुभव)</span>
                </h4>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeExperience}
                      onChange={(e) => setIncludeExperience(e.target.checked)}
                      className="accent-blue-600 rounded"
                    />
                    <span>Show</span>
                  </label>
                  {includeExperience && (
                    <button
                      type="button"
                      onClick={addExperience}
                      className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  )}
                </div>
              </div>

              {includeExperience && (
                <div className="space-y-2">
                  {experiences.map((exp, idx) => (
                    <div key={idx} className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500">Job Entry #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeExperience(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          placeholder="Job Role / Post"
                          value={exp.role}
                          onChange={(e) => updateExperience(idx, 'role', e.target.value)}
                          className="px-2 py-1 text-xs bg-white border border-slate-200 rounded font-bold"
                        />
                        <input
                          type="text"
                          placeholder="Company / Firm Name"
                          value={exp.company}
                          onChange={(e) => updateExperience(idx, 'company', e.target.value)}
                          className="px-2 py-1 text-xs bg-white border border-slate-200 rounded"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <input
                          type="text"
                          placeholder="Duration (e.g. 2021 - Present)"
                          value={exp.duration}
                          onChange={(e) => updateExperience(idx, 'duration', e.target.value)}
                          className="col-span-1 px-2 py-1 text-xs bg-white border border-slate-200 rounded"
                        />
                        <input
                          type="text"
                          placeholder="Short description of duties / responsibilities"
                          value={exp.description}
                          onChange={(e) => updateExperience(idx, 'description', e.target.value)}
                          className="col-span-2 px-2 py-1 text-xs bg-white border border-slate-200 rounded"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 6. Skills, Strengths & Hobbies */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                <Award className="w-4 h-4 text-purple-600" />
                <span>Skills, Strengths & Hobbies</span>
              </h4>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Computer & Technical Skills</label>
                <textarea
                  rows={2}
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[10px] font-bold text-slate-600">Key Strengths (प्रमुख विशेषताएं)</label>
                  <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeStrengths}
                      onChange={(e) => setIncludeStrengths(e.target.checked)}
                      className="accent-blue-600 rounded"
                    />
                    <span>Show</span>
                  </label>
                </div>
                {includeStrengths && (
                  <textarea
                    rows={2}
                    value={strengths}
                    onChange={(e) => setStrengths(e.target.value)}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  />
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[10px] font-bold text-slate-600">Hobbies & Interests (रुचियां)</label>
                  <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeHobbies}
                      onChange={(e) => setIncludeHobbies(e.target.checked)}
                      className="accent-blue-600 rounded"
                    />
                    <span>Show</span>
                  </label>
                </div>
                {includeHobbies && (
                  <input
                    type="text"
                    value={hobbies}
                    onChange={(e) => setHobbies(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  />
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Live A4 Sheet Preview (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-2.5 overflow-hidden">
            
            {/* Toolbar: Style, Color, Font Size */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
              
              {/* Template Style Selector */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setTemplateStyle('modern_sidebar')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    templateStyle === 'modern_sidebar'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-white'
                  }`}
                  title="2-Column Modern Sidebar CV"
                >
                  👔 2-Column Sidebar
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateStyle('classic_border')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    templateStyle === 'classic_border'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-white'
                  }`}
                  title="Indian Cyber Cafe Classic Frame"
                >
                  🇮🇳 Cyber Cafe (Bordered)
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateStyle('executive')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    templateStyle === 'executive'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-white'
                  }`}
                  title="Corporate Executive"
                >
                  📄 Executive
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateStyle('biodata')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    templateStyle === 'biodata'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-white'
                  }`}
                  title="Shuddh Bio-Data Format"
                >
                  📜 Bio-Data
                </button>
              </div>

              {/* Theme Color Picker */}
              <div className="flex items-center gap-1">
                {['#1e3a8a', '#0f766e', '#1e293b', '#b91c1c', '#581c87', '#0284c7'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setThemeColor(c)}
                    className={`w-5 h-5 rounded-full border border-white shadow-xs cursor-pointer ${
                      themeColor === c ? 'ring-2 ring-blue-500 scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              {/* Font Scale Control */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 px-1">Page Fill:</span>
                {(['large', 'normal', 'compact'] as const).map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setFontScale(size)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      fontScale === size
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                  >
                    {size === 'large' ? 'Full Page (बड़ा)' : size === 'normal' ? 'Normal' : 'Compact'}
                  </button>
                ))}
              </div>

            </div>

            {/* Live A4 Sheet Preview Container */}
            <div className="flex-1 bg-slate-300/80 p-3 sm:p-4 rounded-2xl overflow-y-auto max-h-[77vh] flex items-center justify-center">
              
              {/* ========================================================================= */}
              {/* TEMPLATE 1: 👔 MODERN 2-COLUMN SIDEBAR CV (100% Balanced, No Empty Gaps) */}
              {/* ========================================================================= */}
              {templateStyle === 'modern_sidebar' && (
                <div
                  id="resume-print-area"
                  ref={resumePrintRef}
                  className="resume-auto-sheet bg-white w-full max-w-[580px] aspect-[210/297] rounded-lg shadow-xl text-slate-800 leading-snug flex overflow-hidden border border-slate-400 select-none"
                >
                  {/* Left Sidebar (34%) */}
                  <div 
                    className="w-[34%] border-r border-slate-300 p-4 sm:p-5 flex flex-col justify-between shrink-0 space-y-3.5"
                    style={{ backgroundColor: `${themeColor}0F` }}
                  >
                    <div className="space-y-3.5">
                      {/* Photo or Avatar Monogram */}
                      {photoUrl ? (
                        <div className="w-24 h-28 mx-auto overflow-hidden rounded-md border-2 border-slate-400 shadow-xs bg-white">
                          <img src={photoUrl} alt="Passport Photo" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-24 h-24 mx-auto rounded-full bg-slate-200 border-2 border-slate-300 flex items-center justify-center text-3xl font-black text-slate-500 shadow-xs">
                          {fullName.charAt(0) || 'R'}
                        </div>
                      )}

                      {/* Contact Info */}
                      <div className="space-y-1">
                        <h4 className="text-xs font-black uppercase tracking-wider border-b pb-0.5" style={{ color: themeColor, borderColor: `${themeColor}40` }}>
                          Contact Details
                        </h4>
                        <div className="text-[12px] space-y-1 text-slate-700 font-medium pt-1">
                          <p className="break-words">📞 {phone}</p>
                          <p className="break-words">✉️ {email}</p>
                          <p className="break-words">📍 {address}</p>
                        </div>
                      </div>

                      {/* Personal Details */}
                      <div className="space-y-1">
                        <h4 className="text-xs font-black uppercase tracking-wider border-b pb-0.5" style={{ color: themeColor, borderColor: `${themeColor}40` }}>
                          Personal Bio-Data
                        </h4>
                        <div className="text-[11.5px] space-y-1 text-slate-700 pt-1">
                          <p><span className="font-bold">Father:</span> {fatherName}</p>
                          <p><span className="font-bold">DOB:</span> {dob}</p>
                          <p><span className="font-bold">Gender:</span> {gender}</p>
                          <p><span className="font-bold">Status:</span> {maritalStatus}</p>
                          <p><span className="font-bold">Nationality:</span> {nationality}</p>
                          <p><span className="font-bold">Languages:</span> {languages}</p>
                        </div>
                      </div>

                      {/* Skills */}
                      <div className="space-y-1">
                        <h4 className="text-xs font-black uppercase tracking-wider border-b pb-0.5" style={{ color: themeColor, borderColor: `${themeColor}40` }}>
                          Computer Skills
                        </h4>
                        <p className="text-[11.5px] leading-relaxed text-slate-700 pt-1">{skills}</p>
                      </div>

                      {/* Hobbies */}
                      {includeHobbies && hobbies && (
                        <div className="space-y-1">
                          <h4 className="text-xs font-black uppercase tracking-wider border-b pb-0.5" style={{ color: themeColor, borderColor: `${themeColor}40` }}>
                            Hobbies & Interests
                          </h4>
                          <p className="text-[11.5px] leading-relaxed text-slate-700 pt-1">{hobbies}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Main Content (66%) */}
                  <div className="w-[66%] p-5 sm:p-6 flex flex-col justify-between space-y-3 overflow-hidden">
                    
                    {/* Header */}
                    <div className="border-b-2 pb-2" style={{ borderColor: themeColor }}>
                      <h2 className="text-2xl font-black tracking-tight" style={{ color: themeColor }}>
                        {fullName.toUpperCase()}
                      </h2>
                      <p className="text-xs sm:text-sm font-bold text-slate-700">{jobTitle}</p>
                    </div>

                    {/* Career Objective */}
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-wider" style={{ color: themeColor }}>
                        Career Objective
                      </h4>
                      <p className="text-[12.5px] leading-relaxed text-slate-800 text-justify">{objective}</p>
                    </div>

                    {/* Work Experience */}
                    {includeExperience && experiences.length > 0 && (
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-black uppercase tracking-wider" style={{ color: themeColor }}>
                          Work Experience & Training
                        </h4>
                        {experiences.map((exp, idx) => (
                          <div key={idx} className="text-[12px] space-y-0.5">
                            <div className="flex justify-between font-bold text-slate-900">
                              <span>{exp.role}</span>
                              <span className="text-[11px] text-slate-500 font-semibold">{exp.duration}</span>
                            </div>
                            <p className="font-semibold text-slate-700">{exp.company}</p>
                            {exp.description && <p className="text-slate-700">{exp.description}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Academic Qualifications Table */}
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-wider" style={{ color: themeColor }}>
                        Academic Qualifications
                      </h4>
                      <table className="w-full border-collapse border border-slate-300 text-[11.5px]">
                        <thead>
                          <tr className="bg-slate-100 font-bold text-slate-900">
                            <th className="border border-slate-300 p-1 text-left">Exam / Degree</th>
                            <th className="border border-slate-300 p-1 text-left">Board / Univ</th>
                            <th className="border border-slate-300 p-1 text-center">Year</th>
                            <th className="border border-slate-300 p-1 text-center">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {educations.map((e, idx) => (
                            <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : ''}>
                              <td className="border border-slate-300 p-1 font-bold text-slate-900">{e.degree || '-'}</td>
                              <td className="border border-slate-300 p-1">{e.institution || '-'}</td>
                              <td className="border border-slate-300 p-1 text-center">{e.year || '-'}</td>
                              <td className="border border-slate-300 p-1 text-center font-bold text-slate-900">{e.percentage || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Key Strengths */}
                    {includeStrengths && (
                      <div className="space-y-1">
                        <h4 className="text-xs font-black uppercase tracking-wider" style={{ color: themeColor }}>
                          Key Strengths
                        </h4>
                        <p className="text-[12px] leading-relaxed text-slate-800">{strengths}</p>
                      </div>
                    )}

                    {/* Declaration */}
                    <div className="border-t border-slate-300 pt-2 space-y-1 text-slate-800">
                      <h4 className="text-[11px] font-black uppercase tracking-wider" style={{ color: themeColor }}>
                        Declaration
                      </h4>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        I hereby declare that all the information mentioned above is true and correct to the best of my knowledge and belief.
                      </p>
                      <div className="flex justify-between items-end pt-1.5 text-[11.5px]">
                        <div>
                          <p><span className="font-bold">Date:</span> {new Date().toLocaleDateString('en-GB')}</p>
                          <p><span className="font-bold">Place:</span> {place}</p>
                        </div>
                        <div className="text-right">
                          <div className="h-5"></div>
                          <p className="font-bold uppercase">({fullName})</p>
                          <p className="text-[10px] text-slate-400">Signature</p>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TEMPLATE 2: 🇮🇳 CYBER CAFE CLASSIC (Full Double Border & Balanced Spacing) */}
              {/* ========================================================================= */}
              {templateStyle === 'classic_border' && (
                <div
                  id="resume-print-area"
                  ref={resumePrintRef}
                  className="resume-auto-sheet bg-white w-full max-w-[580px] aspect-[210/297] rounded-lg shadow-xl text-slate-800 leading-snug flex flex-col p-4 sm:p-5 overflow-hidden select-none"
                >
                  <div className="h-full border-[3px] border-double border-slate-800 p-5 sm:p-6 rounded-xs flex flex-col justify-between overflow-hidden">
                    
                    {/* Header */}
                    <div className="border-b-2 border-slate-800 pb-2.5 shrink-0">
                      <div className="text-center mb-1.5">
                        <span className="inline-block px-4 py-0.5 border-b-2 border-slate-900 text-xl sm:text-2xl font-black tracking-[0.25em] text-slate-950 uppercase">
                          {headerTitle}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-3 pt-1">
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <h2 className={`${sizeClasses.nameText} leading-none text-slate-950`}>
                            {fullName.toUpperCase()}
                          </h2>
                          <p className={`${sizeClasses.titleText} text-slate-700`}>{jobTitle}</p>
                          <div className={`${sizeClasses.contactText} pt-1 space-y-0.5 font-medium text-slate-700`}>
                            <p className="break-words">📞 {phone} &nbsp;|&nbsp; ✉️ {email}</p>
                            <p className="break-words">📍 {address}</p>
                          </div>
                        </div>

                        {/* Official Passport Photo Box */}
                        {includePhotoBox && (
                          <div className="h-26 w-22 shrink-0 border-2 border-slate-800 bg-slate-50 flex flex-col items-center justify-center text-center p-1 shadow-xs">
                            {photoUrl ? (
                              <img src={photoUrl} alt="Passport Photo" className="w-full h-full object-cover" />
                            ) : (
                              <div className="space-y-0.5 text-slate-400">
                                <Camera className="w-4 h-4 mx-auto" />
                                <span className="text-[9px] font-bold block leading-tight text-slate-500">
                                  Passport Photo
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Middle Content Sections with Proportional Natural Spacing */}
                    <div className={`flex flex-col ${sizeClasses.sectionGap} py-2.5`}>
                      
                      {/* 1. Career Objective */}
                      <div>
                        <h4 
                          className={`${sizeClasses.headText} text-slate-950 px-2 py-0.5`}
                          style={{ backgroundColor: `${themeColor}18`, borderLeft: `5px solid ${themeColor}` }}
                        >
                          Career Objective
                        </h4>
                        <p className={`${sizeClasses.bodyText} text-slate-800 mt-1`}>{objective}</p>
                      </div>

                      {/* 2. Academic Qualifications Table */}
                      <div>
                        <h4 
                          className={`${sizeClasses.headText} text-slate-950 px-2 py-0.5`}
                          style={{ backgroundColor: `${themeColor}18`, borderLeft: `5px solid ${themeColor}` }}
                        >
                          Academic Qualifications
                        </h4>
                        <table className="mt-1 w-full border-collapse border border-slate-400">
                          <thead>
                            <tr className="bg-slate-200/90 text-slate-950">
                              <th className={`border border-slate-400 ${sizeClasses.tableHead} text-left`}>Exam / Degree</th>
                              <th className={`border border-slate-400 ${sizeClasses.tableHead} text-left`}>Board / University</th>
                              <th className={`border border-slate-400 ${sizeClasses.tableHead} text-center`}>Passing Year</th>
                              <th className={`border border-slate-400 ${sizeClasses.tableHead} text-center`}>Percentage / Div</th>
                            </tr>
                          </thead>
                          <tbody>
                            {educations.map((e, idx) => (
                              <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50' : ''}>
                                <td className={`border border-slate-400 font-bold text-slate-900 ${sizeClasses.tableCell}`}>{e.degree || '-'}</td>
                                <td className={`border border-slate-400 ${sizeClasses.tableCell}`}>{e.institution || '-'}</td>
                                <td className={`border border-slate-400 text-center ${sizeClasses.tableCell}`}>{e.year || '-'}</td>
                                <td className={`border border-slate-400 text-center font-bold text-slate-900 ${sizeClasses.tableCell}`}>{e.percentage || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* 3. Technical & Computer Skills */}
                      <div>
                        <h4 
                          className={`${sizeClasses.headText} text-slate-950 px-2 py-0.5`}
                          style={{ backgroundColor: `${themeColor}18`, borderLeft: `5px solid ${themeColor}` }}
                        >
                          Technical & Computer Skills
                        </h4>
                        <p className={`${sizeClasses.bodyText} text-slate-800 mt-1`}>{skills}</p>
                      </div>

                      {/* 4. Work Experience & Training */}
                      {includeExperience && experiences.length > 0 && (
                        <div>
                          <h4 
                            className={`${sizeClasses.headText} text-slate-950 px-2 py-0.5`}
                            style={{ backgroundColor: `${themeColor}18`, borderLeft: `5px solid ${themeColor}` }}
                          >
                            Work Experience / Professional Training
                          </h4>
                          <div className="mt-1 space-y-1">
                            {experiences.map((exp, idx) => (
                              <div key={idx} className={sizeClasses.bodyText}>
                                <div className="flex justify-between font-bold text-slate-900">
                                  <span>{exp.role || 'Senior Computer Operator'}</span>
                                  <span className="text-xs font-semibold text-slate-600">{exp.duration}</span>
                                </div>
                                <p className="font-semibold text-slate-700">{exp.company}</p>
                                {exp.description && <p className="text-slate-700">{exp.description}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 5. Key Strengths */}
                      {includeStrengths && (
                        <div>
                          <h4 
                            className={`${sizeClasses.headText} text-slate-950 px-2 py-0.5`}
                            style={{ backgroundColor: `${themeColor}18`, borderLeft: `5px solid ${themeColor}` }}
                          >
                            Key Strengths & Personal Attributes
                          </h4>
                          <p className={`${sizeClasses.bodyText} text-slate-800 mt-1`}>{strengths}</p>
                        </div>
                      )}

                      {/* 6. Personal Profile / Bio-Data Grid */}
                      <div>
                        <h4 
                          className={`${sizeClasses.headText} text-slate-950 px-2 py-0.5`}
                          style={{ backgroundColor: `${themeColor}18`, borderLeft: `5px solid ${themeColor}` }}
                        >
                          Personal Profile
                        </h4>
                        <div className={`mt-1 grid grid-cols-2 gap-x-6 gap-y-1 text-slate-900 ${sizeClasses.gridText}`}>
                          <p><span className="font-bold">Father's Name:</span> {fatherName}</p>
                          <p><span className="font-bold">Date of Birth:</span> {dob}</p>
                          <p><span className="font-bold">Gender:</span> {gender}</p>
                          <p><span className="font-bold">Marital Status:</span> {maritalStatus}</p>
                          <p><span className="font-bold">Nationality:</span> {nationality}</p>
                          <p><span className="font-bold">Languages Known:</span> {languages}</p>
                          {includeHobbies && hobbies && (
                            <p className="col-span-2"><span className="font-bold">Hobbies:</span> {hobbies}</p>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* 7. Declaration & Formal Signature Block */}
                    <div className="border-t-2 border-slate-800 pt-2 shrink-0 text-slate-800 space-y-1 mt-auto">
                      <h4 
                        className={`${sizeClasses.headText} text-slate-950 px-2 py-0.5`}
                        style={{ backgroundColor: `${themeColor}18`, borderLeft: `5px solid ${themeColor}` }}
                      >
                        Declaration
                      </h4>
                      <p className={`${sizeClasses.bodyText} text-slate-700`}>
                        I hereby declare that all the information mentioned above is true and correct to the best of my knowledge and belief.
                      </p>
                      <div className={`flex justify-between items-end pt-1.5 ${sizeClasses.signText}`}>
                        <div className="space-y-0.5">
                          <p><span className="font-bold text-slate-950">Date:</span> {new Date().toLocaleDateString('en-GB')}</p>
                          <p><span className="font-bold text-slate-950">Place:</span> {place}</p>
                        </div>
                        <div className="text-right">
                          <div className={sizeClasses.signGap}></div>
                          <p className="font-black text-slate-950 uppercase">({fullName})</p>
                          <p className="text-[11px] text-slate-500 font-medium">Candidate Signature</p>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TEMPLATE 3: 📄 CORPORATE EXECUTIVE (Clean Banner & Accent Dividers)      */}
              {/* ========================================================================= */}
              {templateStyle === 'executive' && (
                <div
                  id="resume-print-area"
                  ref={resumePrintRef}
                  className="resume-auto-sheet bg-white w-full max-w-[580px] aspect-[210/297] rounded-lg shadow-xl text-slate-800 leading-snug flex flex-col overflow-hidden border border-slate-400 select-none"
                >
                  {/* Top Colored Header Banner */}
                  <div 
                    className="p-6 text-white shrink-0"
                    style={{ backgroundColor: themeColor }}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{fullName.toUpperCase()}</h1>
                        <p className="text-xs sm:text-sm font-semibold opacity-90">{jobTitle}</p>
                      </div>
                      {photoUrl && (
                        <div className="w-20 h-24 rounded-md overflow-hidden border-2 border-white/80 shadow-md">
                          <img src={photoUrl} alt="Photo" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-2 border-t border-white/20 text-xs flex flex-wrap gap-x-4 gap-y-1 font-medium opacity-90">
                      <span>📞 {phone}</span>
                      <span>✉️ {email}</span>
                      <span>📍 {address}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider pb-1 border-b-2" style={{ color: themeColor, borderColor: themeColor }}>
                          Profile Summary
                        </h3>
                        <p className="text-[12.5px] leading-relaxed text-slate-700 mt-1">{objective}</p>
                      </div>

                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider pb-1 border-b-2" style={{ color: themeColor, borderColor: themeColor }}>
                          Academic Qualifications
                        </h3>
                        <table className="w-full mt-1.5 border-collapse border border-slate-300 text-xs">
                          <thead>
                            <tr className="bg-slate-100 font-bold">
                              <th className="border border-slate-300 p-1.5 text-left">Exam / Degree</th>
                              <th className="border border-slate-300 p-1.5 text-left">Institution / Board</th>
                              <th className="border border-slate-300 p-1.5 text-center">Year</th>
                              <th className="border border-slate-300 p-1.5 text-center">%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {educations.map((e, idx) => (
                              <tr key={idx}>
                                <td className="border border-slate-300 p-1.5 font-bold">{e.degree}</td>
                                <td className="border border-slate-300 p-1.5">{e.institution}</td>
                                <td className="border border-slate-300 p-1.5 text-center">{e.year}</td>
                                <td className="border border-slate-300 p-1.5 text-center font-bold">{e.percentage}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider pb-1 border-b-2" style={{ color: themeColor, borderColor: themeColor }}>
                          Technical & Core Skills
                        </h3>
                        <p className="text-[12.5px] text-slate-700 mt-1">{skills}</p>
                      </div>

                      {includeExperience && experiences.length > 0 && (
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider pb-1 border-b-2" style={{ color: themeColor, borderColor: themeColor }}>
                            Work Experience
                          </h3>
                          <div className="mt-1 space-y-1 text-[12px]">
                            {experiences.map((exp, idx) => (
                              <div key={idx}>
                                <p className="font-bold text-slate-900">{exp.role} — <span className="font-semibold text-slate-600">{exp.company}</span> ({exp.duration})</p>
                                <p className="text-slate-600">{exp.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider pb-1 border-b-2" style={{ color: themeColor, borderColor: themeColor }}>
                          Personal Details
                        </h3>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 mt-1">
                          <p><span className="font-bold">Father:</span> {fatherName}</p>
                          <p><span className="font-bold">DOB:</span> {dob}</p>
                          <p><span className="font-bold">Gender:</span> {gender}</p>
                          <p><span className="font-bold">Languages:</span> {languages}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-3 flex justify-between items-end text-xs text-slate-700">
                      <div>
                        <p><span className="font-bold">Date:</span> {new Date().toLocaleDateString('en-GB')}</p>
                        <p><span className="font-bold">Place:</span> {place}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900 uppercase">({fullName})</p>
                        <p className="text-[10px] text-slate-400">Signature</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TEMPLATE 4: 📜 SHUDDH BIO-DATA (Traditional Tabular Format)               */}
              {/* ========================================================================= */}
              {templateStyle === 'biodata' && (
                <div
                  id="resume-print-area"
                  ref={resumePrintRef}
                  className="resume-auto-sheet bg-white w-full max-w-[580px] aspect-[210/297] rounded-lg shadow-xl text-slate-800 leading-snug flex flex-col p-5 overflow-hidden border border-slate-400 select-none"
                >
                  <div className="h-full border-2 border-slate-900 p-5 flex flex-col justify-between overflow-hidden">
                    <div>
                      <div className="text-center pb-2 border-b-2 border-slate-900">
                        <h1 className="text-2xl font-black tracking-widest text-slate-950 uppercase">BIO - DATA</h1>
                      </div>

                      <div className="flex justify-between items-start pt-3 pb-2">
                        <table className="w-[75%] text-xs border-collapse">
                          <tbody>
                            <tr><td className="font-bold py-1 w-36">Name</td><td>: {fullName}</td></tr>
                            <tr><td className="font-bold py-1">Father's Name</td><td>: {fatherName}</td></tr>
                            <tr><td className="font-bold py-1">Date of Birth</td><td>: {dob}</td></tr>
                            <tr><td className="font-bold py-1">Gender</td><td>: {gender}</td></tr>
                            <tr><td className="font-bold py-1">Marital Status</td><td>: {maritalStatus}</td></tr>
                            <tr><td className="font-bold py-1">Nationality</td><td>: {nationality}</td></tr>
                            <tr><td className="font-bold py-1">Mobile No</td><td>: {phone}</td></tr>
                            <tr><td className="font-bold py-1">Email</td><td>: {email}</td></tr>
                            <tr><td className="font-bold py-1">Address</td><td>: {address}</td></tr>
                            <tr><td className="font-bold py-1">Languages Known</td><td>: {languages}</td></tr>
                          </tbody>
                        </table>

                        <div className="w-24 h-28 border-2 border-slate-800 bg-slate-50 flex items-center justify-center text-center p-1">
                          {photoUrl ? (
                            <img src={photoUrl} alt="Photo" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400">Photo Here</span>
                          )}
                        </div>
                      </div>

                      {/* Educational Qualification */}
                      <div className="mt-3">
                        <h4 className="text-xs font-black uppercase tracking-wide bg-slate-200 p-1 border border-slate-400">
                          Educational Qualifications
                        </h4>
                        <table className="w-full border-collapse border border-slate-400 text-xs mt-1">
                          <thead>
                            <tr className="bg-slate-100 font-bold">
                              <th className="border border-slate-400 p-1 text-left">Exam / Degree</th>
                              <th className="border border-slate-400 p-1 text-left">Board / University</th>
                              <th className="border border-slate-400 p-1 text-center">Year</th>
                              <th className="border border-slate-400 p-1 text-center">% / Div</th>
                            </tr>
                          </thead>
                          <tbody>
                            {educations.map((e, idx) => (
                              <tr key={idx}>
                                <td className="border border-slate-400 p-1 font-bold">{e.degree}</td>
                                <td className="border border-slate-400 p-1">{e.institution}</td>
                                <td className="border border-slate-400 p-1 text-center">{e.year}</td>
                                <td className="border border-slate-400 p-1 text-center font-bold">{e.percentage}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Other Details */}
                      <div className="mt-3 space-y-1.5 text-xs">
                        <p><span className="font-bold">Computer & Technical Skills:</span> {skills}</p>
                        {includeExperience && experiences.length > 0 && (
                          <p><span className="font-bold">Work Experience:</span> {experiences.map(e => `${e.role} at ${e.company} (${e.duration})`).join('; ')}</p>
                        )}
                        {includeStrengths && (
                          <p><span className="font-bold">Key Strengths:</span> {strengths}</p>
                        )}
                        {includeHobbies && hobbies && (
                          <p><span className="font-bold">Hobbies:</span> {hobbies}</p>
                        )}
                      </div>
                    </div>

                    {/* Declaration */}
                    <div className="border-t-2 border-slate-800 pt-2 text-xs">
                      <p className="text-[11px] text-slate-700">
                        I hereby declare that all the particulars stated in this bio-data are true and correct to the best of my knowledge and belief.
                      </p>
                      <div className="flex justify-between items-end pt-3">
                        <div>
                          <p><span className="font-bold">Date:</span> {new Date().toLocaleDateString('en-GB')}</p>
                          <p><span className="font-bold">Place:</span> {place}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold uppercase">({fullName})</p>
                          <p className="text-[10px] text-slate-500">Signature</p>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
