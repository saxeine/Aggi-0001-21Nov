const fs = require('fs');

let content = fs.readFileSync('components/StudioView.tsx', 'utf8');

// Remove image_generator
content = content.replace(/\{\s*id:\s*'image_generator'[\s\S]*?disabled:\s*![^\}]*\s*\},/g, '');

// Remove video_script_writer
content = content.replace(/\{\s*id:\s*'video_script_writer'[\s\S]*?disabled:\s*![^\}]*\s*\},/g, '');

// Remove script_writer
content = content.replace(/\{\s*id:\s*'script_writer'[\s\S]*?disabled:\s*(?:true|false)\s*\},/g, '');

// Remove image_describer
content = content.replace(/\{\s*id:\s*'image_describer'[\s\S]*?disabled:\s*(?:true|false)\s*\},/g, '');

fs.writeFileSync('components/StudioView.tsx', content);

console.log("Removed tools from StudioView");
