import { Panel, PostmarkBadge } from '@/components/ui';

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
    <Panel label="Route Sheet" className="space-y-2">
      <h2 className="text-xl font-mono font-bold text-ink mb-8">Mail Merge Tutorial</h2>
      <ol className="space-y-2">
        {steps.map((step, index) => (
          <li key={index} className="relative flex flex-col md:flex-row items-start gap-6 pb-10 last:pb-0">
            {index < steps.length - 1 && (
              <span aria-hidden="true" className="hidden md:block absolute left-[23px] top-12 bottom-0 w-px border-l border-dashed border-line" />
            )}
            <PostmarkBadge className="relative z-10 w-12 h-12 font-mono font-bold text-lg bg-paper-raised">
              {index + 1}
            </PostmarkBadge>
            <div className="flex-1 min-w-0">
              <h3 className="font-mono font-bold text-ink mb-1">{step.title}</h3>
              <p className="text-ink-soft mb-4 leading-relaxed text-sm">{step.description}</p>
              <div className="inline-block p-2 bg-paper-sunken/50 border border-line rounded-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={step.image} alt={`Tutorial for ${step.title}`} className="w-full h-auto object-cover rounded-[1px] max-w-xl" />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
