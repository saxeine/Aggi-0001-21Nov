const fs = require('fs');
let content = fs.readFileSync('components/StudioView.tsx', 'utf8');

content = content.replace(/app18: app19: 'website_builder',/g, "app19: 'website_builder',");
content = content.replace(/app20: app21: app22: 'product_research_tool'/g, "app22: 'product_research_tool'");

fs.writeFileSync('components/StudioView.tsx', content);

console.log("Fixed appNames mapping");
