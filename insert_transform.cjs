const fs = require('fs');
const file = 'src/media_suite/FilmStripEditor/components/FrameEdit.tsx';
let code = fs.readFileSync(file, 'utf8');

const hookOld = `  const [isResizingText, setIsResizingText] = useState(false);
  const [resizeStartSize, setResizeStartSize] = useState(28);
  const [resizeStartPos, setResizeStartPos] = useState<{ x: number; y: number } | null>(null);`;

const hookNew = `  const [isResizingText, setIsResizingText] = useState(false);
  const [resizeStartSize, setResizeStartSize] = useState(28);
  const [resizeStartPos, setResizeStartPos] = useState<{ x: number; y: number } | null>(null);
  
  const [textTransformMode, setTextTransformMode] = useState<'width' | 'height' | 'rotate' | null>(null);
  const [transformStartProps, setTransformStartProps] = useState({ x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 });`;

code = code.replace(hookOld, hookNew);

const handlerOld = `  const handleResizeMouseDown = (e: React.MouseEvent, layer: TextLayer) => {`;

const handlerNew = `  const handleTextTransformMouseDown = (e: React.MouseEvent | React.TouchEvent, layer: TextLayer, mode: 'width' | 'height' | 'rotate') => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedTextId(layer.id);
    setTextTransformMode(mode);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    
    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    setResizeStartPos({ x: clientX * scaleX, y: clientY * scaleY });
    setTransformStartProps({
      x: layer.x,
      y: layer.y,
      scaleX: layer.scaleX || 1,
      scaleY: layer.scaleY || 1,
      rotation: layer.rotation || 0
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, layer: TextLayer) => {`;

code = code.replace(handlerOld, handlerNew);

const globalOld = `    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isResizingText || !selectedTextId || !resizeStartPos) return;`;

const globalNew = `    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (textTransformMode && selectedTextId && resizeStartPos) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = width / rect.width;
        const scaleY = height / rect.height;
        
        const currentX = e.clientX * scaleX;
        const currentY = e.clientY * scaleY;
        const dx = currentX - resizeStartPos.x;
        const dy = currentY - resizeStartPos.y;
        
        setTextLayers(prev => prev.map(l => {
          if (l.id === selectedTextId) {
            let nextScaleX = transformStartProps.scaleX;
            let nextScaleY = transformStartProps.scaleY;
            let nextRotation = transformStartProps.rotation;
            
            if (textTransformMode === 'width') {
              nextScaleX = Math.max(0.1, transformStartProps.scaleX + dx * 0.01);
            } else if (textTransformMode === 'height') {
              nextScaleY = Math.max(0.1, transformStartProps.scaleY + dy * 0.01);
            } else if (textTransformMode === 'rotate') {
              // calculate angle from center of text to mouse
              const centerX = transformStartProps.x / scaleX + rect.left;
              const centerY = transformStartProps.y / scaleY + rect.top;
              const startAngle = Math.atan2(resizeStartPos.y / scaleY + rect.top - centerY, resizeStartPos.x / scaleX + rect.left - centerX);
              const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
              nextRotation = transformStartProps.rotation + (currentAngle - startAngle) * 180 / Math.PI;
            }
            return { ...l, scaleX: nextScaleX, scaleY: nextScaleY, rotation: nextRotation };
          }
          return l;
        }));
        return;
      }
      if (!isResizingText || !selectedTextId || !resizeStartPos) return;`;

code = code.replace(globalOld, globalNew);

const globalTouchOld = `    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (!isResizingText || !selectedTextId || !resizeStartPos || e.touches.length === 0) return;`;

const globalTouchNew = `    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (textTransformMode && selectedTextId && resizeStartPos && e.touches.length > 0) {
        const touch = e.touches[0];
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = width / rect.width;
        const scaleY = height / rect.height;
        
        const currentX = touch.clientX * scaleX;
        const currentY = touch.clientY * scaleY;
        const dx = currentX - resizeStartPos.x;
        const dy = currentY - resizeStartPos.y;
        
        setTextLayers(prev => prev.map(l => {
          if (l.id === selectedTextId) {
            let nextScaleX = transformStartProps.scaleX;
            let nextScaleY = transformStartProps.scaleY;
            let nextRotation = transformStartProps.rotation;
            
            if (textTransformMode === 'width') {
              nextScaleX = Math.max(0.1, transformStartProps.scaleX + dx * 0.01);
            } else if (textTransformMode === 'height') {
              nextScaleY = Math.max(0.1, transformStartProps.scaleY + dy * 0.01);
            } else if (textTransformMode === 'rotate') {
              const centerX = transformStartProps.x / scaleX + rect.left;
              const centerY = transformStartProps.y / scaleY + rect.top;
              const startAngle = Math.atan2(resizeStartPos.y / scaleY + rect.top - centerY, resizeStartPos.x / scaleX + rect.left - centerX);
              const currentAngle = Math.atan2(touch.clientY - centerY, touch.clientX - centerX);
              nextRotation = transformStartProps.rotation + (currentAngle - startAngle) * 180 / Math.PI;
            }
            return { ...l, scaleX: nextScaleX, scaleY: nextScaleY, rotation: nextRotation };
          }
          return l;
        }));
        return;
      }
      if (!isResizingText || !selectedTextId || !resizeStartPos || e.touches.length === 0) return;`;

code = code.replace(globalTouchOld, globalTouchNew);

const mouseUpOld = `    const handleGlobalMouseUp = () => {
      if (isResizingText) {
        pushHistory();
      }
      setIsResizingText(false);
    };`;

const mouseUpNew = `    const handleGlobalMouseUp = () => {
      if (isResizingText || textTransformMode) {
        pushHistory();
      }
      setIsResizingText(false);
      setTextTransformMode(null);
    };`;

code = code.replace(mouseUpOld, mouseUpNew);

const useEffectOld = `    if (isResizingText) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('touchmove', handleGlobalTouchMove);
      window.addEventListener('touchend', handleGlobalMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isResizingText, selectedTextId, resizeStartPos, resizeStartSize, width, height, pushHistory]);`;

const useEffectNew = `    if (isResizingText || textTransformMode) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('touchmove', handleGlobalTouchMove);
      window.addEventListener('touchend', handleGlobalMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isResizingText, textTransformMode, selectedTextId, resizeStartPos, resizeStartSize, transformStartProps, width, height, pushHistory]);`;

code = code.replace(useEffectOld, useEffectNew);

fs.writeFileSync(file, code);
