const fs = require('fs');
let content = fs.readFileSync('aDOCS/ARCHITECTURE.md', 'utf8');

content = content.replace(
  "**Image Generator Prompts**, **Video Script Writer**",
  "**Video Script Writer**"
);

const newLog = `
- **Creation Studio Restoration**:
  - Restored **16. Image Generator Prompts** back to the Creation Studio grid from the Media Suite after confirming it's not a direct visual media tool but a prompt generator.
`;

fs.writeFileSync('aDOCS/ARCHITECTURE.md', content + newLog);
console.log("Fixed ARCHITECTURE.md");
