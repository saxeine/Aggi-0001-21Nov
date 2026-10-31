const fs = require('fs');
let content = fs.readFileSync('components/MIPrOMPTLibraryView.tsx', 'utf8');

content = content.replace(
  "import { saveUserPreference, loadUserPreference } from '../services/storage';",
  "import { saveUserPreference, loadUserPreference } from '../services/storage';\nimport { themeStyles } from '../constants/creativeStudioTheme';"
);

content = content.replace(
  "const MIPrOMPTLibraryView: React.FC<MIPrOMPTLibraryViewProps> = ({ miprompts, onAdd, onUpdate, onDelete, onImport, onSelectPrompt, currentTheme }) => {",
  `const MIPrOMPTLibraryView: React.FC<MIPrOMPTLibraryViewProps> = ({ miprompts, onAdd, onUpdate, onDelete, onImport, onSelectPrompt, currentTheme }) => {
  const themes = ['charcoal', 'silver', 'white', 'cosmic', 'emerald', 'amber', 'cyberpunk', 'slate', 'crimson', 'orchid', 'olive'];
  const [localTheme, setLocalTheme] = useState(() => {
    const saved = localStorage.getItem('creative_studio_theme');
    return saved && themes.includes(saved) ? saved : 'charcoal';
  });

  useEffect(() => {
    const handleThemeChange = () => {
      const saved = localStorage.getItem('creative_studio_theme');
      if (saved && themes.includes(saved)) {
        setLocalTheme(saved);
      }
    };
    window.addEventListener('creative_studio_theme_change', handleThemeChange);
    return () => window.removeEventListener('creative_studio_theme_change', handleThemeChange);
  }, []);

  const st = themeStyles[localTheme] || themeStyles['charcoal'];
`
);

content = content.replace(/bg-app-bg/g, '${st.bg}');
content = content.replace(/text-app-text/g, '${st.text}');
content = content.replace(/text-app-dim/g, '${st.textDim}');
content = content.replace(/border-app-border/g, '${st.border}');
content = content.replace(/bg-app-card/g, '${st.cardBg}');
content = content.replace(/bg-app-panel/g, '${st.panelBg}');
content = content.replace(/bg-app-input/g, '${st.inputBg}');

// Replace className="string..." with className={`string...`} if it contains ${
content = content.replace(/className="([^"]*\$\{st\.[^}]+\}[^"]*)"/g, 'className={`$1`}');

fs.writeFileSync('components/MIPrOMPTLibraryView.tsx', content);
