/** ArcherySchool — vista administrativa de estudiante y equipamiento. */
window.BuddyArcherySchoolViews = window.BuddyArcherySchoolViews || {};
(function (window, document) {
  'use strict';
  function ensureStyles() {
    if (document.getElementById('buddy-archery-school-admin-view-styles')) return;
    var style=document.createElement('style'); style.id='buddy-archery-school-admin-view-styles'; style.textContent='.buddy-archery-school-view--admin{font:inherit;display:grid;gap:18px;max-width:900px}.buddy-archery-school-view--admin form{display:grid;gap:12px;max-width:560px}.buddy-archery-school-view--admin label{display:grid;gap:6px}.buddy-archery-school-view--admin input,.buddy-archery-school-view--admin button{font:inherit;padding:8px;border:1px solid #ccc;border-radius:8px}.buddy-archery-school-view--admin section{border:1px solid #ddd;border-radius:12px;padding:16px}.buddy-archery-school-view--admin article{padding:8px 0;border-bottom:1px solid #eee}'; document.head.appendChild(style);
  }
  window.BuddyArcherySchoolViews.admin = function (context) {
    ensureStyles();
    var target=context.target,api=context.api,state=context.state||{},ctx=context.context||{}; target.innerHTML='';
    var root=document.createElement('div');root.className='buddy-archery-school-view buddy-archery-school-view--admin';
    var h=document.createElement('h2');h.textContent='Ficha de estudiante';root.appendChild(h);
    if(ctx.personaId){var p=document.createElement('p');p.textContent='Estudiante: '+ctx.personaId;root.appendChild(p);}
    var profile=document.createElement('div');profile.innerHTML='<h3>Datos de arquería</h3>';
    var form=document.createElement('form');[['fechaNacimiento','Fecha de nacimiento','date'],['activo','Perfil activo','checkbox']].forEach(function(item){var l=document.createElement('label');l.textContent=item[1];var i=document.createElement('input');i.name=item[0];i.type=item[2];if(item[2]==='checkbox')i.checked=state.profile&&state.profile.activo!==false;else i.value=state.profile&&state.profile[item[0]]||'';l.appendChild(i);form.appendChild(l);});
    var save=document.createElement('button');save.type='submit';save.textContent='Guardar';form.appendChild(save);form.addEventListener('submit',function(e){e.preventDefault();save.disabled=true;api.updateProfile({fechaNacimiento:form.elements.fechaNacimiento.value||null,activo:form.elements.activo.checked}).finally(function(){save.disabled=false;});});profile.appendChild(form);root.appendChild(profile);
    var eq=document.createElement('section');eq.innerHTML='<h3>Equipamiento</h3>';var list=document.createElement('div');(state.equipment||[]).forEach(function(item){var card=document.createElement('article');card.textContent=[item.tipo,item.marca,item.modelo,item.numeroSerie,item.estado].filter(Boolean).join(' · ');list.appendChild(card);});if(!state.equipment||!state.equipment.length)list.textContent='No hay equipos registrados.';eq.appendChild(list);root.appendChild(eq);target.appendChild(root);return root;
  };
})(window, document);
