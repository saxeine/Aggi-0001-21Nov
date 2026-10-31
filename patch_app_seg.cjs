const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf8');

content = content.replace(/const \[isSegCarverOpen, setIsSegCarverOpen\] = useState\(false\);\n/g, '');
content = content.replace(/isSegCarverOpen=\{isSegCarverOpen\}\n/g, '');
content = content.replace(/setIsSegCarverOpen=\{setIsSegCarverOpen\}\n/g, '');

fs.writeFileSync('App.tsx', content);

let studioContent = fs.readFileSync('components/StudioView.tsx', 'utf8');
studioContent = studioContent.replace(/isSegCarverOpen: boolean;\n/g, '');
studioContent = studioContent.replace(/setIsSegCarverOpen: \(isOpen: boolean\) => void;\n/g, '');
studioContent = studioContent.replace(/isSegCarverOpen,\n/g, '');
studioContent = studioContent.replace(/setIsSegCarverOpen,\n/g, '');
fs.writeFileSync('components/StudioView.tsx', studioContent);
