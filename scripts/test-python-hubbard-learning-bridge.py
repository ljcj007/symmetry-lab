"""Compare the shipped finite teaching bridge directly with production Python."""
from pathlib import Path
import json
import os
import shutil
import subprocess
import sys
import unittest
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))
import hubbard_lab as hub
import browser_api

NODE=shutil.which('node') or str(Path('C:/Users/ljcj007/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'))
CODE=r'''
import {hubbardFermionAction as action,hubbardActionMatrix as matrix,hubbardSpectralReference as reference,hubbardBridgeLabRequest as request} from './dist/hubbard-learning-bridge.js';
const actions=[],matrices=[],spectra=[];
for(let state=0;state<16;state++)for(let mode=0;mode<4;mode++)for(const create of [false,true])actions.push(action({state,mode,create}));
for(let mode=0;mode<4;mode++)for(const create of [false,true])matrices.push(matrix({mode,create}));
for(const phi of [-Math.PI,-.37,0,Math.PI/4,Math.PI/2,Math.PI])spectra.push({reference:reference({probe:'phase',phi}),request:request({probe:'phase',phi})});
spectra.push({reference:reference(),request:request()});
console.log(JSON.stringify({actions,matrices,spectra}));
'''

class HubbardBridgeProductionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        result=subprocess.run([NODE,'--input-type=module','-e',CODE],cwd=ROOT,check=True,capture_output=True,text=True,encoding='utf-8')
        cls.reference=json.loads(result.stdout)

    def test_all_actions_and_matrices_match_production(self):
        for row in self.reference['actions']:
            expected=hub.fermion_action(row['state'],((row['mode'],row['create']),))
            self.assertEqual(None if row['target'] is None else (row['target'],row['sign']),expected)
        for row in self.reference['matrices']:
            self.assertEqual(row['sourceBasis'],list(hub.fock_basis(2,1,1)))
            self.assertEqual(row['targetBasis'],list(hub.fock_basis(2,*row['targetSector'])))

    def test_reference_state_and_spectra_match_public_api(self):
        for row in self.reference['spectra']:
            ref=row['reference'];request=row['request'];result=browser_api.run(request['action'],request['input'])
            self.assertTrue(result['checks']['passed'])
            self.assertEqual(result['initial']['degeneracy'],1)
            self.assertAlmostEqual(result['initial']['energy'],-2,places=12)
            for kind,sign in [('removal',-1),('addition',1)]:
                rows=[r for r in result['transitions'] if r['kind']==kind]
                self.assertAlmostEqual(sum(r['weight'] for r in rows),ref[kind]['totalWeight'],places=12)
                for line in rows:self.assertAlmostEqual(line['energy'],sign,places=12)
                self.assertAlmostEqual(ref[kind]['antibonding']['weight'],0,places=13)
            self.assertAlmostEqual(result['sumRules']['removalWeight']+result['sumRules']['additionWeight'],ref['totalWeight'],places=12)
        p=hub.parameters({'hopping':1,'interactionU':0,'alternatingPotential':0})
        h,_=hub.hamiltonian(p);psi=np.ones(4)/2
        np.testing.assert_allclose(h@psi,-2*psi,atol=1e-14)

if __name__=='__main__':unittest.main()
