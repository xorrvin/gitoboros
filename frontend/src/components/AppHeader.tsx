import { Header, Octicon } from '@primer/react';
import { IssueReopenedIcon } from '@primer/octicons-react'

import ColorModeSwitcher from './ColorModeSwitcher';

const AppHeader = () => {
  return (
    <Header sx={{ width: '100%', }}>
      <Header.Item>
        <Header.Link href="https://github.com/xorrvin/gitoboros" target="_blank" sx={{ fontSize: 2 }}>
          <Octicon icon={IssueReopenedIcon} size={32} sx={{ mr: 2 }} />
          <span>GitoBoros</span>
        </Header.Link>
      </Header.Item>
      <Header.Item full>Easily migrate your GitHub contributions!</Header.Item>
      <Header.Item sx={{ mr: 0 }}>
        <ColorModeSwitcher />
      </Header.Item>
    </Header>
  )
}

export default AppHeader;
