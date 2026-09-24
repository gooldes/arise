import { render } from 'preact'
import { App } from './app'
import { initNav } from './lib/nav'
import { registerServiceWorker } from './lib/offline'
import { initSettings } from './lib/user'
import './styles.css'

initSettings()
initNav()
render(<App />, document.getElementById('app')!)
registerServiceWorker()
