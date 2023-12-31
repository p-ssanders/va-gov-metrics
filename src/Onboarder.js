export default class Onboarder {
  constructor({ gitHubHandle, onboardingStart }) {
    this.gitHubHandle = gitHubHandle;
    this.onboardingStart = onboardingStart;
  }

  daysToFirstCommit(commits) {
    if (!commits.length) {
      return null;
    }

    const firstCommitDate = commits
      .map(({ date }) => date)
      .reduce((min, date) => (min < date ? min : date));
    const firstCommitDiffInMillis = firstCommitDate - this.onboardingStart;
    const firstCommitDiffInDays = firstCommitDiffInMillis / 1000 / 60 / 60 / 24;
    return firstCommitDiffInDays;
  }
}
