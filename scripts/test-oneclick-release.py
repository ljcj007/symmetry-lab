"""Exercise the actual user download without a research-workspace dependency."""
from pathlib import Path
import json,os,re,subprocess,sys,tempfile,zipfile

ROOT=Path(__file__).resolve().parents[1]
page=ROOT/'dist/end-to-end'
release=json.loads((page/'data/oneclick-release.json').read_text(encoding='utf8'))
archive=page/'downloads'/release['filename']
assert archive.stat().st_size==release['bytes']
assert release['manual_registration_required'] is False
assert release['manual_configuration_required'] is False
assert release['existing_complete_research_workspace_required'] is True
html=(page/'index.html').read_text(encoding='utf8')
card=html[html.index('<article class="native-launch">'):html.index('<article class="actual-run"')]
assert release['filename'] in card
assert '一键运行.cmd' in card
assert not re.search(r'SHA.?256|哈希|指纹|server_profile|register_native|setupRegister|downloadConfig',card,re.I)
for name in ('infinite-scf-result.json','one-click-run-result.json'):
    text=(page/'data'/name).read_text(encoding='utf8')
    assert not re.search(r'sha.?256|digest|fingerprint|[0-9a-f]{64}',text,re.I)
    assert json.loads(text)['full_chain_certified'] is True
with tempfile.TemporaryDirectory(prefix='qe-oneclick-release-') as temp:
    folder=Path(temp).resolve()
    with zipfile.ZipFile(archive)as z:
        assert z.testzip()is None
        names=z.namelist()
        assert len(names)==len(set(names))==6
        assert all((folder/n).resolve().is_relative_to(folder)for n in names)
        z.extractall(folder)
    shipped=folder/'OneClick'
    assert(shipped/'Run.cmd').read_bytes()==(shipped/'一键运行.cmd').read_bytes()
    batch=(shipped/'Run.cmd').read_bytes()
    assert batch.isascii() and b'\r\n' in batch and b'\n' not in batch.replace(b'\r\n',b'')
    texts='\n'.join(p.read_text(encoding='utf8')for p in shipped.iterdir())
    assert not re.search(r'\b10\.(?:\d{1,3}\.){2}\d{1,3}\b|C:[/\\]Users[/\\]|/home/|ljcj007',texts)
    result=subprocess.run([sys.executable,'-B','test_launcher.py'],cwd=shipped,
                          env=dict(os.environ,PYTHONUTF8='1',PYTHONDONTWRITEBYTECODE='1'),
                          capture_output=True,text=True,encoding='utf8',timeout=90)
    assert result.returncode==0,result.stdout+'\n'+result.stderr
    assert 'Ran 8 tests' in result.stderr+result.stdout
print(json.dumps(dict(status='PASS_ACTUAL_ONECLICK_DOWNLOAD',archive_members=6,
                      extracted_controller_controls=8,manual_configuration=False,
                      user_reports_without_file_identifiers=True)))
