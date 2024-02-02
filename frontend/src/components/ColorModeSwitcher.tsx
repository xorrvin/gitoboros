import { useTheme, Box } from '@primer/react'
import { SunIcon, MoonIcon } from '@primer/octicons-react'
import { useEffect, useState } from 'react'

const schemes = {
  light: {
    value: 'light',
    icon: SunIcon,
  },
  dark: {
    value: 'dark',
    icon: MoonIcon,
  },
}

const ColorModeSwitcher = () => {
  const { setDayScheme, setNightScheme } = useTheme()
  const [currentScheme, setCurrentScheme] = useState(schemes['light'])

  const toggleScheme = () => {
    if (currentScheme === schemes.dark) {
      setCurrentScheme(schemes.light);
    } else {
      setCurrentScheme(schemes.dark);
    }
  }

  useEffect(() => {
    setDayScheme(currentScheme.value)
    setNightScheme(currentScheme.value)
  }, [currentScheme, setDayScheme, setNightScheme])

  // <a href="https://github.com/you"><img src="https://tqdev.com/github-ribbons/forkme_right_darkblue_121621.svg"  alt="Fork me on GitHub" /></a>

  return (
    <Box onClick={() => toggleScheme()}>
      <currentScheme.icon />
    </Box>
  );
}

export default ColorModeSwitcher;
