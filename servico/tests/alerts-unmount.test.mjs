import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('alertas liberam consulta e áudio mesmo depois de desmontar a UI',()=>{
 const window={addEventListener(){}};
 vm.runInNewContext(readFileSync(new URL('../web/alerts.js',import.meta.url),'utf8'),{window,document:{getElementById:()=>null},AbortController,setTimeout,clearTimeout});
 const alerts=window.InvictusAlerts;const controller=new AbortController();alerts.controller=controller;alerts.sound=true;
 assert.doesNotThrow(()=>alerts.stop());assert.equal(controller.signal.aborted,true);assert.equal(alerts.controller,null);assert.equal(alerts.sound,false);
});