const fs = require('fs');
const file = 'src/media_suite/FilmStripEditor/components/FrameEdit.tsx';
let code = fs.readFileSync(file, 'utf8');

const sizeOld = `              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-bold">Size:</span>
                <input 
                  type="range" 
                  min={10} 
                  max={120} 
                  value={activeTextLayer ? activeTextLayer.fontSize : fontSize} 
                  onChange={e => {
                    const sz = Number(e.target.value);
                    if (activeTextLayer) {
                      updateSelectedTextProps({ fontSize: sz });
                    } else {
                      setFontSize(sz);
                    }
                  }} 
                  onMouseUp={() => {
                    if (activeTextLayer) pushHistory();
                  }}
                  onTouchEnd={() => {
                    if (activeTextLayer) pushHistory();
                  }}
                  className="w-16 accent-violet-500 cursor-ew-resize" 
                />
                <input 
                  type="number" 
                  min={10} 
                  max={120} 
                  value={activeTextLayer ? activeTextLayer.fontSize : fontSize} 
                  onChange={e => {
                    const sz = Number(e.target.value);
                    if (activeTextLayer) {
                      updateSelectedTextProps({ fontSize: sz }, true);
                    } else {
                      setFontSize(sz);
                    }
                  }} 
                  className="w-10 bg-slate-900 border border-slate-700 text-slate-300 text-[10px] rounded px-1 text-center font-mono outline-none py-0.5" 
                />
              </div>`;

const sizeNew = `              {activeTextLayer ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-bold" title="Width">W:</span>
                    <input type="range" min={0.1} max={5} step={0.05} value={activeTextLayer.scaleX || 1} 
                      onChange={e => updateSelectedTextProps({ scaleX: Number(e.target.value) })} 
                      onMouseUp={() => pushHistory()} onTouchEnd={() => pushHistory()}
                      className="w-12 accent-violet-500 cursor-ew-resize" title="Horizontal Scale" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-bold" title="Height">H:</span>
                    <input type="range" min={0.1} max={5} step={0.05} value={activeTextLayer.scaleY || 1} 
                      onChange={e => updateSelectedTextProps({ scaleY: Number(e.target.value) })} 
                      onMouseUp={() => pushHistory()} onTouchEnd={() => pushHistory()}
                      className="w-12 accent-violet-500 cursor-ew-resize" title="Vertical Scale" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-bold" title="Rotation">R:</span>
                    <input type="range" min={-180} max={180} step={1} value={activeTextLayer.rotation || 0} 
                      onChange={e => updateSelectedTextProps({ rotation: Number(e.target.value) })} 
                      onMouseUp={() => pushHistory()} onTouchEnd={() => pushHistory()}
                      className="w-12 accent-amber-500 cursor-ew-resize" title="Rotation Angle" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-bold">Size:</span>
                  <input type="range" min={10} max={120} value={fontSize} 
                    onChange={e => setFontSize(Number(e.target.value))} 
                    className="w-16 accent-violet-500 cursor-ew-resize" />
                  <input type="number" min={10} max={120} value={fontSize} 
                    onChange={e => setFontSize(Number(e.target.value))} 
                    className="w-10 bg-slate-900 border border-slate-700 text-slate-300 text-[10px] rounded px-1 text-center font-mono outline-none py-0.5" />
                </div>
              )}`;

code = code.replace(sizeOld, sizeNew);
fs.writeFileSync(file, code);
