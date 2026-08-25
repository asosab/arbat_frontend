/** Buddy User — vista de perfil propio. Capa de presentación; no contiene API. */
window.BuddyUserViews = window.BuddyUserViews || {};
(function (window, document) {
  'use strict';
  function ensureStyles() {
    if (document.getElementById('buddy-user-view-styles')) return;
    var style=document.createElement('style'); style.id='buddy-user-view-styles'; style.textContent='.buddy-user-view{font:inherit;display:grid;gap:14px;max-width:560px}.buddy-user-view label{display:grid;gap:6px}.buddy-user-view input,.buddy-user-view select,.buddy-user-view button{font:inherit;padding:9px;border:1px solid #ccc;border-radius:8px}.buddy-user-view button{cursor:pointer}.buddy-user-view .buddy-user-photo{display:flex;gap:12px;align-items:center}.buddy-user-view .buddy-user-status{min-height:1.3em}'; document.head.appendChild(style);
  }
  window.BuddyUserViews.profile = function (context) {
    ensureStyles();
    var target = context.target, user = context.user || {}, api = context.api, config = context.config || {};
    target.innerHTML = '';
    var form = document.createElement('form'); form.className = 'buddy-user-view';
    var title = document.createElement('h2'); title.textContent = 'Mi perfil'; form.appendChild(title);
    var avatar = api.avatar(user, 'buddy-user-avatar');
    var photo = document.createElement('div'); photo.className = 'buddy-user-photo'; photo.appendChild(avatar);
    var inputPhoto = document.createElement('input'); inputPhoto.type = 'file'; inputPhoto.accept = 'image/*';
    inputPhoto.addEventListener('change', function () { if (inputPhoto.files[0]) api.uploadPhoto(inputPhoto.files[0]).then(function(){ return api.getCurrent(); }).then(function(){ return api.render({target:target,view:'profile'}); }); });
    photo.appendChild(inputPhoto); form.appendChild(photo);
    var fields = [['firstName','Nombre'],['lastName','Apellido'],['name','Nombre para mostrar'],['email','Correo electrónico'],['phone','Número celular que usa en WhatsApp']];
    fields.forEach(function (item) { var label=document.createElement('label'); label.textContent=item[1]; var input=document.createElement('input'); input.name=item[0]; input.value=user[item[0]] || ''; if(item[0]==='email') input.type='email'; label.appendChild(input); form.appendChild(label); });
    if (!config.fields || config.fields.locale !== false) { var label=document.createElement('label'); label.textContent='Idioma'; var select=document.createElement('select'); select.name='locale'; (config.locales||[]).forEach(function(item){var o=document.createElement('option');o.value=item.value;o.textContent=item.label;o.selected=item.value===user.locale;select.appendChild(o);}); label.appendChild(select); form.appendChild(label); }
    var status=document.createElement('div'); status.className='buddy-user-status'; var save=document.createElement('button'); save.type='submit'; save.textContent='Guardar cambios'; form.appendChild(status); form.appendChild(save);
    form.addEventListener('submit',function(e){e.preventDefault();save.disabled=true;status.textContent='Guardando…';var data={};Array.prototype.forEach.call(form.elements,function(el){if(el.name)data[el.name]=el.value;});api.updateProfile(data).then(function(){status.textContent='Cambios guardados.';}).catch(function(err){status.textContent=err.message;}).finally(function(){save.disabled=false;});});
    target.appendChild(form); return form;
  };
})(window, document);
