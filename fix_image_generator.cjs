const fs = require('fs');

let studioContent = fs.readFileSync('components/StudioView.tsx', 'utf8');

const imageGenTool = `    {
      id: 'image_generator',
      title: '16. Image Generator Prompts',
      description: 'Create detailed Prompts for AI image generators (Midjourney/DALL-E) from context.',
      icon: (
        <svg className="w-8 h-8 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-fuchsia-500/10 border-fuchsia-500/30 hover:border-fuchsia-500',
      disabled: !hasActiveSession
    },
`;

studioContent = studioContent.replace(
  "id: 'spreadsheet_creator',",
  imageGenTool + "    {\n      id: 'spreadsheet_creator',"
);

fs.writeFileSync('components/StudioView.tsx', studioContent);

let mediaContent = fs.readFileSync('components/MediaSuiteView.tsx', 'utf8');

// We need to remove the image_generator tool from the tools array in MediaSuiteView
mediaContent = mediaContent.replace(/\{\s*id:\s*'image_generator'[\s\S]*?disabled:\s*![^\}]*\s*\},/g, ''); // Wait, it doesn't have disabled: in MediaSuiteView

// Let's use a more robust regex for MediaSuiteView tool removal
mediaContent = mediaContent.replace(/\{\s*id:\s*'image_generator',[\s\S]*?color:\s*'[^']*',\s*\},\s*/g, '');

mediaContent = mediaContent.replace(
  /if \(id === 'image_generator'\) \{\s*onRunTool\(id\);\s*\} else \{\s*setActiveTool\(id\);\s*\}/,
  "setActiveTool(id);"
);

fs.writeFileSync('components/MediaSuiteView.tsx', mediaContent);

console.log("Fixed 16 Image Generator Prompts");
