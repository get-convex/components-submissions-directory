// Get base path for links (always /components)
function useBasePath() {
  return "/components";
}

export function FAQSection() {
  const basePath = useBasePath();
  return (
    <section id="faq" className="mt-12 pt-8 border-t border-border">
      <h2 className="text-lg font-semibold text-text-primary mb-4">
        Frequently Asked Questions
      </h2>
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-text-primary">
            What happens after I submit?
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            Submissions are reviewed on a rolling basis. We check for common errors and ensure your component complies with our{" "}
            <a
              href="https://docs.convex.dev/components/authoring"
              target="_blank"
              rel="noopener noreferrer"
              className="text-button hover:underline">
              authoring guidelines
            </a>.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-text-primary">
            What are the requirements?
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            Components must be published on npm, have a public GitHub repository, and follow the{" "}
            <a
              href="https://docs.convex.dev/components/authoring"
              target="_blank"
              rel="noopener noreferrer"
              className="text-button hover:underline">
              Authoring Components
            </a>{" "}
            guidelines.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-text-primary">
            How are components sandboxed?
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            The Convex runtime ensures that component tables do not get mixed in with your app's tables. It also ensures that when the component runs its own Convex functions, they are not allowed to access your app's tables without explicit API calls.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-text-primary">
            What projects should use Components?
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            If you see a feature listed above, feel free to use it. Check each component's documentation for further guidance.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-text-primary">
            Can I build my own?
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            Yes! Check out the{" "}
            <a
              href="https://docs.convex.dev/components/authoring"
              target="_blank"
              rel="noopener noreferrer"
              className="text-button hover:underline">
              component authoring docs
            </a>{" "}
            to get started. Components let you package Convex functions, schemas, and persistent state into reusable modules that you or other developers can drop into any project.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-text-primary">
            Do components cost money to use?
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            Components are open source and are just code and data in your existing backend. They incur relevant usage charges based on how they are implemented and used.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-text-primary">
            Can I update my submission?
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            Yes! Visit your{" "}
            <a href={`${basePath}/profile`} className="text-button hover:underline">
              profile page
            </a>{" "}
            to view your submissions and request updates from the team.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-text-primary">
            Where can I learn more?
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            Visit the{" "}
            <a
              href="https://docs.convex.dev/components"
              target="_blank"
              rel="noopener noreferrer"
              className="text-button hover:underline">
              Components documentation
            </a>{" "}
            to learn about how Components work, their data isolation model, and how they help you build features faster.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-text-primary">
            How do I report a component for security issues, license violations, or IP infringement?
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            Contact Convex (email devx at convex) with the component name, the reason for the report,
            and any supporting details. The Convex team reviews every report and may remove, delist,
            or request changes. Urgent security issues are prioritized.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-text-primary">
            Who decides if a component gets removed?
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            The Convex team makes the final call on all takedown requests. Components may be removed
            for security vulnerabilities, license violations, IP infringement, or guideline violations.
            The submitter is notified when a component is removed or delisted.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-text-primary">
            What is the review flow from submission to listed?
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            Your component enters a pending queue, may receive an automated AI review, then gets a
            manual review by the Convex team. Approved components go live in the public directory. If
            changes are needed, you get notified and can update from your profile page. Most
            submissions are processed within a few business days.
          </p>
        </div>
      </div>
    </section>
  );
}
