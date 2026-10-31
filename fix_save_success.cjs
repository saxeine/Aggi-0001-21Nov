const fs = require('fs');
const file = 'src/media_suite/FilmStripEditor/components/FrameEdit.tsx';
let code = fs.readFileSync(file, 'utf8');

const applySuccessState = `  const [applySuccess, setApplySuccess] = useState(false);`;
code = code.replace(applySuccessState, `  const [applySuccess, setApplySuccess] = useState(false);\n  const [saveAsNewSuccess, setSaveAsNewSuccess] = useState(false);`);

const handleSaveAsNewOld = `      if (onSaveAsNew) {
        onSaveAsNew(dataUrl);
      } else {
        onSave(dataUrl);
      }`;
      
const handleSaveAsNewNew = `      if (onSaveAsNew) {
        onSaveAsNew(dataUrl);
        setSaveAsNewSuccess(true);
        setTimeout(() => setSaveAsNewSuccess(false), 3000);
      } else {
        onSave(dataUrl);
      }`;

code = code.replace(handleSaveAsNewOld, handleSaveAsNewNew); // First instance
code = code.replace(handleSaveAsNewOld, handleSaveAsNewNew); // Might be another one

const renderOld = `        <div className="flex items-center gap-2">
          {applySuccess && (
            <span className="text-emerald-400 font-extrabold text-[10px] bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/20 animate-pulse uppercase tracking-wider">
              ✓ Applied to Storyboard
            </span>
          )}`;
const renderNew = `        <div className="flex items-center gap-2">
          {applySuccess && (
            <span className="text-emerald-400 font-extrabold text-[10px] bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/20 animate-pulse uppercase tracking-wider">
              ✓ Applied to Storyboard
            </span>
          )}
          {saveAsNewSuccess && (
            <span className="text-emerald-400 font-extrabold text-[10px] bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/20 animate-pulse uppercase tracking-wider">
              ✓ Saved as New Frame
            </span>
          )}`;
code = code.replace(renderOld, renderNew);

fs.writeFileSync(file, code);
