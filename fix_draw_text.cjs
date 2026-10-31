const fs = require('fs');
const file = 'src/media_suite/FilmStripEditor/components/FrameEdit.tsx';
let code = fs.readFileSync(file, 'utf8');

const drawTextOld = `  const drawTextLayersToCtx = (ctx: CanvasRenderingContext2D) => {
    textLayers.forEach(layer => {
      ctx.save();
      const weight = layer.isBold ? 'bold' : 'normal';
      const style = layer.isItalic ? 'italic' : 'normal';
      ctx.font = \`\${style} \${weight} \${layer.fontSize}px \${layer.fontFamily}\`;
      ctx.fillStyle = layer.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (layer.hasOutline) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(3, layer.fontSize / 7);
        ctx.lineJoin = 'round';
        ctx.strokeText(layer.text, layer.x, layer.y);
      }
      
      ctx.fillText(layer.text, layer.x, layer.y);
      ctx.restore();
    });
  };`;

const drawTextNew = `  const drawTextLayersToCtx = (ctx: CanvasRenderingContext2D) => {
    textLayers.forEach(layer => {
      ctx.save();
      ctx.translate(layer.x, layer.y);
      if (layer.rotation) {
        ctx.rotate(layer.rotation * Math.PI / 180);
      }
      ctx.scale(layer.scaleX || 1, layer.scaleY || 1);
      
      const weight = layer.isBold ? 'bold' : 'normal';
      const style = layer.isItalic ? 'italic' : 'normal';
      ctx.font = \`\${style} \${weight} \${layer.fontSize}px \${layer.fontFamily}\`;
      ctx.fillStyle = layer.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (layer.hasOutline) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(3, layer.fontSize / 7);
        ctx.lineJoin = 'round';
        ctx.strokeText(layer.text, 0, 0);
      }
      
      ctx.fillText(layer.text, 0, 0);
      ctx.restore();
    });
  };`;

code = code.replace(drawTextOld, drawTextNew);
fs.writeFileSync(file, code);
