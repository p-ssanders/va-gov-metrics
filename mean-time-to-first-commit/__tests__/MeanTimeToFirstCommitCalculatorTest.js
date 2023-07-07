const MeanTimeToFirstCommitCalculator = require("../MeanTimeToFirstCommitCalculator");
const OnboardingTemplateIssueFinder = require("../OnboardingTemplateIssueFinder");
const OnboarderMapper = require("../OnboarderMapper");
const TimeToFirstCommitCollector = require("../TimeToFirstCommitCollector");
const {
  createOnboardingTemplateIssue,
  createOnboarder,
} = require("./factories");

jest.mock("../OnboardingTemplateIssueFinder");
jest.mock("../OnboarderMapper");
jest.mock("../TimeToFirstCommitCollector");

describe("MeanTimeToFirstCommitCalculator", () => {
  describe(".calculate", () => {
    it("returns the mean time to first commit", async () => {
      const onboardingTemplateIssueFinder = new OnboardingTemplateIssueFinder();
      const onboardingTemplateIssue = createOnboardingTemplateIssue({
        created_at: "2023-07-01T00:00:00Z",
      });
      onboardingTemplateIssueFinder.findAll.mockResolvedValue([
        onboardingTemplateIssue,
      ]);

      const onboarderMapper = new OnboarderMapper();
      onboarderMapper.map.mockReturnValue([
        createOnboarder({
          onboardingStart: onboardingTemplateIssue.created_at,
        }),
      ]);

      const timeToFirstCommitCollector = new TimeToFirstCommitCollector();
      timeToFirstCommitCollector.collect.mockResolvedValue([3]);

      const meanTimeToFirstCommitCalculator =
        new MeanTimeToFirstCommitCalculator(
          onboardingTemplateIssueFinder,
          onboarderMapper,
          timeToFirstCommitCollector
        );

      const meanTimeToFirstCommit =
        await meanTimeToFirstCommitCalculator.calculate();

      expect(meanTimeToFirstCommit).toEqual(3);
    });

    it("returns zero when there's no onboarders", async () => {
      const onboardingTemplateIssueFinder = new OnboardingTemplateIssueFinder();
      onboardingTemplateIssueFinder.findAll.mockResolvedValue([]);

      const onboarderMapper = new OnboarderMapper();
      onboarderMapper.map.mockReturnValue([]);

      const timeToFirstCommitCollector = new TimeToFirstCommitCollector();
      timeToFirstCommitCollector.collect.mockResolvedValue([]);

      const meanTimeToFirstCommitCalculator =
        new MeanTimeToFirstCommitCalculator(
          onboardingTemplateIssueFinder,
          onboarderMapper,
          timeToFirstCommitCollector
        );

      const meanTimeToFirstCommit =
        await meanTimeToFirstCommitCalculator.calculate();

      expect(meanTimeToFirstCommit).toEqual(0);
    });
  });
});