import os
import re

files_to_patch = [
    'components/StudioView.tsx',
    'components/OfficeTools.tsx',
    'components/MediaSuiteView.tsx',
    'components/FinanceView.tsx'
]

for filepath in files_to_patch:
    if not os.path.exists(filepath):
        print(f"Skipping {filepath}, does not exist")
        continue

    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Add import
    if "import ToolOrderSettingsModal" not in content:
        # Find the last import
        import_end = content.rfind('import')
        import_line_end = content.find('\n', import_end)
        content = content[:import_line_end] + "\nimport ToolOrderSettingsModal from './ToolOrderSettingsModal';" + content[import_line_end:]

    # 2. Add state inside the component
    # Find `const tools = [`
    tools_start = content.find('const tools = [')
    if tools_start == -1:
        print(f"Could not find tools array in {filepath}")
        continue
    
    # Find the end of the tools array
    # Look for `];` after `const tools = [`
    tools_end = content.find('];\n', tools_start)
    if tools_end == -1:
        tools_end = content.find('  ];\n', tools_start)
    
    if tools_end != -1:
        insert_pos = content.find('\n', tools_end) + 1
        
        comp_name = os.path.basename(filepath).split('.')[0]
        state_code = f"""
  const defaultOrder = tools.map(t => t.id);
  const [toolOrder, setToolOrder] = React.useState<string[]>(() => {{
    try {{
      const saved = localStorage.getItem('toolOrder_{comp_name}');
      if (saved) {{
         const parsed = JSON.parse(saved);
         if (parsed.length === defaultOrder.length) return parsed;
      }}
    }} catch {{}}
    return defaultOrder;
  }});

  const [isToolSettingsOpen, setIsToolSettingsOpen] = React.useState(false);

  const orderedTools = [...tools].sort((a, b) => {{
    let indexA = toolOrder.indexOf(a.id);
    let indexB = toolOrder.indexOf(b.id);
    if (indexA === -1) indexA = 999;
    if (indexB === -1) indexB = 999;
    return indexA - indexB;
  }});

  const handleSaveOrder = (newOrder: string[]) => {{
    setToolOrder(newOrder);
    localStorage.setItem('toolOrder_{comp_name}', JSON.stringify(newOrder));
  }};
"""
        if "setToolOrder" not in content:
            content = content[:insert_pos] + state_code + content[insert_pos:]
    else:
        print(f"Could not find end of tools array in {filepath}")

    # 3. Replace `tools.map` with `orderedTools.map`
    content = content.replace('{tools.map((tool, index)', '{orderedTools.map((tool, index)')
    # If the map is just `tools.map((tool) => ...)`
    content = content.replace('{tools.map((tool)', '{orderedTools.map((tool)')

    # 4. Inject settings button
    btn_code = """
          <button
             onClick={() => setIsToolSettingsOpen(true)}
             className={`w-10 h-10 rounded-full border-2 transition-all duration-300 flex items-center justify-center hover:scale-110 active:scale-95 cursor-pointer ${st.btnInactive}`}
             title="Tool Settings"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
"""
    if 'setIsToolSettingsOpen' in btn_code and btn_code not in content:
        content = content.replace('{/* Theme cycle button */}', btn_code + '\n          {/* Theme cycle button */}')

    # 5. Inject the modal itself right before the final closing div tag
    # The return usually ends with `</div>\n  );\n};` or similar
    modal_code = """
      <ToolOrderSettingsModal
        isOpen={isToolSettingsOpen}
        onClose={() => setIsToolSettingsOpen(false)}
        tools={tools}
        toolOrder={toolOrder}
        onSave={handleSaveOrder}
      />
    """
    
    if "ToolOrderSettingsModal" in content and "<ToolOrderSettingsModal" not in content:
        last_div = content.rfind('</div>')
        if last_div != -1:
            content = content[:last_div] + modal_code + content[last_div:]

    with open(filepath, 'w') as f:
        f.write(content)
        print(f"Patched {filepath}")

