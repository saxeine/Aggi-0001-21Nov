const fs = require('fs');
const file = 'src/media_suite/FilmStripEditor/components/FrameEdit.tsx';
let code = fs.readFileSync(file, 'utf8');

const jsxOld = `                              <div className="absolute -top-1 -left-1 w-2 w-2 bg-violet-400 rounded-full border border-slate-950 pointer-events-none" />
                              <div className="absolute -top-1 -right-1 w-2 w-2 bg-violet-400 rounded-full border border-slate-950 pointer-events-none" />
                              <div className="absolute -bottom-1 -left-1 w-2 w-2 bg-violet-400 rounded-full border border-slate-950 pointer-events-none" />
                              {/* Bottom-right interactive handle for resize dragging! */}
                              <div 
                                className="absolute -bottom-1 -right-1 w-3 h-3 bg-violet-400 hover:bg-violet-300 rounded-full border border-slate-950 cursor-se-resize pointer-events-auto shadow-md"
                                onMouseDown={(e) => handleResizeMouseDown(e, layer)}
                                onTouchStart={(e) => handleResizeTouchStart(e, layer)}
                                title="Drag to resize text font size"
                              />`;

const jsxNew = `                              <div className="absolute -top-1 -left-1 w-2 h-2 bg-violet-400 rounded-full border border-slate-950 pointer-events-none" />
                              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-violet-400 rounded-full border border-slate-950 pointer-events-none" />
                              
                              {/* Top-right: Rotate */}
                              <div 
                                className="absolute -top-2 -right-2 w-4 h-4 bg-amber-400 hover:bg-amber-300 rounded-full border-2 border-slate-950 cursor-pointer pointer-events-auto shadow-md flex items-center justify-center"
                                onMouseDown={(e) => handleTextTransformMouseDown(e, layer, 'rotate')}
                                onTouchStart={(e) => handleTextTransformMouseDown(e, layer, 'rotate')}
                                title="Drag to rotate"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/></svg>
                              </div>
                              
                              {/* Right center: Resize Width */}
                              <div 
                                className="absolute top-1/2 -right-1 w-2 h-4 -translate-y-1/2 bg-violet-400 hover:bg-violet-300 rounded-full border border-slate-950 cursor-ew-resize pointer-events-auto shadow-md"
                                onMouseDown={(e) => handleTextTransformMouseDown(e, layer, 'width')}
                                onTouchStart={(e) => handleTextTransformMouseDown(e, layer, 'width')}
                                title="Drag to resize width"
                              />
                              
                              {/* Bottom center: Resize Height */}
                              <div 
                                className="absolute -bottom-1 left-1/2 w-4 h-2 -translate-x-1/2 bg-violet-400 hover:bg-violet-300 rounded-full border border-slate-950 cursor-ns-resize pointer-events-auto shadow-md"
                                onMouseDown={(e) => handleTextTransformMouseDown(e, layer, 'height')}
                                onTouchStart={(e) => handleTextTransformMouseDown(e, layer, 'height')}
                                title="Drag to resize height"
                              />
                              
                              {/* Bottom-right interactive handle for uniform resize dragging */}
                              <div 
                                className="absolute -bottom-2 -right-2 w-4 h-4 bg-violet-400 hover:bg-violet-300 rounded-full border-2 border-slate-950 cursor-se-resize pointer-events-auto shadow-md"
                                onMouseDown={(e) => handleResizeMouseDown(e, layer)}
                                onTouchStart={(e) => handleResizeTouchStart(e, layer)}
                                title="Drag to resize text font size"
                              />`;

code = code.replace(jsxOld, jsxNew);
fs.writeFileSync(file, code);
