const steps = [
  { title: "Open Outlook", description: "Open the classic desktop app version of Outlook.", image: "/images/tutorial_step_1.png" },
  { title: "Prepare Your Spreadsheet", description: "Get your contact list ready in a CSV or XLSX file. If you're starting from scratch, use the 'Download Template Spreadsheet' button on our website to get a file with the correct headers. Add your data to it and save.", image: "/images/tutorial_step_2.png" },
  { title: "Upload and Clean Your List", description: "On our website, upload your spreadsheet in the 'Upload Your List' section. After it's analyzed, click 'Download Cleaned List' and save the new `cleaned_...` file.", image: "/images/tutorial_step_3.png" },
  { title: "Download Your Word Template", description: "Go to the 'Prepare Your Template' section on our website. Choose a template from the list and click 'Download as Word Document'.", image: "/images/tutorial_step_4.png" },
  { title: "Connect Your List in Word", description: "Open the downloaded Word document. Go to the 'Mailings' tab and click 'Select Recipients' > 'Use an Existing List...'. Find and select the `cleaned_...` file you just downloaded.", image: "/images/tutorial_step_5.png" },
  { title: "Insert Merge Fields", description: "In your Word document, click where you want personalized info (e.g., after 'Dear '). On the 'Mailings' tab, click 'Insert Merge Field' and choose a column name from your list (e.g., `First_Name`).", image: "/images/tutorial_step_6.png" },
  { title: "Finish & Merge", description: "Click 'Finish & Merge' and select 'Send Email Messages...'.", image: "/images/tutorial_step_7.png" },
  { title: "Send Your Emails", description: "In the final pop-up, set the 'To:' dropdown to your email column (e.g., `BCRI_Email_`). Add your subject line and click OK to send.", image: "/images/tutorial_step_8.png" },
];

export default function TutorialPage() {
  return (
    <div className="bg-slate-900/50 backdrop-blur-xl p-6 md:p-8 rounded-2xl border border-slate-800 shadow-2xl shadow-black/30 space-y-10">
      <h2 className="text-2xl font-bold text-white">Mail Merge Tutorial</h2>
      {steps.map((step, index) => (
        <div key={index} className="flex flex-col md:flex-row items-start gap-6">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-600/30">{index + 1}</div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-white mb-1">{step.title}</h3>
            <p className="text-gray-400 mb-4">{step.description}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={step.image} alt={`Tutorial for ${step.title}`} className="w-full h-auto object-cover bg-gray-900/50 border border-gray-700 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
