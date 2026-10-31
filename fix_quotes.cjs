const fs = require('fs');
let content = fs.readFileSync('components/MIPrOMPTLibraryView.tsx', 'utf8');

// Fix nested interpolation
content = content.replace(
  /'\$\{st\.textDim\} hover:\$\{st\.bg\} hover:text-yellow-400'/g,
  '`${st.textDim} hover:${st.bg} hover:text-yellow-400`'
);

content = content.replace(
  /hover:border-app-dim/g,
  'hover:${st.border}'
);

fs.writeFileSync('components/MIPrOMPTLibraryView.tsx', content);
