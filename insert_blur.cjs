const fs = require('fs');
const file = 'src/media_suite/FilmStripEditor/components/FrameEdit.tsx';
let code = fs.readFileSync(file, 'utf8');

const hookOld = `  const [activeFilter, setActiveFilter] = useState<string>('none');`;
const hookNew = `  const [activeFilter, setActiveFilter] = useState<string>('none');
  const [blurStrength, setBlurStrength] = useState<number>(10);
  const [blurredCache, setBlurredCache] = useState<HTMLCanvasElement | null>(null);
  const [lastBlurPos, setLastBlurPos] = useState<{ x: number, y: number } | null>(null);`;
code = code.replace(hookOld, hookNew);

const downOld = `    if (tool === 'pen' || tool === 'eraser') {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      
      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = lineWidth * 3.5;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }`;
const downNew = `    if (tool === 'pen' || tool === 'eraser' || tool === 'blur') {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      if (tool === 'blur') {
        const blurCnv = document.createElement('canvas');
        blurCnv.width = canvas.width;
        blurCnv.height = canvas.height;
        const bCtx = blurCnv.getContext('2d');
        if (bCtx) {
          bCtx.filter = \`blur(\${blurStrength}px)\`;
          bCtx.drawImage(canvas, 0, 0);
        }
        setBlurredCache(blurCnv);
        setLastBlurPos(pos);
      } else {
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        if (tool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.strokeStyle = 'rgba(0,0,0,1)';
          ctx.lineWidth = lineWidth * 3.5;
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = color;
          ctx.lineWidth = lineWidth;
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }`;
code = code.replace(downOld, downNew);

const moveOld = `    if (tool === 'pen' || tool === 'eraser') {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }`;
const moveNew = `    if (tool === 'pen' || tool === 'eraser') {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === 'blur' && blurredCache && lastBlurPos) {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const dist = Math.hypot(pos.x - lastBlurPos.x, pos.y - lastBlurPos.y);
      const radius = lineWidth * 3.5;
      const steps = Math.max(1, Math.ceil(dist / (radius / 2)));
      for (let i = 0; i <= steps; i++) {
        const cx = lastBlurPos.x + (pos.x - lastBlurPos.x) * (i / steps);
        const cy = lastBlurPos.y + (pos.y - lastBlurPos.y) * (i / steps);
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(blurredCache, 0, 0);
        ctx.restore();
      }
      setLastBlurPos(pos);
    }`;
code = code.replace(moveOld, moveNew);

const upOld = `    if (tool === 'pen' || tool === 'eraser') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.globalCompositeOperation = 'source-over';
      }
      pushHistory();
    }`;
const upNew = `    if (tool === 'pen' || tool === 'eraser' || tool === 'blur') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.globalCompositeOperation = 'source-over';
      }
      if (tool === 'blur') {
        setBlurredCache(null);
        setLastBlurPos(null);
      }
      pushHistory();
    }`;
code = code.replace(upOld, upNew);

const toolbarOld = `          <button onClick={() => { setTool('eraser'); setShowShapesFlyout(false); cancelCrop(); }} className={cn('w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer', tool === 'eraser' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200')} title="Eraser"><Eraser className="w-4 h-4" /></button>

          <div className="relative">`;
const toolbarNew = `          <button onClick={() => { setTool('eraser'); setShowShapesFlyout(false); cancelCrop(); }} className={cn('w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer', tool === 'eraser' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200')} title="Eraser"><Eraser className="w-4 h-4" /></button>
          <button onClick={() => { setTool('blur'); setShowShapesFlyout(false); cancelCrop(); }} className={cn('w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer', tool === 'blur' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200')} title="Blur Brush"><Droplet className="w-4 h-4" /></button>

          <div className="relative">`;
code = code.replace(toolbarOld, toolbarNew);

const blurSettingsOld = `                <input type="range" min="1" max="100" value={lineWidth} onChange={(e) => setLineWidth(parseInt(e.target.value))} className="w-24 accent-violet-500" />
              </div>
            )}

            {/* Cinematic FX Filters bar */}`;
const blurSettingsNew = `                <input type="range" min="1" max="100" value={lineWidth} onChange={(e) => setLineWidth(parseInt(e.target.value))} className="w-24 accent-violet-500" />
              </div>
            )}
            
            {tool === 'blur' && (
              <div className="flex items-center gap-3 bg-[#0C0C0E] border border-neutral-700/80 px-3 h-10 rounded-xl shadow-xl z-20">
                <span className="text-xs text-neutral-400 font-medium">Blur Strength:</span>
                <input type="range" min="1" max="50" value={blurStrength} onChange={(e) => setBlurStrength(parseInt(e.target.value))} className="w-24 accent-violet-500" />
                <span className="text-xs text-neutral-300 w-8">{blurStrength}px</span>
              </div>
            )}

            {/* Cinematic FX Filters bar */}`;
code = code.replace(blurSettingsOld, blurSettingsNew);

fs.writeFileSync(file, code);
