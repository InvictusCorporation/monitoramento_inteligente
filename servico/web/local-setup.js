let token=new URLSearchParams(location.hash.slice(1)).get('setup')||'';
history.replaceState(null,'',location.pathname);
const form=document.querySelector('#setupForm'),status=document.querySelector('#setupStatus'),button=document.querySelector('#setupSubmit');
async function call(method,body){
  const r=await fetch('/api/local-setup',{method,cache:'no-store',headers:{'Content-Type':'application/json','X-Setup-Token':token},...(body?{body:JSON.stringify(body)}:{})});
  const data=await r.json();if(!r.ok)throw Error(data.error||'Não foi possível concluir.');return data;
}
(async()=>{try{await call('GET');status.textContent='Tudo pronto para criar seu acesso.';button.disabled=false}catch(error){status.textContent=error.message}})();
form.onsubmit=async event=>{
  event.preventDefault();button.disabled=true;status.textContent='Preparando seu ambiente…';
  try{
    const fields=Object.fromEntries(new FormData(form));
    const account=await call('POST',fields);form.reset();token='';button.hidden=true;
    status.textContent='Conta criada. Abrindo seu painel…';
    try {
      const login=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({company:account.company,email:account.email,password:fields.password})});
      if(!login.ok)throw Error();location.replace('/');
    }catch{status.textContent='Conta criada. Clique em entrar e use empresa invictus, seu e-mail e a nova senha.'}
  }
  catch(error){status.textContent=error.message;button.disabled=false}
};
