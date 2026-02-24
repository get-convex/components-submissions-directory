// Get base path for links (always /components)
function useBasePath() {
  return "/components";
}

export function FAQSection() {
  const basePath = useBasePath();
  return (
    <section id="faq" className="mt-12 pt-8 border-t border-border">
      <h2 className="text-lg font-medium text-text-primary mb-4">
        Frequently Asked Questions
      </h2>
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-text-primary">
            What happens after I submit?
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            Submissions are reviewed on a rolling basis. We check for common errors and ensure your component complies with our authoring guidelines.
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
            to get started. Components let you package Convex functions, schemas, and persistent state into reusable modules.
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
      </div>
    </section>
  );
}
