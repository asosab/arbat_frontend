/** ArcherySchool — vista administrativa de estudiante y equipamiento. */
window.BuddyArcherySchoolViews = window.BuddyArcherySchoolViews || {};
(function (window, document) {
  'use strict';
  function ensureStyles() {
    if (document.getElementById('buddy-archery-school-admin-view-styles')) return;
    var style=document.createElement('style'); style.id='buddy-archery-school-admin-view-styles'; style.textContent='.buddy-archery-school-view--admin{font:inherit;display:grid;gap:18px;max-width:900px}.buddy-archery-school-view--admin form{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}.buddy-archery-school-view--admin label{display:grid;gap:6px}.buddy-archery-school-view--admin input,.buddy-archery-school-view--admin select,.buddy-archery-school-view--admin button{font:inherit;padding:8px;border:1px solid #ccc;border-radius:8px}.buddy-archery-school-view--admin button{cursor:pointer}.buddy-archery-school-view--admin section{border:1px solid #ddd;border-radius:12px;padding:16px}.buddy-archery-school-view--admin article{padding:10px 0;border-bottom:1px solid #eee}.buddy-archery-school-view--admin .form-actions{grid-column:1/-1;display:flex;gap:8px;align-items:center}.buddy-archery-school-view--admin .form-status{grid-column:1/-1;min-height:1.3em}.buddy-archery-school-view--admin .equipment-list{display:grid;gap:4px}'; document.head.appendChild(style);
  }
  window.BuddyArcherySchoolViews.admin = function (context) {
    ensureStyles();
    var target=context.target,api=context.api,state=context.state||{},config=context.config||{},ctx=context.context||{}; target.innerHTML='';
    var root=document.createElement('div');root.className='buddy-archery-school-view buddy-archery-school-view--admin';
    var h=document.createElement('h2');h.textContent='Ficha de estudiante';root.appendChild(h);
    if(ctx.personaId){var p=document.createElement('p');p.textContent='Estudiante: '+ctx.personaId;root.appendChild(p);}
    var profile=document.createElement('section');profile.innerHTML='<h3>Datos de arquería</h3>';
    var form=document.createElement('form');[['fechaNacimiento','Fecha de nacimiento','date'],['activo','Perfil activo','checkbox']].forEach(function(item){var l=document.createElement('label');l.textContent=item[1];var i=document.createElement('input');i.name=item[0];i.type=item[2];if(item[2]==='checkbox')i.checked=state.profile&&state.profile.activo!==false;else i.value=state.profile&&state.profile[item[0]]||'';l.appendChild(i);form.appendChild(l);});
    var save=document.createElement('button');save.type='submit';save.textContent='Guardar';form.appendChild(save);form.addEventListener('submit',function(e){e.preventDefault();save.disabled=true;api.updateProfile({fechaNacimiento:form.elements.fechaNacimiento.value||null,activo:form.elements.activo.checked}).finally(function(){save.disabled=false;});});profile.appendChild(form);root.appendChild(profile);

    var eq=document.createElement('section');eq.innerHTML='<h3>Equipamiento del estudiante</h3><p>Registra y actualiza los equipos asociados al estudiante.</p>';
    var eqForm=document.createElement('form');
    function addInput(labelText,name,placeholder){var l=document.createElement('label');l.textContent=labelText;var i=document.createElement('input');i.name=name;i.type='text';i.placeholder=placeholder||'';l.appendChild(i);eqForm.appendChild(l);}
    function addSelect(labelText,name,options,placeholder){var l=document.createElement('label');l.textContent=labelText;var s=document.createElement('select');s.name=name;var p=document.createElement('option');p.value='';p.textContent=placeholder;s.appendChild(p);(options||[]).forEach(function(v){var o=document.createElement('option');o.value=typeof v==='object'?v.value:v;o.textContent=typeof v==='object'?v.label:v;s.appendChild(o);});l.appendChild(s);eqForm.appendChild(l);}
    addInput('Persona / estudiante','personaId',ctx.personaId||'ID del estudiante');
    addSelect('Tipo de equipo','tipo',config.equipmentTypes||[],'Selecciona un tipo');
    addInput('Marca','marca','Ej. WNS'); addInput('Modelo','modelo','Ej. Explore'); addInput('Número de serie','numeroSerie','Opcional');
    addSelect('Estado','estado',config.equipmentStates||[],'Selecciona un estado'); addSelect('Posibilidad de adquisición','posibilidadAdquisicion',config.posibilidadAdquisicion||[],'Opcional');
    var eqStatus=document.createElement('div');eqStatus.className='form-status';var eqActions=document.createElement('div');eqActions.className='form-actions';var eqSave=document.createElement('button');eqSave.type='submit';eqSave.textContent='Registrar equipo';eqActions.appendChild(eqSave);eqForm.appendChild(eqStatus);eqForm.appendChild(eqActions);eq.appendChild(eqForm);
    var list=document.createElement('div');list.className='equipment-list';
    function renderEquipment(){list.innerHTML='';var items=state.equipment||[];if(!items.length){list.textContent='No hay equipos registrados.';return;}items.forEach(function(item){var card=document.createElement('article');card.textContent=[item.tipo,item.marca,item.modelo,item.numeroSerie,item.estado,item.posibilidadAdquisicion].filter(Boolean).join(' · ');list.appendChild(card);});}
    eqForm.addEventListener('submit',function(e){e.preventDefault();var data={personaId:eqForm.elements.personaId.value.trim()||ctx.personaId||null,tipo:eqForm.elements.tipo.value,marca:eqForm.elements.marca.value.trim(),modelo:eqForm.elements.modelo.value.trim(),numeroSerie:eqForm.elements.numeroSerie.value.trim()||null,estado:eqForm.elements.estado.value,posibilidadAdquisicion:eqForm.elements.posibilidadAdquisicion.value||null};if(!data.personaId||!data.tipo||!data.estado){eqStatus.textContent='Indica el estudiante, tipo y estado del equipo.';return;}eqSave.disabled=true;api.createEquipment(data).then(function(){eqStatus.textContent='Equipo registrado.';eqForm.reset();if(ctx.personaId)eqForm.elements.personaId.value=ctx.personaId;renderEquipment();}).catch(function(err){eqStatus.textContent=err.message;}).finally(function(){eqSave.disabled=false;});});
    eq.appendChild(list);root.appendChild(eq);renderEquipment();target.appendChild(root);return root;
  };
})(window, document);
