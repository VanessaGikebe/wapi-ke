import Link from "next/link";

export function PrivacyPolicyContent() {
  return (
    <>
      <h1 className="mb-3 font-display-lg-mobile text-display-lg-mobile text-primary md:font-display-lg md:text-display-lg">
        Privacy Policy
      </h1>
      <p className="mb-10 font-body-lg text-body-lg text-on-surface-variant">
        Last updated: January 2026
      </p>

      <section className="mb-10">
        <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
          1. Introduction
        </h2>
        <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
          Welcome to Wapike (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We
          respect your privacy and are committed to protecting your personal data.
          This privacy policy explains how we collect, use, disclose, and safeguard
          your information when you use our platform.
        </p>
        <p className="font-body-md text-body-md text-on-surface-variant">
          By using Wapike, you agree to the collection and use of information in
          accordance with this policy.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
          2. Information We Collect
        </h2>

        <h3 className="mb-2 font-label-md text-label-md uppercase tracking-wider text-primary">
          2.1 Personal Information
        </h3>
        <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
          We may collect personal identification information such as:
        </p>
        <ul className="mb-6 ml-6 list-disc font-body-md text-body-md text-on-surface-variant">
          <li>Name and email address</li>
          <li>Phone number</li>
          <li>Account credentials (username, password)</li>
          <li>Profile information and preferences</li>
          <li>Payment information (processed securely through third-party providers)</li>
        </ul>

        <h3 className="mb-2 font-label-md text-label-md uppercase tracking-wider text-primary">
          2.2 Usage Data
        </h3>
        <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
          We automatically collect information about your use of our platform,
          including:
        </p>
        <ul className="mb-6 ml-6 list-disc font-body-md text-body-md text-on-surface-variant">
          <li>Pages visited and time spent on pages</li>
          <li>Search queries and filters used</li>
          <li>Experiences viewed, saved, or booked</li>
          <li>Device information and IP address</li>
          <li>Browser type and operating system</li>
        </ul>

        <h3 className="mb-2 font-label-md text-label-md uppercase tracking-wider text-primary">
          2.3 Cookies and Tracking Technologies
        </h3>
        <p className="font-body-md text-body-md text-on-surface-variant">
          We use cookies and similar tracking technologies to track activity on our
          platform and hold certain information. Cookies are files with a small amount
          of data which may include an anonymous unique identifier.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
          3. How We Use Your Information
        </h2>
        <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
          We use the information we collect to:
        </p>
        <ul className="ml-6 list-disc font-body-md text-body-md text-on-surface-variant">
          <li>Provide, maintain, and improve our services</li>
          <li>Process bookings and transactions</li>
          <li>Send you technical notices and support messages</li>
          <li>Respond to your comments, questions, and requests</li>
          <li>Personalize your experience and recommend relevant experiences</li>
          <li>Communicate with you about products, services, and promotional offers</li>
          <li>Monitor and analyze trends, usage, and activities</li>
          <li>Detect, prevent, and address technical issues and fraud</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
          4. Information Sharing
        </h2>
        <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
          We may share your personal information with:
        </p>
        <ul className="mb-6 ml-6 list-disc font-body-md text-body-md text-on-surface-variant">
          <li>
            <strong>Experience Providers:</strong> To facilitate bookings and
            reservations with businesses listed on our platform
          </li>
          <li>
            <strong>Service Providers:</strong> Third-party companies that perform
            services on our behalf (e.g., payment processing, data analytics, email
            delivery)
          </li>
          <li>
            <strong>Business Partners:</strong> With your consent, we may share
            information with partners for marketing purposes
          </li>
          <li>
            <strong>Legal Requirements:</strong> When required by law or to protect
            our rights, property, or safety
          </li>
        </ul>
        <p className="font-body-md text-body-md text-on-surface-variant">
          We do not sell your personal information to third parties for their
          marketing purposes without your explicit consent.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
          5. Data Security
        </h2>
        <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
          We implement appropriate technical and organizational measures to protect
          your personal information against unauthorized access, alteration,
          disclosure, or destruction. However, no method of transmission over the
          internet is 100% secure.
        </p>
        <p className="font-body-md text-body-md text-on-surface-variant">
          We use industry-standard encryption for data transmission and storage,
          and regularly review our security practices to ensure they remain effective.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
          6. Your Rights
        </h2>
        <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
          You have the right to:
        </p>
        <ul className="mb-6 ml-6 list-disc font-body-md text-body-md text-on-surface-variant">
          <li>Access and review your personal information</li>
          <li>Request correction of inaccurate information</li>
          <li>Request deletion of your personal information</li>
          <li>Opt-out of marketing communications</li>
          <li>Object to processing of your personal information</li>
          <li>Request data portability</li>
        </ul>
        <p className="font-body-md text-body-md text-on-surface-variant">
          To exercise these rights, please contact us at{" "}
          <a
            href="mailto:privacy@wapike.co.ke"
            className="rounded text-secondary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
          >
            privacy@wapike.co.ke
          </a>
          .
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
          7. Data Retention
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          We retain your personal information for as long as necessary to provide
          our services and fulfill the purposes outlined in this policy. When you
          delete your account, we will delete your personal information unless we are
          required to retain it for legal, security, or legitimate business purposes.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
          8. Third-Party Links
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Our platform may contain links to third-party websites or services. We are
          not responsible for the privacy practices of such third parties. We
          encourage you to review the privacy policies of any third-party sites you
          visit.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
          9. Children&apos;s Privacy
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Our services are not intended for children under the age of 13. We do not
          knowingly collect personal information from children under 13. If you are a
          parent or guardian and believe your child has provided us with personal
          information, please contact us immediately.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
          10. Changes to This Policy
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          We may update our privacy policy from time to time. We will notify you of
          any changes by posting the new policy on this page and updating the
          &quot;Last updated&quot; date. You are advised to review this policy
          periodically for any changes.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
          11. Contact Us
        </h2>
        <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
          If you have any questions about this privacy policy or our data practices,
          please contact us:
        </p>
        <ul className="ml-6 list-disc font-body-md text-body-md text-on-surface-variant">
          <li>Email:{" "}
            <a
              href="mailto:privacy@wapike.co.ke"
              className="rounded text-secondary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            >
              privacy@wapike.co.ke
            </a>
          </li>
          <li>Email:{" "}
            <a
              href="mailto:hello@wapike.co.ke"
              className="rounded text-secondary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            >
              hello@wapike.co.ke
            </a>
          </li>
        </ul>
      </section>
    </>
  );
}