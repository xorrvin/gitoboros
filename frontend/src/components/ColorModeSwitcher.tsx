import { useTheme, Box } from '@primer/react'
import { SunIcon, MoonIcon } from '@primer/octicons-react'
import { useEffect, useState } from 'react'

/* icons are inverted to hint style change */
const schemes = {
    light: {
        value: 'light',
        icon: MoonIcon,
    },
    dark: {
        value: 'dark',
        icon: SunIcon,
    },
}

const ColorModeSwitcher = () => {
    const { setDayScheme, setNightScheme, colorScheme } = useTheme()
    const [currentScheme, setCurrentScheme] = useState(colorScheme === "dark" ? schemes.dark : schemes.light)

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

