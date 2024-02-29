import { useCallback, useEffect, useState } from 'react';
import { MarkGithubIcon, LockIcon } from '@primer/octicons-react'
import { Box, Text, Link, Octicon } from '@primer/react';
import { Dialog } from '@primer/react/drafts';

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
          title={<Text fontWeight="bold" fontSize={36}>Privacy Policy</Text>}
          onClose={() => setIsOpen(false)}
          >
            <Text>privacy policy</Text>
        </Dialog> }
    </Box>
  );
}

export default AppFooter;
