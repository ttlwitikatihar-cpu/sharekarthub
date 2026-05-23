import StaticPage from "@/components/StaticPage";
import { Scale } from "lucide-react";

const Disputes = () => (
  <StaticPage
    title="Dispute Resolution — ShareKart Trust & Safety"
    description="Report fraud, fake listings, or bad actors. ShareKart's admin team reviews every report."
    path="/trust/disputes"
    heading="Dispute Resolution"
  >
    <div className="flex items-center gap-2 text-primary">
      <Scale className="h-5 w-5" />
      <span className="font-semibold">Fair, fast, transparent</span>
    </div>
    <p>
      If something goes wrong — a fake listing, a no-show seller, or suspected fraud — you can
      report it directly from the listing or chat. Our admin team reviews every report.
    </p>
    <h2 className="text-xl font-bold mt-6">What we do</h2>
    <ul className="list-disc pl-6 space-y-2">
      <li>Review all reports within 24–48 hours</li>
      <li>Suspend accounts found to be engaging in fraud</li>
      <li>Remove fraudulent listings immediately</li>
      <li>Ban repeat offenders permanently</li>
    </ul>
    <h2 className="text-xl font-bold mt-6">Report an issue</h2>
    <p>
      Use the report button on any listing or chat, or email{" "}
      <a className="text-primary hover:underline" href="mailto:kundanroy3290@gmail.com">
        kundanroy3290@gmail.com
      </a>{" "}
      with details and screenshots.
    </p>
  </StaticPage>
);

export default Disputes;
