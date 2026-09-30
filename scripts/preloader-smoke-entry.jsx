import { createRoot } from 'react-dom/client'
import Preloader from '../src/components/Preloader/Preloader'

const rootEl = document.getElementById('root')
const root = createRoot(rootEl)
root.render(<Preloader />)