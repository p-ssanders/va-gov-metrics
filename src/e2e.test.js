import { describe, it, beforeEach } from "node:test";
import { mock } from "node:test";
import { strict as assert } from "node:assert";
import { main } from "../index.js";
import {
  setupMswServer,
  listIssuesForVaGovTeam,
  listCommitsForVetsWebsite,
  listCommitsForVetsApi,
} from "./msw-helpers.js";
import { createOnboarder } from "./factories.js";
import { createGitHubOnboardingIssueDto } from "./github/factories.js";
import { createCommitDto } from "./commit/factories.js";
import { createRosterMemberDto } from "./roster/factories.js";

describe("happy path", () => {
  const server = setupMswServer();

  describe("using GitHub onboarding issues as an onboarder source", () => {
    beforeEach(() => {
      const gitHubOnboardingIssueDto = createGitHubOnboardingIssueDto({
        body: "GitHub handle*: octocat\n",
        created_at: "2023-07-01T00:00:00Z",
      });
      const onboarder = createOnboarder({
        gitHubHandle: "octocat",
        onboardingStart: new Date(gitHubOnboardingIssueDto.created_at),
      });
      server.use(
        listIssuesForVaGovTeam([gitHubOnboardingIssueDto]),
        listCommitsForVetsWebsite(onboarder, [
          createCommitDto({
            commit: {
              author: {
                date: "2023-07-05T00:00:00Z",
              },
            },
          }),
          createCommitDto({
            commit: {
              author: {
                date: "2023-07-04T00:00:00Z",
              },
            },
          }),
        ]),
        listCommitsForVetsApi(onboarder, []),
      );
    });

    it("logs the mean time to first commit overall and by repo", async () => {
      mock.method(console, "log");
      const roster = [];

      await main(roster);

      assert.ok(
        console.log.mock.calls.some((call) =>
          call.arguments.includes(
            "Mean Time to First Commit based on GitHub Onboarding Issues (days): 3.00",
          ),
        ),
      );

      assert.ok(
        console.log.mock.calls.some((call) =>
          call.arguments.includes(
            "Mean Time to First Commit based on GitHub Onboarding Issues (days) (vets-website only): 3.00",
          ),
        ),
      );

      assert.ok(
        console.log.mock.calls.some((call) =>
          call.arguments.includes(
            "Mean Time to First Commit based on GitHub Onboarding Issues (days) (vets-api only): 0.00",
          ),
        ),
      );
    });
  });

  describe("using a hard-coded roster as an onboarder source", () => {
    const roster = [
      createRosterMemberDto({
        gitHubHandle: "some-other-user",
        onboardingStart: "2023-07-01T00:00:00Z",
      }),
    ];

    beforeEach(() => {
      const onboarder = createOnboarder({
        gitHubHandle: roster[0].gitHubHandle,
        onboardingStart: new Date(roster[0].onboardingStart),
      });
      server.use(
        listIssuesForVaGovTeam([]),
        listCommitsForVetsWebsite(onboarder, []),
        listCommitsForVetsApi(onboarder, [
          createCommitDto({
            commit: {
              author: {
                date: "2023-07-14T00:00:00Z",
              },
            },
          }),
        ]),
      );
    });

    it("logs the mean time to first commit overall and by repo", async () => {
      mock.method(console, "log");

      await main(roster);

      assert.ok(
        console.log.mock.calls.some((call) =>
          call.arguments.includes(
            "Mean Time to First Commit based on Roster (days): 13.00",
          ),
        ),
      );

      assert.ok(
        console.log.mock.calls.some((call) =>
          call.arguments.includes(
            "Mean Time to First Commit based on Roster (days) (vets-website only): 0.00",
          ),
        ),
      );

      assert.ok(
        console.log.mock.calls.some((call) =>
          call.arguments.includes(
            "Mean Time to First Commit based on Roster (days) (vets-api only): 13.00",
          ),
        ),
      );
    });
  });
});
