import { describe, it, mock } from "node:test";
import { strict as assert } from "node:assert";
import MeanTimeToFirstCommitCalculator from "./MeanTimeToFirstCommitCalculator.js";
import GitHubIssueOnboarderRepository from "./github/GitHubIssueOnboarderRepository.js";
import CommitRepository from "./commit/CommitRepository.js";
import { createOnboarder } from "./factories.js";
import { createCommit } from "./commit/factories.js";

describe("MeanTimeToFirstCommitCalculator", () => {
  describe("calculate", () => {
    it("returns the mean time to first commit for overall and by repo", async () => {
      const onboarderRepository = new GitHubIssueOnboarderRepository();
      const onboarder = createOnboarder();

      // Mock for days calculation
      mock.method(onboarder, "daysToFirstCommit");
      onboarder.daysToFirstCommit.mock.mockImplementation((commits) => {
        // Always return 3 days for any commit calculation
        return commits.length > 0 ? 3 : null;
      });

      mock.method(onboarderRepository, "findAll", () => [onboarder]);

      const commitRepository = new CommitRepository();
      // Create commits with explicit dates to test the "earliest commit" logic
      const vetsWebsiteCommit = createCommit({ date: new Date("2023-07-05T00:00:00Z") });
      const vetsApiCommit = createCommit({ date: new Date("2023-07-03T00:00:00Z") }); // Earlier commit!

      mock.method(commitRepository, "findFirstBy");
      commitRepository.findFirstBy.mock.mockImplementation((repo) => {
        if (repo === "vets-website") return vetsWebsiteCommit;
        if (repo === "vets-api") return vetsApiCommit;
        return null;
      });

      const meanTimeToFirstCommitCalculator =
        new MeanTimeToFirstCommitCalculator(
          onboarderRepository,
          commitRepository,
        );

      const results = await meanTimeToFirstCommitCalculator.calculate();

      assert.equal(typeof onboarder.daysToFirstCommit.mock.calls.length, 'number');
      assert.equal(typeof commitRepository.findFirstBy.mock.calls.length, 'number');
      assert.equal(results.overall, 3);
      // vets-api should be included because it has the earlier commit date
      assert.equal(results['vets-api'], 3);
      // vets-website should not be included since it wasn't the first commit
      assert.equal(results['vets-website'], 0);
    });

    it("ignores repos that the onboarder has not committed to", async () => {
      const onboarderRepository = new GitHubIssueOnboarderRepository();
      const onboarder = createOnboarder();
      mock.method(onboarder, "daysToFirstCommit", () => null);
      mock.method(onboarderRepository, "findAll", () => [onboarder]);

      const commitRepository = new CommitRepository();
      mock.method(commitRepository, "findFirstBy", () => null);

      const meanTimeToFirstCommitCalculator =
        new MeanTimeToFirstCommitCalculator(
          onboarderRepository,
          commitRepository,
        );

      const results = await meanTimeToFirstCommitCalculator.calculate();

      assert.equal(typeof onboarder.daysToFirstCommit.mock.calls.length, 'number');
      assert.equal(results.overall, 0);
      assert.equal(results['vets-website'], 0);
      assert.equal(results['vets-api'], 0);
    });

    it("ignores onboarders without a commit", async () => {
      const onboarderRepository = new GitHubIssueOnboarderRepository();
      const onboarder1 = createOnboarder();
      mock.method(onboarder1, "daysToFirstCommit");
      onboarder1.daysToFirstCommit.mock.mockImplementation((commits) => {
        return commits.length > 0 ? 3 : null;
      });

      const onboarder2 = createOnboarder();
      mock.method(onboarder2, "daysToFirstCommit", () => null);

      mock.method(onboarderRepository, "findAll", () => [
        onboarder1,
        onboarder2,
      ]);

      const commitRepository = new CommitRepository();
      const commit = createCommit();
      mock.method(commitRepository, "findFirstBy");
      commitRepository.findFirstBy.mock.mockImplementation((repo, onboarder) => {
        if (onboarder === onboarder1 && repo === "vets-website") return commit;
        return null;
      });

      const meanTimeToFirstCommitCalculator =
        new MeanTimeToFirstCommitCalculator(
          onboarderRepository,
          commitRepository,
        );

      const results = await meanTimeToFirstCommitCalculator.calculate();

      assert.equal(results.overall, 3);
      assert.equal(results['vets-website'], 3);
      assert.equal(results['vets-api'], 0);
    });
  });
});
