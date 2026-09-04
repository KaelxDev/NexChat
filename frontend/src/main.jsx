import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './Avatar.css'
import './App.css'
import './Profile.css'
import './MessageContextMenu.css'
import './MessageLayout.css'
import './MessageTimePatch.css'
import './AppEdit.css'
import './UIRefinement.css'
import './AuthRefinement.css'
import './MessageLayoutFinal.css'
import './MessageGeometry.css'
import './MobileUX.css'
import './ReplyScrollFix.css'
import './AutoMessageScroll.css'
import './Brand.css'
import './DesignSystem.css'
import './ChatPolish.css'
import './EmptyStateFix.css'
import './ConversationViewportFix.css'
import './MessagePresentationFix.css'
import './MessageAvatarFix.css'
import './MessageFlowFix.css'
import AutoMessageScroll from './AutoMessageScroll.jsx'
import AppEdit from './AppEdit.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AutoMessageScroll>
      <AppEdit />
    </AutoMessageScroll>
  </StrictMode>,
)
