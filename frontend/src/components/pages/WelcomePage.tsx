import { Box, Text, Link, Heading } from '@primer/react';
import { GenericPageProps } from './GenericPage';

interface WelcomePageProps extends GenericPageProps {

}

const WelcomePage = (props: WelcomePageProps) => {
  const { canGoPrev, canGoNext } = props;

  const hrefSigningYourCommits = "https://withblue.ink/2020/05/17/how-and-why-to-sign-git-commits.html"
  const hrefGitHubContributions = "https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/managing-contribution-settings-on-your-profile/why-are-my-contributions-not-showing-up-on-my-profile"

  /* this page can be navigated away from (next) */
  if (canGoNext instanceof Function) {
    canGoNext(true);
  }

  /* this page can be navigated away from (back) */
  if (canGoPrev instanceof Function) {
    canGoPrev(true);
  }

  return (
    <Box textAlign="left">
      <Heading>Welcome!</Heading>
      <Text>Gitoboros is a service that helps you easily migrate any public GitHub account activity to the new account.</Text>
      <Text><br /><br /></Text>
      <Heading>How does it work?</Heading>
      <Text>
        Migration starts with retrieving all contributions from the target account.
         Then, Gitoboros creates a virtual git repository with all these contributions
         rendered as individual commits with a specific time and date. After that, you
         can clone this repository locally and upload it to your new GitHub account.
         Voilà - all these commits will be your contributions!
      </Text>
      <Text><br /><br /></Text>
      <Heading>Wait, isn't this illegal?</Heading>
      <Text>
        No. That's precisely how git was designed: only name and email are needed
        to identify a contributor. For GitHub, commit with a specific email
        <Text> <Link target="_blank" href={hrefGitHubContributions}>counts as a contribution</Link>. </Text>
        If you're concerned about the proving authenticity of your work,
        you may want <Text>to start <Link target="_blank" href={hrefSigningYourCommits}>signing your commits</Link>.</Text>
      </Text>
      <Text><br /><br /></Text>
    </Box>
  )
}

export default WelcomePage;
