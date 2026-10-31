import os

files_to_patch = [
    'components/StudioView.tsx',
    'components/OfficeTools.tsx',
    'components/MediaSuiteView.tsx',
    'components/FinanceView.tsx'
]

for filepath in files_to_patch:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Remove import
    content = content.replace("\nimport ToolOrderSettingsModal from './ToolOrderSettingsModal';", "")

    # 2. Revert map
    content = content.replace("{orderedTools.map((tool, index)", "{tools.map((tool, index)")
    content = content.replace("{orderedTools.map((tool)", "{tools.map((tool)")

    # 3. Remove ToolOrderSettingsModal tag
    modal_start = content.find("<ToolOrderSettingsModal")
    if modal_start != -1:
        modal_end = content.find("/>", modal_start) + 2
        content = content[:modal_start] + content[modal_end:]

    # 4. Remove button
    btn_start = content.find('title="Tool Settings"')
    if btn_start != -1:
        btn_full_start = content.rfind("<button", 0, btn_start)
        btn_full_end = content.find("</button>", btn_start) + 9
        content = content[:btn_full_start] + content[btn_full_end:]

    # 5. Remove state block
    state_start = content.find("const defaultOrder = tools.map")
    if state_start != -1:
        state_end = content.find("};\n", state_start) + 3
        content = content[:state_start] + content[state_end:]

    with open(filepath, 'w') as f:
        f.write(content)
        print(f"Unpatched {filepath}")
