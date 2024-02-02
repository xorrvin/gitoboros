import { Box, Text, Link } from '@primer/react';
import { GenericPageProps } from './GenericPage';

interface WelcomePageProps extends GenericPageProps {

}

const WelcomePage = (props: WelcomePageProps) => {
  const { canGoPrev, canGoNext } = props;

  const HrefSigningYourCommits = "https://withblue.ink/2020/05/17/how-and-why-to-sign-git-commits.html"
  const HrefGitHubContributions = "https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/managing-contribution-settings-on-your-profile/why-are-my-contributions-not-showing-up-on-my-profile"

  /* this page can be navigated away from (next) */
  if (canGoNext instanceof Function) {
    canGoNext(true);
  }

  /* this page can be navigated away from (back) */
  if (canGoPrev instanceof Function) {
    canGoPrev(true);
  }

  return (
    <Box>
      <Text as="h2">Welcome!</Text>
      <Text>Here you can easily migrate any <Text fontWeight={"bold"}>public</Text> GitHub account activity to the new account.</Text>
      <Text><br /><br /></Text>
      <Text as="h2">How does it work?</Text>
      <Text>
        Gitoboros starts by retrieving all contributions from the target account. Then, it creates
        git repository with all these contributions transformed into individual commits with a
        specific time and date. After that, you can clone this repository locally and upload it
        to your new GitHub account, and voilà - all these commits will be counted as your contributions!
      </Text>
      <Text><br /><br /></Text>
      <Text as="h2">Wait, isn't this illegal?</Text>
      <Text>
        No. That's precisely how git was designed: only name and email are needed
        to identify a contributor. For GitHub, commit with a specific email
        <Text> <Link target="_blank" href={HrefGitHubContributions}>counts as a contribution</Link>. </Text>
        If you're concerned about proving authenticity of your work,
        you may want <Text>to start <Link target="_blank" href={HrefSigningYourCommits}>signing your commits</Link>.</Text>
      </Text>
      <Text><br /><br /></Text>
      <Text as="h3">Click Next to begin!</Text>
    </Box>
  )
}

export default WelcomePage;
