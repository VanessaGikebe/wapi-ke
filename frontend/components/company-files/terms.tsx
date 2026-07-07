import Link from "next/link";

export function TermsContent() {
  return (
    <>
      <h1 className="mb-3 font-display-lg-mobile text-display-lg-mobile text-primary md:font-display-lg md:text-display-lg">
        Terms &amp; Conditions
      </h1>
      <p className="mb-10 font-body-lg text-body-lg text-on-surface-variant">
        Last updated: January 2026
      </p>

      <section className="mb-10">
        <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
          1. Acceptance of Terms
        </h2>
        <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
          By accessing or using Wapike (&quot;the Platform&quot;), you agree to be
          bound by these Terms &amp; Conditions (&quot;Terms&quot;) and our Privacy
          Policy. If you disagree with any part of these terms, you may not access
          the Platform.
        </p>
        <p className="font-body-md text-body-md text-on-surface-variant">
          We reserve the right to modify these terms at any time. Your continued use
          of the Platform after changes constitutes acceptance of the updated terms.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
          2. Description of Service
        </h2>
        <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
          Wapike is a discovery platform that connects users with experiences,
          restaurants, events, and activities across Kenya. Our services include:
        </p>
        <ul className="ml-6 list-disc font-body-md text-body-md text-on-surface-variant">
          <li>Browsing and discovering experiences and venues</li>
          <li>Accessing AI-powered recommendations</li>
          <li>Saving favorite experiences to your account</li>
          <li>Submitting booking requests to experience providers</li>
          <li>Reading and writing reviews</li>
          <li>Receiving newsletters and promotional content</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
          3. User Accounts
        </h2>

        <h3 className="mb-2 font-label-md text-label-md uppercase tracking-wider text-primary">
          3.1 Account Creation
        </h3>
        <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
          To access certain features, you must create an account. You agree to
          provide accurate, current, and complete information during registration and
          to update such information to keep it accurate, current, and complete.
        </p>

        <h3 className="mb-2 font-label-md text-label-md uppercase tracking-wider text-primary">
          3.2 Account Security
        </h3>
        <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
          You are responsible for maintaining the confidentiality of your account
          credentials and for all activities that occur under your account. You agree
          to notify us immediately of any unauthorized use of your account or any
          other breach of security.
        </p>

        <h3 className="mb-2 font-label-md text-label-md uppercase tracking-wider text-primary">
          3.3 Account Termination
        </h3>
        <p className="font-body-md text-body-md text-on-surface-variant">
          We reserve the right to suspend or terminate your account at any time for
          any reason, including violation of these Terms or fraudulent activity.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
          4. User Conduct
        </h2>
        <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
          You agree not to use the Platform for any purpose that is unlawful or
          prohibited by these Terms. You agree not to:
        </p>
        <ul className="ml-6 list-disc font-body-md text-body-md text-on-surface-variant">
          <li>Use the platform for any fraudulent or deceptive purpose</li>
          <li>Impersonate any person or entity or misrepresent your affiliation</li>
          <li>Submit false or misleading information</li>
          <li>Violate any applicable laws or regulations</li>
          <li>Infringe on the intellectual property rights of others</li>
          <li>Harass, abuse, or harm other users or experience providers</li>
          <li>Submit malicious code, viruses, or harmful content</li>
          <li>Attempt to gain unauthorized access to our systems</li>
          <li>Interfere with or disrupt the Platform or servers</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
          5. Bookings and Reservations
        </h2>

        <h3 className="mb-2 font-label-md text-label-md uppercase tracking-wider text-primary">
          5.1 Booking Requests
        </h3>
        <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
          When you submit a booking request through the Platform, you are making a
          request to the experience provider. Wapike facilitates this request but
          does not guarantee availability or confirmation.
        </p>

        <h3 className="mb-2 font-label-md text-label-md uppercase tracking-wider text-primary">
          5.2 Payment Terms
        </h3>
        <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
          Payment terms are determined by individual experience providers. Wapike
          may process payments on behalf of providers, but all payment disputes
          should be resolved directly with the provider.
        </p>

        <h3 className="mb-2 font-label-md text-label-md uppercase tracking-wider text-primary">
          5.3 Cancellations and Refunds
        </h3>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Cancellation and refund policies vary by experience provider. Please review
          the specific policy for each experience before booking. Wapike is not
          responsible for provider cancellation policies or refund decisions.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
          6. Intellectual Property
        </h2>

        <h3 className="mb-2 font-label-md text-label-md uppercase tracking-wider text-primary">
          6.1 Platform Content
        </h3>
        <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
          The Platform, including its design, text, graphics, logos, and software,
          is owned by Wapike and protected by intellectual property laws. You may
          not reproduce, modify, or distribute any content without our written
          permission.
        </p>

        <h3 className="mb-2 font-label-md text-label-md uppercase tracking-wider text-primary">
          6.2 User Content
        </h3>
        <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
          By submitting content (reviews, photos, comments) to the Platform, you grant
          Wapike a non-exclusive, worldwide, royalty-free license to use, display,
          and distribute such content. You represent that you own or have permission
          to use all content you submit.
        </p>

        <h3 className="mb-2 font-label-md text-label-md uppercase tracking-wider text-primary">
          6.3 Provider Content
        </h3>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Experience providers retain ownership of their listings and content. By
          listing on Wapike, providers grant us a license to display and promote
          their offerings on the Platform.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
          7. Disclaimers and Warranties
        </h2>
        <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
          The Platform is provided on an &quot;as is&quot; and &quot;as available&quot;
          basis without warranties of any kind, either express or implied. We do not
          guarantee that the Platform will be uninterrupted, secure, or error-free.
        </p>
        <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
          Wapike does not endorse, guarantee, or assume responsibility for any
          experiences, services, or products offered by third-party providers. All
          transactions are between you and the experience provider.
        </p>
        <p className="font-body-md text-body-md text-on-surface-variant">
          We disclaim all warranties, whether express or implied, including but not
          limited to implied warranties of merchantability, fitness for a particular
          purpose, and non-infringement.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
          8. Limitation of Liability
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          To the fullest extent permitted by law, Wapike shall not be liable for any
          indirect, incidental, special, consequential, or punitive damages,
          including without limitation, loss of profits, data, use, goodwill, or
          other intangible losses, resulting from your access to or use of the
          Platform.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
          9. Indemnification
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          You agree to indemnify and hold harmless Wapike, its officers, directors,
          employees, and agents from any claims, damages, or expenses arising from
          your use of the Platform, violation of these Terms, or infringement of any
          third-party rights.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
          10. Governing Law
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          These Terms shall be governed by and construed in accordance with the laws
          of Kenya. Any disputes arising under these Terms shall be subject to the
          exclusive jurisdiction of the courts of Kenya.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
          11. Dispute Resolution
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          In the event of a dispute between you and Wapike, we agree to attempt to
          resolve the dispute through good faith negotiation. If negotiation fails,
          either party may seek resolution through appropriate legal channels.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
          12. Privacy
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Your use of the Platform is also governed by our Privacy Policy, which
          describes how we collect, use, and protect your personal information. Please
          review our Privacy Policy{" "}
          <Link
            href="/privacy-policy"
            className="rounded text-secondary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
          >
            here
          </Link>
          .
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
          13. General Provisions
        </h2>

        <h3 className="mb-2 font-label-md text-label-md uppercase tracking-wider text-primary">
          13.1 Entire Agreement
        </h3>
        <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
          These Terms constitute the entire agreement between you and Wapike
          regarding the Platform and supersede all prior agreements.
        </p>

        <h3 className="mb-2 font-label-md text-label-md uppercase tracking-wider text-primary">
          13.2 Severability
        </h3>
        <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
          If any provision of these Terms is found to be unenforceable, the
          remaining provisions shall remain in full force and effect.
        </p>

        <h3 className="mb-2 font-label-md text-label-md uppercase tracking-wider text-primary">
          13.3 Waiver
        </h3>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Failure to enforce any provision of these Terms shall not constitute a
          waiver of such provision or any other provision.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
          14. Contact Information
        </h2>
        <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
          If you have any questions about these Terms, please contact us:
        </p>
        <ul className="ml-6 list-disc font-body-md text-body-md text-on-surface-variant">
          <li>Email:{" "}
            <a
              href="mailto:legal@wapike.co.ke"
              className="rounded text-secondary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            >
              legal@wapike.co.ke
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