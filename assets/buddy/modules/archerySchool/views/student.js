/** ArcherySchool — vista estudiante: perfil, atributos e inventario propio. */
window.BuddyArcherySchoolViews = window.BuddyArcherySchoolViews || {};
(function (window, document) {
  'use strict';
  function ensureStyles() {
    if (document.getElementById('buddy-archery-school-student-view-styles')) return;
    var style=document.createElement('style'); style.id='buddy-archery-school-student-view-styles'; style.textContent='.buddy-archery-school-view{font:inherit;display:grid;gap:18px;max-width:760px}.buddy-archery-school-view form{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.buddy-archery-school-view label{display:grid;gap:6px}.buddy-archery-school-view input,.buddy-archery-school-view select,.buddy-archery-school-view button{font:inherit;padding:8px;border:1px solid #ccc;border-radius:8px}.buddy-archery-school-view button{cursor:pointer}.buddy-archery-school-view section{border:1px solid #ddd;border-radius:12px;padding:16px}.buddy-archery-school-view article{padding:8px 0;border-bottom:1px solid #eee}'; document.head.appendChild(style);
  }
  window.BuddyArcherySchoolViews.student = function (context) {
    ensureStyles();
    var target=context.target,api=context.api,state=context.state||{},config=context.config||{}; target.innerHTML='';
    var root=document.createElement('div');root.className='buddy-archery-school-view';
    var title=document.createElement('h2');title.textContent='Mi perfil de arquería';root.appendChild(title);
    var form=document.createElement('form');
    function add(labelText,name,value,type){var l=document.createElement('label');l.textContent=labelText;var i=document.createElement('input');i.name=name;i.type=type||'text';i.value=value==null?'':value;l.appendChild(i);form.appendChild(l);}
    add('Fecha de nacimiento','fechaNacimiento',state.profile&&state.profile.fechaNacimiento,'date');
    var current={};(state.attributes||[]).forEach(function(a){if(a&&!a.vigenteHasta)current[a.tipo]=a;});
    add('Altura (cm)','altura',current.altura&&current.altura.valorCm,'number'); add('Peso (kg)','peso',current.peso&&current.peso.valorKg,'number'); add('Apertura de brazos (cm)','aperturaBrazos',current.aperturaBrazos&&current.aperturaBrazos.valorCm,'number'); add('Apertura de arco (cm)','aperturaArco',current.aperturaArco&&current.aperturaArco.valorCm,'number'); add('Libraje actual (lbs)','librajeActual',current.librajeActual&&current.librajeActual.valorLbs,'number');
    var lat=document.createElement('label');lat.textContent='Lateralidad';var ls=document.createElement('select');ls.name='lateralidad';(config.lateralidad||[]).forEach(function(o){var x=document.createElement('option');x.value=o.value;x.textContent=o.label;x.selected=o.value===(current.lateralidad&&current.lateralidad.valor);ls.appendChild(x);});lat.appendChild(ls);form.appendChild(lat);
    var status=document.createElement('div'),save=document.createElement('button');save.type='submit';save.textContent='Guardar perfil';form.appendChild(status);form.appendChild(save);
    form.addEventListener('submit',function(e){e.preventDefault();save.disabled=true;var data={fechaNacimiento:form.elements.fechaNacimiento.value||null};api.updateProfile(data).then(function(){var personId=state.profile&&(state.profile._id||state.profile.id);if(!personId)return;var jobs=[];[['altura','valorCm'],['peso','valorKg'],['aperturaBrazos','valorCm'],['aperturaArco','valorCm'],['librajeActual','valorLbs'],['lateralidad','valor']].forEach(function(pair){var v=form.elements[pair[0]].value;if(v==='')return;var d={personaId:personId,tipo:pair[0],sitio:api.config.siteId||window.BuddyConfig.app.siteId,fuente:'autorreportado'};d[pair[1]]=pair[1]==='valor'?v:Number(v);jobs.push(api.setAttribute(d));});return Promise.all(jobs);}).then(function(){status.textContent='Cambios guardados.';}).catch(function(err){status.textContent=err.message;}).finally(function(){save.disabled=false;});});
    root.appendChild(form);
    var equipment=document.createElement('section');var eh=document.createElement('h3');eh.textContent='Mis equipos';equipment.appendChild(eh);var list=document.createElement('div');(state.equipment||[]).forEach(function(item){var card=document.createElement('article');card.textContent=[item.tipo,item.marca,item.modelo,item.estado].filter(Boolean).join(' · ');list.appendChild(card);});if(!state.equipment||!state.equipment.length)list.textContent='No hay equipos registrados.';equipment.appendChild(list);root.appendChild(equipment);target.appendChild(root);return root;
  };
})(window, document);
