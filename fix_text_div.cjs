const fs = require('fs');
const file = 'src/media_suite/FilmStripEditor/components/FrameEdit.tsx';
let code = fs.readFileSync(file, 'utf8');

const divOld = `                    <div 
                      key={layer.id} 
                      style={{ position: 'absolute', left: \`\${(layer.x / width) * 100}%\`, top: \`\${(layer.y / height) * 100}%\`, transform: 'translate(-50%, -50%)', pointerEvents: 'auto' }} 
                      onMouseDown={(e) => handleTextMouseDown(e, layer)} 
                      onTouchStart={(e) => handleTextTouchStart(e, layer)} 
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => { e.stopPropagation(); setEditingTextInPlace(layer.id); setInPlaceInputValue(layer.text); }}
                    >`;

const divNew = `                    <div 
                      key={layer.id} 
                      style={{ position: 'absolute', left: \`\${(layer.x / width) * 100}%\`, top: \`\${(layer.y / height) * 100}%\`, transform: \`translate(-50%, -50%) rotate(\${layer.rotation || 0}deg) scale(\${layer.scaleX || 1}, \${layer.scaleY || 1})\`, pointerEvents: 'auto' }} 
                      onMouseDown={(e) => handleTextMouseDown(e, layer)} 
                      onTouchStart={(e) => handleTextTouchStart(e, layer)} 
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => { e.stopPropagation(); setEditingTextInPlace(layer.id); setInPlaceInputValue(layer.text); }}
                    >`;

code = code.replace(divOld, divNew);
fs.writeFileSync(file, code);
