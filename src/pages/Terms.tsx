import StaticPage from "@/components/StaticPage";

const Terms = () => (
  <StaticPage
    title="Terms of Service — ShareKart"
    description="The rules for using ShareKart, our peer-to-peer marketplace for renting, selling, and donating."
    path="/terms"
    heading="Terms of Service"
  >
    <p className="text-sm text-muted-foreground">Last updated: June 2026</p>

    <h2 className="text-xl font-bold mt-6">1. Acceptance</h2>
    <p>By using ShareKart, you agree to these Terms. If you do not agree, please do not use the platform.</p>

    <h2 className="text-xl font-bold mt-6">2. Eligibility</h2>
    <p>You must be at least 18 years old and able to enter binding contracts. Completing KYC is required for sellers.</p>

    <h2 className="text-xl font-bold mt-6">3. Nature of the Platform</h2>
    <p>
      ShareKart is a <strong>peer-to-peer marketplace only</strong>. We do not own, possess,
      inspect, store, deliver, or guarantee any item listed. All transactions happen{" "}
      <strong>directly between users</strong>. ShareKart is neither a party to the transaction
      nor an agent, escrow holder, insurer, or broker.
    </p>

    <h2 className="text-xl font-bold mt-6">4. Listings & User Conduct</h2>
    <p>
      You are responsible for the accuracy of your listings. Photos must be captured from your
      device camera, not uploaded from galleries. The following are strictly prohibited:
    </p>
    <ul className="list-disc pl-6 space-y-1">
      <li>Weapons, ammunition, explosives</li>
      <li>Drugs, tobacco, alcohol, prescription medication</li>
      <li>Counterfeit, stolen, or recalled goods</li>
      <li>Living animals, human remains, body parts</li>
      <li>Adult / sexually explicit content</li>
      <li>Hazardous, regulated, or government-restricted items</li>
      <li>Misleading, fraudulent, or impersonating listings</li>
    </ul>

    <h2 className="text-xl font-bold mt-6">5. Limitation of Liability</h2>
    <p>
      To the maximum extent permitted by law, <strong>ShareKart, its founders, employees and
      affiliates are not liable</strong> for any direct, indirect, incidental, consequential,
      or punitive damages, including but not limited to: loss of money, item damage, theft,
      injury, fraud, defects, no-shows, or disputes between users. You use the platform{" "}
      <strong>at your own risk</strong>.
    </p>

    <h2 className="text-xl font-bold mt-6">6. Disclaimer of Warranties</h2>
    <p>
      The platform is provided "as is" and "as available", without warranty of any kind. We do
      not warrant the accuracy of listings, reliability of users, or that the service will be
      uninterrupted or error-free.
    </p>

    <h2 className="text-xl font-bold mt-6">7. Payments & Escrow</h2>
    <p>
      Online escrow / in-app payment protection is <strong>under development</strong>. Until
      launched, all payments are exchanged offline directly between buyer and seller.
      ShareKart does not collect, hold, or refund any payment.
    </p>

    <h2 className="text-xl font-bold mt-6">8. Safety</h2>
    <p>
      Always meet in safe, public, well-lit places. Verify items before paying. Use the OTP
      handover. Report suspicious users via the in-app Report button.
    </p>

    <h2 className="text-xl font-bold mt-6">9. Indemnity</h2>
    <p>
      You agree to indemnify and hold ShareKart harmless from any claim, damage, or expense
      arising from your listings, your transactions, or your violation of these Terms or any
      law.
    </p>

    <h2 className="text-xl font-bold mt-6">10. Moderation</h2>
    <p>
      The platform owner reserves full rights to edit, hide, warn, suspend, or permanently
      remove any listing, account, review, message, or content — at sole discretion and
      without notice — to protect the community or enforce these Terms.
    </p>

    <h2 className="text-xl font-bold mt-6">11. Governing Law</h2>
    <p>
      These Terms are governed by the laws of India. Any disputes are subject to the
      exclusive jurisdiction of courts in Bihar, India.
    </p>

    <h2 className="text-xl font-bold mt-6">12. Contact</h2>
    <p>
      Questions? Email{" "}
      <a className="text-primary underline" href="mailto:kundanroy3290@gmail.com">
        kundanroy3290@gmail.com
      </a>
    </p>
  </StaticPage>
);

export default Terms;
