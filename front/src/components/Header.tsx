import {AppBar, Toolbar, Typography} from "@mui/material";
import {LanguageButton} from "./LanguageButton.tsx";
import {useTranslation} from "../contexts/Translation.tsx";


export const Header = () => {
    const {language, setLanguage} = useTranslation()

    return (
        <AppBar position="static" color={"inherit"} elevation={1}>
            <Toolbar variant="dense">
                <Typography variant="h6" color="inherit" component="div" sx={{flexGrow: 1}}>
                    Resonite.Love
                </Typography>
                <LanguageButton language={language} setLanguage={setLanguage} />
            </Toolbar>
        </AppBar>
    )
}