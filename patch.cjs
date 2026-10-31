const fs = require('fs');

let appContent = fs.readFileSync('App.tsx', 'utf8');
appContent = appContent.replace(
  `<MediaSuiteView \n                  onBack={() => setViewMode('library')} \n              />`,
  `<MediaSuiteView \n                  onBack={() => setViewMode('library')} \n                  session={activeSession}\n                  sessions={sessions}\n                  onSaveArtifact={handleAddLink}\n                  onRunTool={handleToolAction}\n              />`
);

let libContent = fs.readFileSync('components/LibraryView.tsx', 'utf8');
libContent = libContent.replace(
  `className="p-2 bg-app-panel hover:bg-app-card border border-app-border rounded-lg text-app-dim hover:text-emerald-400 transition-colors"\n                    title="Media Suite"`,
  `className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-all shadow-lg shadow-orange-500/20"\n                    title="Media Suite"`
);

fs.writeFileSync('App.tsx', appContent);
fs.writeFileSync('components/LibraryView.tsx', libContent);

console.log("Patched App.tsx and LibraryView.tsx");
