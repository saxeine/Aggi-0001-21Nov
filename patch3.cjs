const fs = require('fs');

let content = fs.readFileSync('components/StudioView.tsx', 'utf8');

// Remove imports
content = content.replace(/import \{ ScriptWriter \} from '\.\/CreationStudio\/ScriptWriter';\n/g, '');
content = content.replace(/import \{ VideoScriptWriter \} from '\.\/CreationStudio\/VideoScriptWriter';\n/g, '');
content = content.replace(/import \{ ImageDescriber \} from '\.\/CreationStudio\/ImageDescriber';\n/g, '');

// Remove rendering logic
content = content.replace(/\{\s*activeTool\s*===\s*'script_writer'\s*&&\s*\([\s\S]*?<\/\s*div>\s*\)\s*\}/g, '');
content = content.replace(/\{\s*activeTool\s*===\s*'video_script_writer'\s*&&\s*\([\s\S]*?<\/\s*div>\s*\)\s*\}/g, '');
content = content.replace(/\{\s*activeTool\s*===\s*'image_describer'\s*&&\s*\([\s\S]*?<\/\s*div>\s*\)\s*\}/g, '');

// Remove from includes array
content = content.replace(/'video_script_writer',\s*/g, '');
content = content.replace(/'script_writer',\s*/g, '');
content = content.replace(/'image_describer',\s*/g, '');

fs.writeFileSync('components/StudioView.tsx', content);

console.log("Cleaned up StudioView");
