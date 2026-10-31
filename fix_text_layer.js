const fs = require('fs');
const file = 'src/media_suite/FilmStripEditor/components/FrameEdit.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'isItalic: boolean;\n  hasOutline: boolean;\n  scaleX?: number;\n  scaleY?: number;\n  rotation?: number;\n  hasOutline: boolean;',
  'isItalic: boolean;\n  hasOutline: boolean;\n  scaleX?: number;\n  scaleY?: number;\n  rotation?: number;'
);

fs.writeFileSync(file, code);
