import StaticPage from "@/components/StaticPage";

const Privacy = () => (
  <StaticPage
    title="Privacy Policy — ShareKart"
    description="How ShareKart collects, uses, and protects your personal data on our community marketplace."
    path="/privacy"
    heading="Privacy Policy"
  >
    <p className="text-sm text-muted-foreground">Last updated: May 2026</p>

    <h2 className="text-xl font-bold mt-6">1. Information We Collect</h2>
    <p>
      We collect information you provide when creating an account (name, email, phone), listing
      items (titles, photos, location), completing KYC verification, and communicating with
      other users via chat.
    </p>

    <h2 className="text-xl font-bold mt-6">2. How We Use Your Data</h2>
    <p>
      Your data is used to operate the marketplace: matching buyers and sellers, processing
      orders, enabling chat, preventing fraud, and improving the platform.
    </p>

    <h2 className="text-xl font-bold mt-6">3. Sharing</h2>
    <p>
      We share limited information (such as first name and shop name) with other users to
      facilitate transactions. We never sell your personal data.
    </p>

    <h2 className="text-xl font-bold mt-6">4. Security</h2>
    <p>
      Data is stored on encrypted infrastructure with row-level security. KYC documents are
      accessible only to admins for verification purposes.
    </p>

    <h2 className="text-xl font-bold mt-6">5. Your Rights</h2>
    <p>
      You may access, update, or delete your account at any time from your profile. Contact{" "}
      <a className="text-primary hover:underline" href="mailto:kundanroy3290@gmail.com">
        kundanroy3290@gmail.com
      </a>{" "}
      for data requests.
    </p>
  </StaticPage>
);

export default Privacy;
