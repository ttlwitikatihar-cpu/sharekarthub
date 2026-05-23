import StaticPage from "@/components/StaticPage";

const Terms = () => (
  <StaticPage
    title="Terms of Service — ShareKart"
    description="The rules for using ShareKart, our peer-to-peer marketplace for renting, selling, and donating."
    path="/terms"
    heading="Terms of Service"
  >
    <p className="text-sm text-muted-foreground">Last updated: May 2026</p>

    <h2 className="text-xl font-bold mt-6">1. Acceptance</h2>
    <p>By using ShareKart, you agree to these Terms. If you do not agree, please do not use the platform.</p>

    <h2 className="text-xl font-bold mt-6">2. Eligibility</h2>
    <p>You must be at least 18 years old and able to enter binding contracts. Completing KYC is required for sellers.</p>

    <h2 className="text-xl font-bold mt-6">3. Listings</h2>
    <p>
      You are responsible for the accuracy of your listings. Photos must be captured from your
      device camera, not uploaded from galleries. Prohibited items (weapons, illegal goods,
      counterfeit products) will be removed and accounts may be suspended.
    </p>

    <h2 className="text-xl font-bold mt-6">4. Transactions</h2>
    <p>
      ShareKart facilitates connections between buyers and sellers. We do not handle logistics.
      Users coordinate handover directly via the integrated chat and OTP verification.
    </p>

    <h2 className="text-xl font-bold mt-6">5. Fraud & Suspension</h2>
    <p>
      Fraudulent activity, fake listings, or abuse will result in immediate suspension and
      removal of listings. Repeated violations result in a permanent ban.
    </p>

    <h2 className="text-xl font-bold mt-6">6. Liability</h2>
    <p>
      ShareKart is a marketplace platform. We are not responsible for the quality, safety, or
      legality of items listed by users.
    </p>
  </StaticPage>
);

export default Terms;
