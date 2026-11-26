"""Inspect the real Windows bundle and exercise its extracted protocol source.

Linux CI does not execute Windows binaries. Actual native startup without a
local Python/project is checked separately on Windows, alongside the real run.
"""
from pathlib import Path, PurePosixPath
import argparse, io, json, os, re, stat, struct, subprocess, sys, tempfile, zipfile

ROOT=Path(__file__).resolve().parents[1]
PAGE=ROOT/'dist/end-to-end'


def pe(data,name,machine=None):
    assert data[:2]==b'MZ' and len(data)>64,name
    at=struct.unpack_from('<I',data,0x3c)[0]
    assert at+6<=len(data) and data[at:at+4]==b'PE\0\0',name
    if machine is not None:assert struct.unpack_from('<H',data,at+4)[0]==machine,name


def safe_members(z):
    seen=set()
    for row in z.infolist():
        p=PurePosixPath(row.filename);name=p.as_posix().rstrip('/').casefold()
        assert not p.is_absolute() and '..' not in p.parts,row.filename
        assert '\\' not in row.filename and ':' not in row.filename,row.filename
        assert (row.external_attr>>16)&0o170000 in (0,stat.S_IFREG,stat.S_IFDIR),row.filename
        assert name not in seen,row.filename
        seen.add(name)


def verify_bundle(path,release=None):
    with tempfile.TemporaryDirectory(prefix='qe-standalone-release-') as temp:
        folder=Path(temp).resolve()
        with zipfile.ZipFile(path)as z:
            assert z.testzip()is None
            safe_members(z);names=z.namelist();base='QE-Certificate/'
            assert all(n.startswith(base)for n in names)
            assert not any('/__pycache__/'in n or n.endswith(('.pyc','.pyo'))for n in names)
            files=[r for r in z.infolist()if not r.is_dir()];expanded=sum(r.file_size for r in files)
            if release is not None:
                assert len(files)==release['files']
                assert expanded==release['expanded_bytes']
            b=json.loads(z.read(base+'BUNDLE.json'))
            assert b['schema']=='qe-certificate-client-bundle.v1' and str(b['version'])=='18'
            assert b['platform']=='windows-x86_64'
            assert b['requires_local_paper'] is False and b['requires_installed_python'] is False
            assert b['scientific_execution']=='remote-source-bound-service'
            assert set(b['supported_modes'])>={'si-reference','custom-qe'}
            assert b['custom_input_import'] is True
            assert b['upf_binding_confirmation'] is True and b['upf_nested_folder_search'] is True
            assert b['terminal_stage_status'] is True
            assert b['offline_band_visualization'] and b['historical_result_visualization']
            assert b['visualization_replays_math'] is False
            assert b['entry']=='一键运行.exe' and b['english_entry']=='Run.exe'
            if release is not None:assert release['entry']==base+b['entry']
            exe=z.read(base+'Run.exe');assert exe==z.read(base+b['entry']);pe(exe,'Run.exe')
            # The small launcher may be x86; the interpreter and libraries are x64.
            for name in ('python.exe','pythonw.exe','python313.dll'):pe(z.read(base+'runtime/'+name),name,0x8664)
            batch=z.read(base+'Run.cmd');assert batch==z.read(base+'一键运行.cmd')
            assert batch.isascii() and b'\r\n'in batch and b'\n'not in batch.replace(b'\r\n',b'')
            assert b'Run.exe'in batch and b'python'not in batch.lower()
            required=('runtime/python313._pth','runtime/Lib/tkinter/__init__.py','runtime/DLLs/_tkinter.pyd',
                'runtime/tcl86t.dll','runtime/tk86t.dll','runtime/tcl/tcl8.6/init.tcl','runtime/tcl/tk8.6/tk.tcl',
                'runtime/Lib/site-packages/paramiko/__init__.py','runtime/Lib/site-packages/cryptography/__init__.py',
                'runtime/Lib/site-packages/bcrypt/__init__.py','runtime/Lib/site-packages/nacl/__init__.py',
                'runtime/LICENSE_PYTHON.txt','LICENSE','THIRD_PARTY_SOURCES.txt','build-sources/conda-recipes.zip',
                'app/main.py','app/remote_service.py','app/launcher.c','app/build_app.py','app/test_client.py','app/portable_controls.py',
                'app/material_gui.py','app/input_import.py','app/qe_input.py','app/test_import.py','app/test_gui_import.py',
                'app/demo/Si能带示例.html','app/band_report.py','app/test_band_report.py','app/viewer/viewer.js','app/viewer/style.css','app/viewer/template.html')
            assert all(base+n in names for n in required)
            assert not any(n.lower().endswith('.upf')for n in names),'Pseudopotentials need their own redistribution authorization.'
            assert z.read(base+'runtime/python313._pth').decode('ascii').splitlines()==['Lib','DLLs','Lib/site-packages','../app']
            assert base+'runtime/Lib/site-packages/sitecustomize.py'not in names
            for dep in b['dependencies']:
                meta=base+dep['metadata']+'/'
                assert meta+'METADATA'in names
                assert any(n.startswith(meta)and 'license'in n.lower()for n in names)
                assert dep['source'].startswith('https://pypi.org/project/')
            assert {d['name']for d in b['dependencies']} >= {'paramiko','cryptography','bcrypt','pynacl','cffi'}
            for package in b['runtime_licenses']:assert any(n.startswith(base+'licenses/'+package+'/')for n in names),package
            with zipfile.ZipFile(io.BytesIO(z.read(base+'build-sources/conda-recipes.zip')))as recipes:
                assert recipes.testzip()is None;safe_members(recipes)
                assert any(n.endswith('meta.yaml')for n in recipes.namelist())
            text='\n'.join(z.read(base+n).decode('utf-8-sig')for n in ('app/main.py','app/remote_service.py','app/material_gui.py','app/input_import.py','README.txt','BUNDLE.json'))
            assert not re.search(r'\b10\.(?:\d{1,3}\.){2}\d{1,3}\b|\b192\.168\.\d{1,3}\.\d{1,3}\b|C:[/\\]Users[/\\]|ljcj007|/home/ljcj',text)
            assert not re.search(r'discover_workspace|find_workspace|select_workspace|register_native|oneclick_launcher_20261123',text)
            z.extractall(folder)
        shipped=folder/'QE-Certificate'
        # -I excludes external site packages and script paths. Add only the
        # extracted client source for these dependency-free protocol controls.
        code='import runpy,sys;p=sys.argv[2];sys.path.insert(0,sys.argv[1]);sys.argv=[p];runpy.run_path(p,run_name="__main__")'
        controls={}
        for name,minimum in [('test_client.py',10),('test_import.py',12),('test_band_report.py',12)]:
            result=subprocess.run([sys.executable,'-I','-B','-c',code,str(shipped/'app'),str(shipped/'app'/name)],
                cwd=folder,capture_output=True,text=True,encoding='utf8',timeout=90,
                env=dict(os.environ,PYTHONUTF8='1',PYTHONDONTWRITEBYTECODE='1'))
            assert result.returncode==0,result.stdout+'\n'+result.stderr
            ran=re.search(r'Ran (\d+) tests',result.stdout+result.stderr);assert ran and int(ran[1])>=minimum
            controls[name]=int(ran[1])
    return dict(archive_members=len(files),expanded_bytes=expanded,extracted_protocol_controls=controls['test_client.py'],extracted_import_controls=controls['test_import.py'],extracted_band_report_controls=controls['test_band_report.py'],
        bundled_interpreter_x64=True,native_executable_aliases_equal=True,licenses_and_sources_included=True)


