"""Extract display messages only; the English site shares the original cores."""
import ast,json,re,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
han=re.compile('[\u3400-\u9fff]');rows={};templates=[]
def message_parts(node):
    if isinstance(node,ast.Constant) and isinstance(node.value,str):return [node.value]
    if isinstance(node,ast.JoinedStr):
        return [part.value if isinstance(part,ast.Constant) and isinstance(part.value,str) else None for part in node.values]
    if isinstance(node,ast.BinOp) and isinstance(node.op,ast.Add):
        return message_parts(node.left)+message_parts(node.right)
    return [None]
def template_text(parts):
    index=0;out=[]
    for part in parts:
        if part is None:out.append('ZXQD'+str(index)+'DQXZ');index+=1
        else:out.append(part)
    return ''.join(out),index
for p in (ROOT/'dist/python').glob('*.py'):
    tree=ast.parse(p.read_text(encoding='utf8'))
    for node in ast.walk(tree):
        if isinstance(node,ast.Constant) and isinstance(node.value,str) and han.search(node.value):
            row=rows.setdefault(node.value,dict(source=node.value,origins=[]))
            if len(row['origins'])<5:row['origins'].append('python/'+p.name)
        if isinstance(node,ast.JoinedStr) or isinstance(node,ast.BinOp) and isinstance(node.op,ast.Add):
            text,count=template_text(message_parts(node))
            if count and han.search(text):
                row=rows.setdefault(text,dict(source=text,origins=[]))
                if len(row['origins'])<5:row['origins'].append('python-template/'+p.name)
                templates.append(text)
# Actual preset outputs include concatenated and conditionally assembled
# sentences that do not occur as complete AST literals. The Node extractor
# uses the exact runtime display allowlist and never visits inputs/user files.
fixture_rows=json.loads(subprocess.run(['node',str(ROOT/'scripts/collect-fixture-messages.mjs')],cwd=ROOT,check=True,capture_output=True,text=True,encoding='utf8').stdout)
fixture_added=0
for item in fixture_rows:
    if item['source'] not in rows:fixture_added+=1
    row=rows.setdefault(item['source'],dict(source=item['source'],origins=[]))
    for origin in item['origins']:
        if origin not in row['origins'] and len(row['origins'])<5:row['origins'].append(origin)
(ROOT/'locales/en-python-sources.json').write_text(json.dumps(list(rows.values()),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
(ROOT/'locales/en-python-templates.json').write_text(json.dumps(sorted(set(templates)),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Python message units:',len(rows),'dynamic templates:',len(set(templates)),'complete fixture sentences added:',fixture_added)
