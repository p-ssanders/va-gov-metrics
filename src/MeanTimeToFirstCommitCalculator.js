export default class MeanTimeToFirstCommitCalculator {
  constructor(onboarderRepository, commitRepository) {
    this.onboarderRepository = onboarderRepository;
    this.commitRepository = commitRepository;
  }

  async calculate() {
    const onboarders = await this.onboarderRepository.findAll();
    const results = {
      overall: [],
      'vets-website': [],
      'vets-api': []
    };

    // Track total onboarders who made at least one commit
    let totalOnboardersWithCommits = 0;
    // Track sum of all days to first commit (for either repo)
    let totalDaysToFirstCommit = 0;

    await Promise.all(
      onboarders.map(async (onboarder) => {
        // First get all commits for the onboarder across all repositories
        const repoCommits = {};
        for (const repo of ["vets-website", "vets-api"]) {
          const commit = await this.commitRepository.findFirstBy(repo, onboarder);
          if (commit) {
            repoCommits[repo] = commit;
          }
        }

        // If they made a commit to either repo, include them in the overall calculation
        const commits = Object.values(repoCommits);
        if (commits.length > 0) {
          totalOnboardersWithCommits++;

          // Calculate the earliest commit date across all repos for this onboarder
          const daysToFirstCommit = onboarder.daysToFirstCommit(commits);
          if (daysToFirstCommit !== null) {
            totalDaysToFirstCommit += daysToFirstCommit;

            // Now determine which repo was their actual first commit
            // Find the repo with the earliest commit date
            let earliestRepo = null;
            let earliestDate = new Date(8640000000000000); // Max date

            for (const [repo, commit] of Object.entries(repoCommits)) {
              if (commit.date < earliestDate) {
                earliestDate = commit.date;
                earliestRepo = repo;
              }
            }

            // Only include this commit in the repo-specific metric if it was their first overall
            if (earliestRepo) {
              const daysDiff = onboarder.daysToFirstCommit([repoCommits[earliestRepo]]);
              if (daysDiff !== null) {
                results[earliestRepo].push(daysDiff);
              }
            }
          }
        }
      })
    );

    // Calculate overall mean
    results.overall = totalOnboardersWithCommits > 0 ?
      totalDaysToFirstCommit / totalOnboardersWithCommits :
      0;

    return {
      overall: results.overall,
      'vets-website': this.calculateMean(results['vets-website']),
      'vets-api': this.calculateMean(results['vets-api'])
    };
  }

  calculateMean(daysArray) {
    if (!daysArray.length) {
      return 0;
    }
    return daysArray.reduce((total, days) => total + days) / daysArray.length;
  }
}
