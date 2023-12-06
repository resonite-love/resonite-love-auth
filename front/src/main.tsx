import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import {AppStateProvider} from "./contexts/Application.tsx";
import {TranslationProvider} from "./contexts/Translation.tsx";

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <TranslationProvider>
            <AppStateProvider>
                <App/>
            </AppStateProvider>
        </TranslationProvider>
    </React.StrictMode>,
)
