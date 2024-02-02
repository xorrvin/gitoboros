import { ThemeProvider, BaseStyles } from '@primer/react'
import { Layout } from './components';

/* currently .js to avoid weird BaseStyles bug: */
/* 
TS2745: This JSX tag's 'children' prop expects type 'never' which requires multiple children, but only a single child was provided.
     7 |   return (
     8 |     <ThemeProvider colorMode="auto">
  >  9 |       <BaseStyles>
       |        ^^^^^^^^^^
    10 |         <Layout />
    11 |       </BaseStyles>
    12 |     </ThemeProvider>
*/

const App = () => {
  return (
    <ThemeProvider colorMode="auto">
      <BaseStyles>
        <Layout />
      </BaseStyles>
    </ThemeProvider>
  );
}

export default App;
