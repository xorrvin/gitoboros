import { useCallback, useEffect, useState } from 'react';
import { MarkGithubIcon, LockIcon } from '@primer/octicons-react'
import { Box, Text, Link, Octicon } from '@primer/react';
import { Dialog } from '@primer/react/drafts';

const PrivacyPolicy = () => {
  return (
    <Box p={2}>
      <Text as="p">
        All information you enter to the form is never saved
        to the disk or printed to the log; resulting git repo
        is cached in RAM (Redis) without any persistence and is
        deleted after 5 mins.
      </Text><br />
      <Text as="p">
        HTTP info like useragent of your browser, your public IP
        address and other information your browser sends with every
        request is saved to the nginx log for debug reasons only and
        is discarded daily.
      </Text><br />
      <Text as="p">
        Current deployment is using Cloudflare for DDoS protection and they
        also might log your browser info, especially if you start doing bad things.
      </Text><br />
      <Text as="p">
        In any case, you're more than welcome to run this locally on your
        machine using Docker Compose file in the git repo :)
      </Text>
    </Box>
  )
}

const AppFooter = () => {
  const [isOpen, setIsOpen] = useState(false)

  /* ultra hack, because draft Dialog intentionally doesn't support outside clicks */
  const handlePageClick = useCallback((e: Event) => {
    const target = e.target as HTMLElement;

    /* clicked on Dialog__Backdrop, which's an overlay class for the Dialog */
    if (/backdrop/i.test(target.className)) {
      if (isOpen) {
        setIsOpen(false);
      }
    }
  },[isOpen]);

  /* register global click handler */
  useEffect(() => {
    window.addEventListener("click", handlePageClick);
    return () => {
        window.removeEventListener("click", handlePageClick);
    };
  }, [handlePageClick]);

  return (
    <Box sx={{ display: 'flex', textAlign: 'center', justifyContent: "space-between", width: '250px', height: '30px' }}>
      <Link onClick={() => setIsOpen(true)} sx={{ cursor: "pointer" }} muted hoverColor="fg.default">
        <Octicon icon={LockIcon} /><Text as="small"> privacy policy</Text>
      </Link>
      <Link inline href="https://github.com/xorrvin/gitoboros" target="_blank" muted hoverColor="fg.default">
        <Octicon icon={MarkGithubIcon} /><Text as="small"> xorrvin/gitoboros</Text>
      </Link>
      { isOpen && <Dialog 
          title={
          <Box p={2}>
            <Text fontWeight="bold" fontSize={36}>Privacy Policy</Text>
          </Box>
          }
          onClose={() => setIsOpen(false)}
          >
            <PrivacyPolicy />
        </Dialog> }
    </Box>
  );
}

export default AppFooter;