def main():
    ap=argparse.ArgumentParser();ap.add_argument('--archive',type=Path)
    ap.add_argument('--bundle-only',action='store_true',help='Inspect a build candidate before the actual-run release is ready.')
    args=ap.parse_args();release=json.loads((PAGE/'data/oneclick-release.json').read_text(encoding='utf8'))
    archive=args.archive or PAGE/'downloads'/release['filename']
    if not args.bundle_only:
        assert release['status']=='ready' and release['version']==18
        assert archive.stat().st_size==release['bytes']
        for key in ('existing_complete_research_workspace_required','python_installation_required','manual_registration_required',
                    'manual_configuration_required','password_saved','full_chain_recomputed'):assert release[key] is False,key
        for key in ('runtime_included','server_research_service_required','server_research_service_tested','builtin_si_full_chain_certified','custom_input_import','custom_finite_point_spectrum_tested'):assert release[key] is True,key
        assert release['custom_infinite_scf_certified']is False
        assert set(release['supported_modes'])>={'si-reference','custom-qe'}
        assert release['actually_tested_custom_run']
        assert release['terminal_stage_status'] and release['remaining_obligations_visible']
        assert release['paw_completed_task_resume_tested'] and release['preserves_existing_PAW_model']
        html=(PAGE/'index.html').read_text(encoding='utf8')
        card=html[html.index('<article class="native-launch">'):html.index('<article class="actual-run"')]
        assert release['filename']in card and '一键运行.exe'in card
        assert '无需安装 Python'in card and '无需本机 paper'in card and '已部署完整科研服务'in card
        assert not re.search(r'SHA.?256|哈希|指纹|server_profile|register_native|setupRegister|downloadConfig|选择 paper',card,re.I)
        for name in ('infinite-scf-result.json','one-click-run-result.json'):
            text=(PAGE/'data'/name).read_text(encoding='utf8')
            assert not re.search(r'sha.?256|digest|fingerprint|[0-9a-f]{64}',text,re.I)
            assert json.loads(text)['full_chain_certified'] is True
        assert 'example-certificate.html'in html and 'data-i18n="resumeTip"'in html
        assert 'qe-certificate-server-source-v16.zip'in html
        assert 'qe-certificate-standalone-v15.zip'in html
        assert 'qe-certificate-standalone-v16.zip'in html
        assert 'data-i18n="upfMatchTip"'in html and 'PBEsol'in html
        guide=(PAGE/'downloads/local-run-guide.md').read_text(encoding='utf8')
        assert '输入要求 → 所选文件'in guide and 'input_dft'in guide and 'PBEsol'in guide
        assert 'PAW/USPP'in guide and 'NC 证书不适用'in guide and '不表示任务仍在等待'in guide
        assert 'id="custom-materials"'in html and 'data-custom="levels"'in html
        assert 'example-carbon-scf.in'in html and 'example-custom-material-certificate.html'in html
        assert 'example-hydrogen-scf.in'in html and 'example-hydrogen-certificate.html'in html
        assert 'data-i18n="customCompareScope"'in html
        custom_text=(PAGE/'data/custom-material-run.json').read_text(encoding='utf8')
        assert not re.search(r'sha.?256|digest|fingerprint|[0-9a-f]{64}|/home/|C:[/\\]Users',custom_text,re.I)
        custom=json.loads(custom_text)
        assert custom['schema']=='custom-qe-public-result.v1' and custom['status']=='COMPLETED'
        assert custom['id']==release['published_custom_run']
        assert release['published_example_client_version']==16
        for key in ('calculation_completed','numerical_scf_completed','native_operator_received','finite_point_spectrum_certified','finite_proof_recomputed'):assert custom[key] is True,key
        assert custom['infinite_scf_certified']is False and custom['full_chain_certified']is False
        assert 0<custom['points_certified']<=custom['points_requested']
        hydrogen_text=(PAGE/'data/custom-material-hydrogen-run.json').read_text(encoding='utf8')
        assert not re.search(r'sha.?256|digest|fingerprint|[0-9a-f]{64}|/home/|C:[/\\]Users',hydrogen_text,re.I)
        hydrogen=json.loads(hydrogen_text)
        assert hydrogen['schema']=='custom-qe-public-result.v1'and hydrogen['status']=='COMPLETED'
        assert hydrogen['id']!=custom['id']and hydrogen['points_certified']==hydrogen['points_requested']==1
        for key in ('calculation_completed','numerical_scf_completed','native_operator_received','finite_point_spectrum_certified','finite_proof_recomputed'):assert hydrogen[key]is True,key
        assert hydrogen['infinite_scf_certified']is False and hydrogen['full_chain_certified']is False
        assert custom['points_certified']==custom['points_requested']==8
        assert custom['plane_wave_dimensions']==[902,941]and hydrogen['plane_wave_dimensions']==[2109,2109]
        input_h=(PAGE/'downloads/example-hydrogen-scf.in').read_text(encoding='utf8')
        assert 'H.pz-vbc.UPF'in input_h and 'K_POINTS gamma'in input_h
        assert not re.search(r'/home/|C:[/\\]Users|10\.20\.',input_h)
        custom_view=subprocess.run(['node',str(ROOT/'scripts/test-custom-material-view.mjs')],cwd=ROOT,capture_output=True,text=True,encoding='utf8',timeout=30)
        assert custom_view.returncode==0,custom_view.stdout+'\n'+custom_view.stderr
        view=subprocess.run(['node',str(ROOT/'scripts/test-actual-run-view.mjs')],cwd=ROOT,
            capture_output=True,text=True,encoding='utf8',timeout=30)
        assert view.returncode==0,view.stdout+'\n'+view.stderr
    check=verify_bundle(archive,None if args.bundle_only else release)
    print(json.dumps(dict(status='PASS_STANDALONE_BUILD_CANDIDATE'if args.bundle_only else'PASS_ACTUAL_STANDALONE_DOWNLOAD',
        installed_python_required=False,local_paper_required=False,user_reports_without_file_identifiers=True,**check)))


if __name__=='__main__':main()
