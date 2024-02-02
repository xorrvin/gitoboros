import { Box } from '@primer/react'

interface GenericPageProps extends React.PropsWithChildren {
  /* whether page movement has been requested */
  pageNextEvent?: boolean;
  pagePrevEvent?: boolean;

  /* whether page can be left or not */
  canGoNext?: (can: boolean) => void;
  canGoPrev?: (can: boolean) => void;
}

const GenericPage = (props: GenericPageProps) => {
  const { children } = props;

  return (
    <Box>{children}</Box>
  );
}

export { GenericPage };
export type { GenericPageProps };
