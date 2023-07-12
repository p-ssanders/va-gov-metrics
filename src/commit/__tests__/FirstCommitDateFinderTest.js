const { Octokit } = require("@octokit/rest");
const {
  setupMswServer,
  listCommitsForVetsApiMswRequestHandler,
} = require("../../__tests__/helpers");
const FirstCommitDateFinder = require("../FirstCommitDateFinder");
const { createCommit } = require("./factories");
const { createOnboarder } = require("../../__tests__/factories");

describe("FirstCommitDateFinder", () => {
  const server = setupMswServer();

  describe("find", () => {
    const firstCommitDateFinder = new FirstCommitDateFinder(new Octokit());

    it("returns the oldest commit date", async () => {
      const onboarder = createOnboarder();
      const date = "2023-07-04T00:00:00Z";
      server.use(
        listCommitsForVetsApiMswRequestHandler(onboarder, [
          createCommit({
            commit: {
              author: {
                date: "2023-07-05T00:00:00Z",
              },
            },
          }),
          createCommit({
            commit: {
              author: {
                date,
              },
            },
          }),
        ]),
      );

      const firstCommitDate = await firstCommitDateFinder.find(
        "vets-api",
        onboarder,
      );

      expect(firstCommitDate).toEqual(new Date(date));
    });

    it("returns null when there is no first commit", async () => {
      const onboarder = createOnboarder();
      server.use(listCommitsForVetsApiMswRequestHandler(onboarder, []));

      const firstCommit = await firstCommitDateFinder.find(
        "vets-api",
        onboarder,
      );

      expect(firstCommit).toBeNull();
    });
  });
});